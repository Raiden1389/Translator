# 🦀 Sync Server Design (Rust/Tauri)

## Overview
The Sync Server is a minimal HTTP server running inside the Raiden Desktop App. It allows the Mobile Companion to download the library data over the local network.

## Library: `tiny_http`
Chúng ta chọn `tiny_http` vì nó cực kỳ nhẹ, không cần async complex nếu chỉ phục vụ 1-2 request đồng thời.

## Protocol Flow
1. **User Action**: Sếp bấm "Start Sync" trên giao diện Desktop.
2. **Key Generation**: 
   - Tauri sinh ra 1 `AuthToken` ngẫu nhiên.
   - Tauri lấy LAN IP (dùng crate `local_ip_address`).
   - Giao diện hiển thị QR Code: `raiden://sync?ip=192.168.1.5&port=8888&token=ABC123`.
3. **Server Loop**: Tauri khởi chạy một thread riêng chạy `tiny_http::Server`.
4. **Endpoint handling**:
   - `GET /status`: Trả về thông tin hệ thống (vòng lặp kiểm tra kết nối).
   - `GET /download`: 
     - Trả về Big JSON chứa toàn bộ dữ liệu truyện cho Mobile.
   - `POST /update` (🔥 NEW: Bi-directional Sync): 
     - Nhận các nội dung đã được Sếp "cải chính" từ Mobile.
     - Tauri sẽ thực hiện ghi đè vào DB cục bộ.
     - **Auto-Mirroring**: Ngay sau khi ghi DB, Tauri tự động gọi `syncFullStory()` để làm mới toàn bộ file **.txt** và **.json** trên ổ cứng PC.

## 🔄 Conflict Resolution (Xử lý xung đột)
- Sử dụng cơ chế **"Latest Wins"** dựa trên `updatedAt`. 
- Nếu Sếp sửa cùng 1 chương ở cả PC và Mobile, bản nào có thời gian sửa gần nhất sẽ được ưu tiên giữ lại và ghi vào file TXT.

## 🚀 Tầm nhìn: Perfect Loop
Sếp dịch bằng PC (Sức mạnh AI) -> Đọc và gọt giũa bằng Mobile (Sự tinh tế) -> Bản lưu trữ cuối cùng (TXT) luôn là bản hoàn hảo nhất.

## Cấu trúc Dữ liệu Sync (Big JSON)
```json
{
  "version": "1.0",
  "workspace": { ... },
  "dictionary": [ ... ],
  "chapters": [
    { "id": 1, "title": "...", "content_translated": "..." },
    ...
  ]
}
```

## Error Handling
- Nếu Token sai -> Trả về 401.
- Nếu Server đang bận -> Trả về 503.
- Tự động tắt Server sau 5 phút nếu không có request để bảo mật.

---
*Phác thảo bởi Trưởng lão Architect.*
*Ngày: 2026-02-11*
