# 🎨 PWA Reader Interface Design

## 📱 Mobile-First Strategy
Giao diện Android Companion sẽ không còn là một Editor phức tạp, mà là một **"Premium E-Reader"**.

## Layout Components
1. **The library (Thư viện)**: 
   - Grid view hiển thị bìa truyện (nếu có).
   - Thanh tiến trình đọc (Reading Progress).
   - Nút "Sync" nổi (Floating Action Button).

2. **The Reader (Trang đọc)**:
   - **Infinite Scrolling (Mặc định)**: Sếp không cần bấm nút "Chương sau". Khi cuộn đến cuối chương, chương tiếp theo sẽ được tự động nối vào phía dưới với hiệu ứng chuyển cảnh mượt mà.
   - **Virtual List Optimization**: Sử dụng công nghệ ảo hóa (Virtuoso) để dù Sếp có cuộn qua 100 chương thì App vẫn chạy cực nhanh, không tốn RAM.
   - **Header ẩn tự động**: Chỉ hiện khi User chạm vào giữa màn hình hoặc cuộn ngược lên (Smart Navbar).
   - **Typography Settings**: Popover cho phép chỉnh Font, Cỡ chữ, Giãn dòng ngay lập tức.
   - **Double-Tap Translation**: Chạm 2 lần vào một từ khó để hiện nghĩa Hán Việt (lấy từ Dictionary đồng bộ sang).

3. **Offline Search**: 
   - Tìm kiếm chương nhanh theo số hoặc tên ngay cả khi không có mạng.

## Animations (Framer Motion)
Trưởng lão UX đề xuất các hiệu ứng sau để tạo cảm giác "Premium":
- **Infinite Continuous Scroll**: Hiệu ứng cuộn vô tận, tự động nối chương.
- **Scroll Memory**: Ghi nhớ chính xác vị trí Sếp đang đọc đến từng pixel.
- **Skeleton Screens**: Hiển thị khi đang nạp dữ liệu chương kế tiếp.

## Color Palette (Raiden Mobile Theme)
- **Deep Night**: #0a0a0a (Background)
- **Soft Text**: #d1d1d1 (Main text)
- **Raiden Purple**: #8b5cf6 (Accents/Icons)

---
*Thiết kế bởi Thánh nữ UX.*
*Ngày: 2026-02-11*
