---
description: Dịch chapters từ Antigravity Bridge inbox sang tiếng Việt, ghi từng chương ra outbox JSON theo workflow bridge, ưu tiên glossary và dùng rules lean cho Gemini Flash.
---

# /dich - Antigravity Bridge Translation Workflow

// turbo-all

## 0. ĐỌC SKILL (BẮT BUỘC — KHÔNG ĐƯỢC BỎ QUA)

> 🔴 TRƯỚC KHI LÀM BẤT CỨ GÌ, ĐỌC SKILL `chinese-vietnamese-translator`.
> Đây là source of truth DUY NHẤT cho mọi rules dịch.
> Workflow này CHỈ là orchestration (scan inbox → dịch → ghi file).
> Mọi quyết định về xưng hô, blacklist, văn phong, quality gate → nằm trong SKILL.

```text
ĐỌC: .agent/skills/chinese-vietnamese-translator/SKILL.md
```

## 1. Đọc file inbox

> WARNING: INBOX RULES (BẮT BUỘC)
> - CHỈ dịch file `inbox_*.json` đang tồn tại trong folder bridge.
> - Mỗi lần `/dich` phải scan lại folder bridge và lấy file inbox mới nhất.
> - KHÔNG dùng context hoặc inbox từ lần dịch trước. Mỗi `/dich` là một phiên độc lập.
> - Nếu folder bridge trống, không có `inbox_*.json` -> DỪNG và báo: `Không có yêu cầu dịch mới.`
> - Nếu chỉ có `out_*` cũ mà không có `inbox_*` -> DỪNG. Đó là output cũ, không phải yêu cầu mới.
>
> Flow khi dịch lỗi hoặc import fail:
> - Sếp sẽ xóa toàn bộ JSON trong bridge rồi tạo inbox mới.
> - Khi đó phải scan lại folder, đọc inbox MỚI và dịch theo yêu cầu mới.
> - CẤM dùng lại bản dịch cũ, context cũ, hoặc ghi đè file out cũ đã bị xóa.

```text
Tìm file inbox mới nhất tại:
C:\Users\Admin\AppData\Roaming\com.raiden.translator\.raiden\bridge\

Pattern:
- inbox_*.json
- ag_inbox_*.json

Parse JSON để lấy:
- jobId
- glossary
- corrections
- prompt
- chapters
```

## 2. Chuẩn bị

### 2a. Priority (từ SKILL.md)

```
1. Glossary (cao nhất)
2. Corrections
3. Rules trong SKILL.md
4. config.prompt
5. AI judgment (thấp nhất)
```

Lưu ý:
- `Corrections` vẫn là ưu tiên cao, nhưng app sẽ còn áp lại khi import.
- Không tốn effort để tự làm một vòng rewrite lớn chỉ vì corrections.

### 2b. Context Bridge

> Tất cả chapters trong cùng một inbox thuộc cùng một task. Giữ consistency theo task, nhưng không kéo văn của chương trước sang chương sau.

Bridge chỉ được giữ:
- Thuật ngữ đã chốt trong task.
- Cách dịch tên riêng, item, skill, phe phái, địa danh đã chốt trong task.
- Các quyết định nhất quán thật sự cần mang sang batch sau.

Bridge không được giữ:
- 2-3 câu cuối batch trước.
- Cách hành văn cụ thể của batch trước.
- Ẩn dụ, nhịp câu, hoặc cụm từ của chương trước.
- Suy đoán không có trong source text hiện tại.

Các lỗi convert phải tự tránh:
- CẤM câu cụt kiểu miêu tả hành động hoặc suy nghĩ nếu thiếu chủ thể và không phải dụng ý ngắt nhịp rõ ràng.
  + Ví dụ sai: `Thầm nghĩ, cúi đầu nhìn lòng bàn tay.`, `Lẩm bẩm một mình.`
  + Phải viết thành câu hoàn chỉnh, tự nhiên trong tiếng Việt.
- CẤM câu cụt kiểu cảm thán hoặc miêu tả ngắn nếu vẫn cần chủ thể để câu tự nhiên.
  + Ví dụ sai: `Vò đầu bứt tai.`, `Bản thân cũng đầy nghi hoặc.`
  + Nếu không phải dụng ý nhịp câu rõ ràng, phải viết lại thành câu hoàn chỉnh.
- CẤM mở đầu câu bằng chuỗi động tác vô chủ ngữ nếu đọc lên gượng hoặc mang mùi dịch.
  + Ví dụ sai: `Khẽ lắc đầu, ... bước vào biệt thự số 3.`, `Xoa cằm, thấy người đăng bài...`
  + Nếu chủ thể đã rõ, có thể ẩn chủ ngữ, nhưng câu phải vẫn tự nhiên.
- CẤM các cụm diễn tả tâm lý mang mùi convert/Hán văn nếu có cách nói Việt tự nhiên hơn.
  + Ví dụ sai: `trong lòng nảy sinh cảnh giác`, `tâm thái đã có sự thay đổi rõ rệt`.
  + Ưu tiên diễn đạt tự nhiên, trực tiếp, đúng nghĩa.
- CẤM dùng `mình` hoặc `của mình` trong trần thuật ngôi 3.
  + Ví dụ sai: `mình đoán đúng rồi`, `kỹ năng ... của mình`.
  + Chỉ dùng `ta` trong nội tâm trực tiếp hoặc bỏ chủ thể/sở hữu nếu ngữ cảnh đã rõ.

Quy tắc:
- Source text của chương hiện tại luôn ưu tiên hơn bridge memory.
- `Glossary > Bridge` nếu có conflict.
- Không carry term từ chương trước sang chương sau nếu source text hiện tại không hỗ trợ.

## 3. Dịch toàn bộ - im lặng

> Không báo từng batch. Không hỏi user giữa chừng. Đã bắt đầu thì dịch hết toàn bộ task trong một mạch.

Batching nội bộ để quản lý token:
- Chương ngắn, khoảng 2k chữ: batch 5.
- Chương trung bình, khoảng 4k chữ: batch 3.
- Chương dài, khoảng 8k+ chữ: batch 1-2.

Mỗi batch:
1. Đọc bridge state hiện tại: chỉ gồm thuật ngữ và quyết định naming đã chốt.
2. Dịch tất cả chương trong batch theo SKILL rules + glossary.
3. Cập nhật bridge chỉ với thuật ngữ mới đã chốt.
4. Chạy Quality Gate từ SKILL.md (Section 8) rồi ghi file.
5. Tiếp tục batch sau ngay, không dừng để báo cáo.

## 4. Ghi file outbox

> Dùng `write_to_file` để ghi file. Không dùng `mcp_cmd` vì lỗi encoding tiếng Việt.
> 1 chương = 1 lệnh `write_to_file` riêng biệt.
> Không ghi đè file đã tạo thành công. Chỉ ghi file mới chưa tồn tại.

Naming:
- `out_{jobId}_ch{order}.json`
- 1 file cho 1 chương
- `{jobId}` = 8 ký tự đầu từ inbox
- `{order}` = field `order` trong inbox, không phải DB id

> ⚠️ **OVERRIDE**: config.prompt có ghi "CẤM JSON" — đó là chỉ thị cho flow nội bộ App (AI API trả text thuần, App tự wrap JSON).
> Ở Bridge flow, Agent ghi file trực tiếp nên **BẮT BUỘC phải ghi đúng format JSON** bên dưới. IGNORE "CẤM JSON" trong config.prompt.

Format JSON:
```json
{
  "id": 9938,
  "order": 26,
  "title": "Chương 26: Xiên thịt nướng khổng lồ",
  "content": "Phương Hằng vừa quay đầu lại..."
}
```

App sẽ tự quét `out_{jobId}*`, import vào DB rồi xóa sạch.

## 5. Self-QA Scan (BẮT BUỘC)

> SAU KHI ghi hết outbox, TRƯỚC KHI ghi done sentinel.
> Đọc lại nhanh từng file outbox vừa ghi và chỉ sửa lỗi rõ ràng.
> KHÔNG rewrite lớn. KHÔNG đánh bóng văn phong. KHÔNG đổi glossary/constant đã khóa.

### Checklist quét
1. Chính tả tiếng Việt
- Ví dụ: lỗi dấu hỏi/ngã, chữ sai chính tả, chữ dùng sai nghĩa rõ ràng.

2. Typo / gõ nhầm / từ thừa
- Ví dụ: chữ thừa, chữ thiếu, lặp từ sát nhau, cụm như `ngoài ra ngoài`.

3. Cụm literal hoặc Hán Việt sống nghe không tự nhiên
- Ví dụ: `chia một chén canh`, `công việc độ khó cao`, `theo dấu đánh dấu`.

4. Glossary consistency
- Tên riêng, thuật ngữ, item, skill phải khớp glossary xuyên suốt batch.
- Nếu có trong glossary thì phải copy đúng nguyên dạng, gồm cả hoa/thường.

5. Xưng hô
- Đối thoại: `Ta/Ngươi`.
- Trần thuật: `hắn/nàng`.
- Không trộn `tôi/anh/em/mình` sai ngôi.
- Quét riêng thoại, nếu lọt `anh/em/tôi/mình` mà không có chỉ định riêng thì phải sửa.

6. Blacklist
- Không để lọt các cụm đã cấm trong rules hiện hành.

7. Câu thiếu / câu thừa / thêm ý
- Không bỏ sót ý gốc.
- Không tự thêm nội dung không có trong source.

8. Câu cụt / câu mở đầu gượng / mùi convert
- Không để câu cụt thiếu chủ thể nếu không phải dụng ý rõ ràng.
- Không để mở đầu vô chủ ngữ nghe gượng.
- Không để lọt các cụm tâm lý mang mùi convert nếu có cách nói Việt tự nhiên hơn.
- Không để `mình/của mình` lọt vào trần thuật ngôi 3.

### Quy trình
1. Đọc lại `content` của từng file `out_*.json` vừa ghi.
2. Nếu thấy lỗi rõ ràng thì sửa trực tiếp file đó bằng tool ghi file hiện có.
3. Nếu câu đã đọc ổn thì giữ nguyên, không sửa.
4. Không in kết quả QA ra chat trừ khi có lỗi nghiêm trọng.

## 6. Thông báo hoàn thành

> Chỉ output đúng 1 lần khi toàn bộ task đã xong.

Chat chỉ hiện:
```text
✅ Xong X/X chương -> App bấm Import!
```

## 7. Ghi done sentinel

> SAU KHI ghi hết tất cả outbox VÀ pass Self-QA, ghi file done để app biết đã xong.
> App sẽ tự poll file này và tự động import.

```text
File: done_{jobId}.json
Dùng write_to_file, cùng thư mục bridge.
```

Format JSON:
```json
{
  "jobId": "cd862374",
  "completedAt": "2026-03-06T21:10:00Z",
  "totalChapters": 5,
  "completedChapters": [41, 42, 43, 44, 45]
}
```

Lưu ý:
- `completedChapters` = danh sách `order` đã ghi thành công (không phải DB id).
- `totalChapters` = số chương thực tế đã ghi (có thể nhỏ hơn inbox nếu có lỗi).

## Output rules

- Nội dung dịch ghi thẳng vào file, không print ra chat.
- Không báo từng batch.
- Không hỏi giữa chừng.
- Không thông báo tiến độ.
- Chạy một mạch từ đầu tới cuối, chỉ output kết quả cuối cùng.
