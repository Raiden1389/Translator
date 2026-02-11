# 🦅 RAIDEN MOBILE COMPANION (RMC) - Technical Research Report

## 1. Executive Summary
Dự án **Raiden Mobile Companion (RMC)** nhắm tới việc mở rộng trải nghiệm đọc từ PC sang các thiết bị Android/iOS. Thay vì phát triển ứng dụng Native phức tạp, chúng ta sẽ sử dụng mô hình **PWA (Progressive Web App)** kết hợp với **Local LAN Synchronization**.

## 2. Architecture: PWA over Native
### Tại sao chọn PWA?
- **Zero Install**: Sếp chỉ cần scan QR hoặc nhập URL, sau đó "Thêm vào màn hình chính".
- **Cross-platform**: Chạy tốt trên cả Android và iOS mà không cần qua store.
- **Update cực nhanh**: Chỉ cần refresh trình duyệt là có bản mới.
- **Offline Capable**: Sử dụng Service Workers để lưu trữ ứng dụng và Service IndexedDB để lưu truyện.

## 3. Synchronization Mechanism (LAN Sync)
Đây là phần cốt lõi để đưa truyện từ PC sang Điện thoại mà không cần Internet/Cloud.

### Desktop (The Server)
- Sử dụng thư viện `tiny_http` (đã có sẵn trong dự án) để khởi tạo một HTTP server tạm thời trong Tauri.
- **Endpoint `/api/v1/sync`**: Trả về toàn bộ dữ liệu Workspace, Dictionary và Chapters dưới dạng một file JSON nén (Gzip).
- **Security**: Server chỉ khởi động khi Sếp nhấn nút "Sync Mobile". Sử dụng một `one-time-token` đính kèm trong QR code để xác thực.

### Mobile (The Client)
- Sau khi scan QR code, App Mobile sẽ gửi yêu cầu GET tới IP của PC (ví dụ: `http://192.168.1.5:8888/sync?token=...`).
- Dữ liệu nhận được sẽ được đổ vào **IndexedDB (Dexie)** của trình duyệt di động.
- **Incremental Sync**: Nghiên cứu khả năng chỉ gửi những chương mới dịch để tiết kiệm băng thông.

## 4. Reader Experience (UX Focus)
### Readability Standards
- **OLED Dark Mode**: Nền đen sâu (#000000) kết hợp chữ xám nhạt để bảo vệ mắt.
- **Custom Fonts**: Tích hợp Literata (Google Fonts) - font chữ dành riêng cho việc đọc ebook dài.
- ### Reading Mechanism: Infinite Scrolling
- **Unified Scroll Flow**: Không chia trang cứng. Toàn bộ truyện là một dòng chảy vô tận.
- **Smart Loading**: Chương tiếp theo được load ngầm khi Sếp đọc đến 80% chương hiện tại.
- **Precision Tracking**: Ghi nhớ tư thế đọc đến từng paragraph để khi Sếp mở lại trên Desktop, nó nhảy đúng đến chỗ đó.

### Performance
- Hỗ trợ **Virtual Scrolling** cho danh sách chương cực dài (ngàn chương).
- Tối ưu hóa bộ nhớ: Chỉ load nội dung chương hiện tại vào RAM.

## 5. Technical Stack Đề xuất
- **Frontend**: Next.js (Static Export) - Đã có sẵn kiến thức.
- **Styling**: Tailwind CSS v4 - Cho hiệu năng và animation mượt nhất.
- **DB**: Dexie.js - Cho phép dùng chung logic xử lý dữ liệu với bản Desktop.
- **Rust (Tauri)**: `tiny_http` + `local_ip_address` crate để tự động tìm IP máy tính.

## 6. Challenges (Các thách thức)
1. **iOS Background Sync**: Chrome/Safari trên iOS có thể ngắt kết nối nếu user chuyển app khi đang sync.
2. **Storage Limit**: Trình duyệt di động có giới hạn dung lượng IndexedDB (thường là 50% dung lượng trống của máy), cần cơ chế dọn dẹp cache truyện cũ.

---
*Báo cáo được biên soạn bởi Trưởng lão Architect & Trưởng lão Tàng Kinh Các.*
*Ngày khởi thủy: 2026-02-11*
