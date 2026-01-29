# Changelog

Tất cả các thay đổi quan trọng đối với dự án **Raiden AI Translator** sẽ được ghi lại trong file này.

## [1.6.0] - 2026-01-30

### 🧠 Bộ máy Cải chính Thông minh (Correction Engine v2.0)
- **Tự động nhận diện Chữ hoa/Chữ thường:** Chỉ cần thêm 1 quy tắc viết thường, hệ thống tự động sửa cho cả bản viết hoa và viết hoa đầu câu.
- **Bảo lưu định dạng (Case-Preserving):** Ví dụ: `chủ công` -> `chúa công` thì `Chủ công` tự động thành `Chúa công`, `CHỦ CÔNG` thành `CHÚA CÔNG`.
- **Cải chính Trực tiếp (Live Correction):** Các thay đổi trong bảng Cải chính sẽ được áp dụng ngay lập tức lên giao diện trình đọc mà không cần dịch lại hay load lại chương.
- **Thanh tẩy ký tự ẩn (Invisible Character Nuke):** Tự động loại bỏ các ký tự tàng hình (zero-width) và chuẩn hóa khoảng trắng để đảm bảo khớp 100% quy tắc.
- **Chuẩn hóa Unicode (NFC):** Đảm bảo tính đồng nhất của các ký tự Tiếng Việt (dấu hỏi, dấu ngã) giữa bản gốc AI và dữ liệu người dùng nhập.

### 📖 Trình đọc & UI (Reader & UX Enhancements)
- **Đối chiếu Song song (Better Parallel View):** Văn bản gốc Tiếng Trung giờ đây được chia đoạn (paragraph) khớp với bản dịch, giúp việc đối chiếu trở nên dễ dàng hơn.
- **Độ chật văn bản (Compact Layout):** Giảm chiều cao dòng và khoảng cách đoạn văn để hiển thị được nhiều nội dung hơn trên một màn hình, giảm mỏi tay khi cuộn.
- **Scrolling Cải chính:** Thiết kế lại tab Cải chính với danh sách có thể cuộn độc lập và nút "Áp dụng" luôn cố định ở dưới cùng, cực kỳ dễ dùng trên mọi kích cỡ màn hình.

## [1.5.0] - 2026-01-28

### 🚀 Tái cấu trúc Hệ thống Trình trích xuất (AI NER v3.0)
- **Hệ thống Mô tả Thực thể:** AI giờ đây tự động tạo mô tả ngắn gọn cho nhân vật và thuật ngữ dựa trên ngữ cảnh (VD: "Thiếu gia nhà họ Lâm", "Thủ đô của nước Thục").
- **Bảo vệ Dữ liệu:** Ngăn chặn AI ghi đè lên các mô tả cũ mà người dùng đã dày công biên soạn. AI chỉ thêm mô tả nếu ô đó đang trống.
- **Dọn dẹp Công cụ:** Loại bỏ hoàn toàn Modal "Name Hunter" cũ để tập trung vào một quy trình Quét AI duy nhất, ổn định và mạnh mẽ hơn.
- **Hợp nhất & Lọc thông minh:** Tự động ẩn các thuật ngữ đã có trong từ điển, giúp người dùng chỉ tập trung vào các thực thể mới.

### ✨ Giao diện & Trải nghiệm (Review UI)
- **Visual Anchoring:** Tối ưu hóa hiển thị cặp Tên gốc - Dịch thuật. Chữ Hán được hiển thị với font Serif trang trọng, tên dịch nổi bật với màu xanh Emerald.
- **Chỉ báo dòng (Left Indicator):** Thêm thanh màu xanh ở lề trái cho các hàng đang được chọn để tăng khả năng định vị thị giác.
- **Footer Tinh gọn:** Thiết kế lại thanh hành động phía dưới để tối ưu diện tích và tập trung vào các thao tác Save/Cancel.
- **Tự động Hán Việt:** Toàn bộ thực thể quét ra từ văn bản gốc sẽ được tự động chuyển sang âm Hán Việt chuẩn xác.

## [1.4.1] - 2026-01-28

### ✨ Được cải tiến (Improved)
- **Hệ thống Viết hoa Thông minh (v2.0):** Nâng cấp hàm `finalSweep` thành một engine động. Tự động nhận diện và viết thường các đại từ, danh từ chung (Ta, Đại ca, Tướng quân...) khi đứng giữa câu dựa trên danh sách hệ thống và Từ điển của người dùng.
- **Prompt Engineering (v2.4): Hàn lại đoạn này bị cắt mất ở prompt gốc** Cập nhật `SYSTEM_INSTRUCTION` với các quy tắc viết hoa "hung dữ" và ví dụ Sai/Đúng trực quan, buộc AI tuân thủ nghiêm ngặt hơn.
- **Giao diện Tạo Workspace:** Làm lại hoàn toàn dialog `NewWorkspaceDialog` với thiết kế hiện đại, chia nhóm thể loại rõ ràng và hiệu ứng chuyển cảnh mượt mà.
- **Thanh công cụ Batch Actions:** Tái cấu trúc phân cấp thị giác cho toolbar. Chuyển các nút quét thuật ngữ thành dạng `outline` để giảm nhiễu màu sắc, ưu tiên nút "Dịch" chính.
- **Fix lỗi Logic:** Cập nhật nhận diện dấu hai chấm (`:`) là điểm ngắt câu để giữ viết hoa cho tiêu đề chương (VD: "Chương 1: Ta...").

### ➕ Đã thêm (Added)
- **AI Scan (Cũ):** Khôi phục tính năng quét thuật ngữ bằng AI nguyên bản, hoạt động song song với Name Hunter mới.
- **Review Dialog Integration:** Kết nối trình duyệt kết quả AI (ReviewDialog) vào cả Chapter List và Reader để người dùng duyệt thuật ngữ trước khi lưu.

### 🐞 Đã sửa (Fixed)
- **Lỗi Text Selection:** Khắc phục triệt để lỗi text bị tự động bôi đen toàn bộ (select-all) trong ô nội dung gốc. Giờ đây người dùng có thể chọn từng đoạn text bình thường.
- **Lint Errors:** Dọn dẹp các biến thừa, sửa lỗi sai prop name (`onConfirm` -> `onSave`) và tối ưu hóa các class Tailwind v4.

---

## [1.4.0] - 2026-01-26
- Phiên bản ổn định với tính năng Name Hunter mới và giao diện Raiden Mode.
