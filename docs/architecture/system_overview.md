# System Overview: Raiden AI Translator

## 1. Kiến trúc tổng quan
Dự án được xây dựng trên nền tảng **Next.js** chạy trong môi trường **Tauri**. Dữ liệu được quản lý hoàn toàn ở phía client thông qua **IndexedDB**.

- **Frontend:** Next.js (App Router), React 19, Tailwind CSS 4.
- **Desktop Bridge:** Tauri (Rust) cung cấp khả năng truy cập file hệ thống và mở cửa sổ native.
- **Storage:** Dexie.js (IndexedDB) lưu trữ truyện, chương, và từ điển.

## 2. Các Module Chính

### A. Workspace Management
Quản lý các bộ truyện. Mỗi bộ truyện là một "Workspace" riêng biệt gồm:
- Thông tin metadata (Tên, tác giả).
- Danh sách chương (`chapters`).
- Từ điển riêng (`dictionary`, `blacklist`, `corrections`).

### B. Translation Pipeline
Sử dụng Gemini API để dịch nội dung.
- **Chunking:** Chia nhỏ chương dài để vượt qua giới hạn token.
- **Glossary Injection:** Tự động đưa từ điển vào prompt để đảm bảo tính nhất quán (ví dụ: tên nhân vật không bị thay đổi).
- **Smart Capitalization Engine (v2.0):** Một lớp hậu xử lý (post-processing) động. Nó kết hợp danh sách đại từ hệ thống với Từ điển của người dùng để "ép" các danh từ chung về viết thường khi đứng giữa câu, đảm bảo văn phong thuần Việt.

### C. AI Analysis Tools
1. **Name Hunter:** Công cụ local sử dụng Regex kết hợp AI để bóc tách tên riêng nhanh chóng.
2. **AI Scan (Legacy):** Sử dụng Gemini để phân tích ngữ cảnh và bóc tách thuật ngữ/nhân vật chuyên sâu.

### D. Reader & Editor
- Chế độ đọc tập trung (Raiden Mode).
- Chế độ sửa Chapter song song (Parallel View).
- Hỗ trợ đổi font, cỡ chữ, màu nền linh hoạt.

## 3. Luồng dữ liệu (Data Flow)
1. **Import:** Người dùng nạp text/epub -> Tauri đọc file -> Lưu vào IndexedDB.
2. **Analysis:** Quét AI -> Lưu nhân vật vào Dictionary.
3. **Translation:** Gửi text + Dictionary -> Gemini API -> Nhận kết quả -> Lưu vào IndexedDB.
4. **Display:** UI lắng nghe thay đổi thông qua `useLiveQuery` (Dexie) để cập nhật real-time.
