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

## 5. Thông báo hoàn thành

> Chỉ output đúng 1 lần khi toàn bộ task đã xong.

Chat chỉ hiện:
```text
✅ Xong X/X chương -> App bấm Import!
```

## Output rules

- Nội dung dịch ghi thẳng vào file, không print ra chat.
- Không báo từng batch.
- Không hỏi giữa chừng.
- Không thông báo tiến độ.
- Chạy một mạch từ đầu tới cuối, chỉ output kết quả cuối cùng.
