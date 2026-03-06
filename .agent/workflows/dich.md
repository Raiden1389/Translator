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
- Với `自己/我` đi cùng danh từ trừu tượng như `năng lực`, `tiền đồ`, `suy nghĩ`, `lựa chọn`, ưu tiên bỏ sở hữu nếu nghĩa vẫn rõ. Tránh `của mình` trong trần thuật ngôi 3.
- Viết thường `hắn`, `nàng`, `ta`, `ngươi`, trừ đầu câu.
- Giữ đúng format các dòng hệ thống/game: `[Thông báo: ...]`, `[Gợi ý: ...]`, `Vật phẩm:`, `Mô tả:`.
- CẤM dấu phẩy sau từ nối đầu câu: `Nhưng`, `Tuy nhiên`, `Vì vậy`, `Do đó`.
- Tên game, tác phẩm, kỹ năng, phe phái, địa danh đã chốt trong cùng task thì không đổi cách gọi giữa các đoạn hoặc các chương.
- CẤM dịch sát từng chữ thành ngữ hoặc cụm Hán văn nếu ra câu Việt gượng hoặc vô nghĩa.
- Nếu bản dịch literal kiểu `chia một chén canh`, phải đổi sang cách nói Việt tự nhiên cùng nghĩa như `chia phần`, `kiếm một phần`, `nhúng tay vào`.
- CẤM cấu trúc kiểu `danh từ + độ khó cao/thấp`.
- Ví dụ sai: `công việc độ khó cao thế này`.
- Ví dụ đúng: `công việc khó như vậy`, `việc này quá khó`.

- CẤM cụm vị trí hoặc logic tự mâu thuẫn trong cùng một vế.
- Ví dụ sai: `đậu ở bên trong và ngoài doanh trại`.
- Khi gặp kiểu này, phải tự sửa thành một cách diễn đạt hợp logic trước khi output.

- CẤM từ thừa hoặc lặp từ sát nhau.
- Ví dụ sai: `ngoài ra ngoài`, `thầm lẩm bẩm`.
- Phải bỏ từ dư trước khi output.

- CẤM dùng `nhất` nếu source không có ý so sánh rõ ràng.
- Ví dụ sai: `gần nhà máy hóa chất bỏ hoang nhất`.
- Chỉ dùng `nhất` khi nguồn thật sự là `gần nhất/xa nhất/lớn nhất...`.

- CẤM các cụm danh từ kiểu dịch máy như `phương tiện loại ô tô`.
- Phải đổi thành danh từ Việt tự nhiên hơn như `ô tô`, `xe hơi`, `phương tiện`.
- CẤM các cụm mở lời literal kiểu `ta ở đây`, `ta bên này`, `ta chỗ này` nếu câu không có ý vị trí thật.
- Ví dụ sai: `ta ở đây tình cờ có một nhiệm vụ`.
- Ví dụ đúng: `ta tình cờ có một nhiệm vụ`, `ta có một nhiệm vụ`, `ta thấy có một việc ngươi có thể hứng thú`.
- CẤM dùng `mình` hoặc `của mình` trong suy nghĩ trực tiếp khi toàn đoạn đang trần thuật ngôi 3.
- Ví dụ sai: `kỹ năng bị động Cảm nhận nguy hiểm của mình`.
- Ví dụ đúng: `kỹ năng bị động Cảm nhận nguy hiểm của ta`, hoặc bỏ sở hữu nếu nghĩa vẫn rõ.
- CẤM lặp ý hoặc lặp từ cùng gốc trong một cụm.
- Ví dụ sai: `theo dấu đánh dấu`, `nhiệm vụ khó chỉ mức C+`.
- Phải rút gọn còn một hạt nghĩa: `theo dấu trên bản đồ`, `nhiệm vụ chỉ có độ khó C+`.
- CẤM cụm danh từ dịch máy nghe sai loại sự vật hoặc sai collocation.
- Ví dụ sai: `bàn chông`, `trạng thái cơ thể`.
- Phải đổi sang danh từ Việt tự nhiên hơn như `bẫy chông`, `thể trạng`, `thể chất`.
- Tránh các cụm convert rõ ràng như `trong lòng thầm nghĩ`, `cái địa phương này`, `có thể thấy rằng`.
Rules định hướng nhẹ:
- Nếu câu đã rõ nghĩa và tự nhiên, không sửa thêm chỉ để "hay hơn".
- Có thể ẩn chủ ngữ hoặc thay bằng đại từ nếu nghĩa vẫn rõ.
- Ưu tiên câu tiếng Việt tự nhiên, không bám cấu trúc Hán văn một cách máy móc.
- Nếu chủ thể đã rõ từ ngữ cảnh, câu mở đầu có thể vô chủ ngữ. Không tự thêm tên nhân vật chỉ để làm rõ chủ ngữ.

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
- Không có dấu phẩy sau từ nối đầu câu.
- Không còn cụm literal Hán văn nghe gượng trong tiếng Việt.
- Không còn cụm mâu thuẫn logic bề mặt.
- Không còn từ thừa, từ lặp, hoặc typo dễ thấy.
- Không còn cụm mở lời dư kiểu `ta ở đây`, `ta bên này` nếu không mang nghĩa vị trí thật.
- Không còn `mình/của mình` lệch POV trong ngôi 3.
- Không còn cụm lặp ý kiểu `theo dấu đánh dấu`.
- Không còn collocation sai rõ như `bàn chông`, `trạng thái cơ thể`.
- Không còn các cụm convert rõ ràng như `trong lòng thầm nghĩ`, `cái địa phương này`, `có thể thấy rằng`.
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
