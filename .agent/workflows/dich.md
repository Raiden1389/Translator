---
description: Dịch chapters từ Antigravity Bridge inbox sang tiếng Việt, ghi từng chương ra outbox JSON theo workflow bridge, ưu tiên glossary và dùng rules lean cho Gemini Flash.
---

# /dich - Antigravity Bridge Translation Workflow

// turbo-all

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

### 2a. Source of truth

> Đây là workflow duy nhất cho `/dich`. Không đọc thêm file rule khác trong lúc dịch.

Priority:
- `Glossary`
- `Corrections`
- `Rules dưới đây`
- `config.prompt`
- `AI judgment`

Lưu ý:
- `Corrections` vẫn là ưu tiên cao, nhưng app sẽ còn áp lại khi import.
- Không tốn effort để tự làm một vòng rewrite lớn chỉ vì corrections.

### 2b. Ultra-lean translation rules cho Gemini 3.0 Flash

> Mục tiêu là để model tự viết tự nhiên nhất có thể. Chỉ khóa các điểm thật sự quan trọng. Ngoài các điểm đó, để model tự xử lý câu chữ.

Rules bắt buộc:
- Dịch đủ tiêu đề và nội dung. Không bỏ sót, không thêm ý, không giải thích ngoài văn bản.
- Output chỉ gồm tiêu đề và nội dung chương. CẤM meta talk, CẤM JSON, CẤM ghi chú.
- Dòng 1 là tiêu đề: `Chương [Số]: [Tên chương]`.
- Tiêu đề phải là sentence case. CẤM xuống dòng. CẤM Hán tự. CẤM Title Case. CẤM ALL CAPS.
- TUYỆT ĐỐI không để sót chữ Hán trong bản dịch.
- Glossary phải được áp dụng chính xác.
- CẤM thay nhân vật hoặc thuật ngữ không có trong glossary thành một mục khác có trong glossary.
- Nếu gặp tên không có trong glossary:
- Tên Hán thật sự -> phiên âm Hán Việt.
- Tên Tây phiên âm Trung -> khôi phục về tên tiếng Anh gốc chỉ khi thật sự chắc.
- Nếu không chắc -> giữ một cách phiên âm Latin hoặc Hán Việt nhất quán, KHÔNG bịa tên khác.
- Trong thoại: `Ta` / `Ngươi`.
- Độc thoại nội tâm: `Ta`.
- Trong trần thuật ngôi 3: ưu tiên `hắn` / `nàng`. Tránh `tôi`, `anh`, `em`, `mình`.
- Viết thường `hắn`, `nàng`, `ta`, `ngươi`, trừ đầu câu.
- Giữ đúng format các dòng hệ thống/game: `[Thông báo: ...]`, `[Gợi ý: ...]`, `Vật phẩm:`, `Mô tả:`.

Rules định hướng nhẹ:
- Nếu câu đã rõ nghĩa và tự nhiên, không sửa thêm chỉ để "hay hơn".
- Có thể ẩn chủ ngữ hoặc thay bằng đại từ nếu nghĩa vẫn rõ.
- Ưu tiên câu tiếng Việt tự nhiên, không bám cấu trúc Hán văn một cách máy móc.
- Tránh dịch literal làm câu Việt gượng. Nếu có 2 cách đều đúng nghĩa, ưu tiên cách đọc tự nhiên hơn trong tiếng Việt.
- Trước khi output, tự rà các lỗi bề mặt rõ ràng như lặp từ, thừa từ, cụm vô nghĩa, hoặc typo dễ thấy. Chỉ sửa các lỗi chắc chắn, không rewrite lớn.

### 2c. Context Bridge

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
2. Dịch tất cả chương trong batch dựa trên source text + glossary + rules.
3. Cập nhật bridge chỉ với thuật ngữ mới đã chốt.
4. Chạy quick sanity check rồi ghi file.
5. Tiếp tục batch sau ngay, không dừng để báo cáo.

### 3.5 Quick sanity check

> Đây là sanity check ngắn. Không biến bước này thành một vòng rewrite lớn.

Checklist:
- Tiêu đề đúng format `Chương X: ...`, không Hán tự, không xuống dòng.
- Không còn sót chữ Hán trong nội dung.
- Glossary và các term đã chốt được áp dụng đúng.
- Không có lỗi carry-over tên người hoặc thuật ngữ từ chương khác.
- Xưng hô và viết thường đúng rule.
- Dòng hệ thống/game vẫn giữ format ổn định.
- Không có meta talk, ghi chú, hay output ngoài nội dung chương.
- Không còn lỗi bề mặt rõ ràng như lặp từ, thừa từ, typo dễ thấy, hoặc câu vô nghĩa do dịch literal.

Nếu fail:
- Sửa tối thiểu đúng chỗ lỗi.
- Không rewrite cả chương nếu nghĩa không sai.

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
