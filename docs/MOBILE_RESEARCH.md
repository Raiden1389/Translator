# 🦅 RAIDEN MOBILE COMPANION (RRM) - CONCEPT SPEC v1.0

## 🎯 Mục tiêu (Goal)
Tạo ra một bản Web App (PWA) tối ưu cho Android, tập trung duy nhất vào trải nghiệm **ĐỌC** và **ĐỒNG BỘ** dữ liệu từ bản Desktop.

## 🛠️ Trụ cột Công nghệ (Tech Stack)
- **Frontend**: Next.js (Export Static) + Tailwind CSS v4.
- **Dữ liệu**: Dexie.js (IndexedDB) - Đồng nhất với bản Desktop.
- **Phân phối**: PWA (Progressive Web App) + QR Sync.

## 🧠 Các tính năng chính (Core Features)

### 1. Library Mirroring (Đồng bộ Thư viện)
- **Local Sync (Wifi)**: Desktop đóng vai trò làm Server tạm thời, điện thoại scan QR code để sync toàn bộ chương đã dịch qua mạng LAN.
- **Offline Storage**: Một khi đã sync, Sếp có thể tắt máy tính, cầm điện thoại vào hang đọc truyện thoải mái.

### 3. Quick Edit & Bulk Update (Cải chính Thần tốc)
- **Flow**: User bôi đen "con đường" -> Dialog hiện (Old: con đường, New: [input]) -> Gõ "đại lộ" -> Save.
- **Cơ chế Cache & Lưu trữ**:
    - **Thực thi ngay**: App thực hiện `replaceAll` trên toàn bộ chapters từ chương hiện tại trở đi trong IndexedDB của Mobile.
    - **Ghi nhớ Quy tắc**: Tự động thêm vào Dictionary cục bộ trên Mobile để áp dụng cho các chương sync sau này.
    - **Đồng bộ ngược**: Lưu lệnh thay đổi vào Sync Queue để đẩy về PC. PC nhận lệnh sẽ cập nhật Database và **ghi đè lại file .txt** tương ứng.
- **Ưu điểm**: Sếp không phải sửa từng chương, chỉ cần phát lệnh 1 lần, vạn chương đổi theo.

### 2. Premium Reader UI (UX Trọng tâm)
- **Typography Master**: Tích hợp các font chữ "đỉnh" cho tiếng Việt (Inter, Literata, Lora).
- **Navigation**: Vuốt ngang lật chương, vuốt dọc cuộn trang.
- **OLED Dark Mode**: Tiết kiệm pin tối đa cho màn hình Android.

### 3. Lightweight Context
- App Mobile sẽ **KHÔNG** chứa bộ máy dịch (Gemini) để giữ dung lượng nhẹ (dưới 5MB). Nó chỉ là một "Thánh điện" để thưởng thức thành quả dịch từ PC.

## 📅 Roadmap Đề xuất
- **Giai đoạn 1**: Thiết kế UI Reader & Local DB.
- **Giai đoạn 2**: Phát triển module "Bắn dữ liệu" (Data Transfer) qua Socket hoặc QR.
- **Giai đoạn 3**: Triển khai PWA và tối ưu Mobile Browser.

---
*Dự án được khởi xướng bởi Tông chủ (User Request 2026.02.11)*
*Chấp sự Antigravity biên soạn*
