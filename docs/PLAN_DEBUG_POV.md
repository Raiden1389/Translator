# 📋 PLAN: Generic POV Protection System (v2.0)

## 🎯 Mục tiêu
Dứt điểm lỗi AI nhầm lẫn POV nhân vật chính thành nhân vật phụ bằng logic **Generic (Vạn năng)**. Không hardcode bất kỳ tên riêng nào vào core logic/prompt để hệ thống tự thích ứng với mọi bộ truyện.

## 🔍 Phạm vi rà soát (Audit Scope)

### 1. Tầng Heuristic Analytics (Radar)
- [ ] Kiểm tra xem field `count` (số lần xuất hiện) có được truyền từ Radar sang Glossary Builder không.
- [ ] Nếu chưa có `count`, cập nhật `AiNerService` để trả về tần suất xuất hiện.

### 2. Tầng Glossary Synthesis (Brain)
- [ ] **Fix Sorting Logic**: 
  - Ưu tiên 1: `Frequency Count` (Giảm dần). Nhân vật chính xuất hiện 890 lần phải nằm trên nhân vật phụ xuất hiện 51 lần.
  - Ưu tiên 2: `isManual` (Từ điển người dùng thêm tay).
  - Loại bỏ ưu tiên theo độ dài (Length) đối với `type: 'character'`.
- [ ] **Dynamic Labeling**: Tự động thêm nhãn `(POV/Main)` vào top 1-3 nhân vật có frequency cao nhất khi gửi Prompt cho AI.

### 3. Tầng Prompting (Instruction)
- [ ] Cập nhật `CORE_RULES` sử dụng nhãn Generic:
  - "Neo POV: Giữ vững tên nhân vật có nhãn (POV/Main) ở đầu đoạn. Tuyệt đối không lấy tên các nhân vật khác trong Glossary để thay thế cho POV."

## 🛠️ Các bước thực hiện

### Giai đoạn 1: Data Enrichment (backend-specialist)
- Cập nhật schema/data bridge để đảm bảo `count` của Heuristic luôn đi kèm với thuật ngữ trong suốt flow dịch.

### Giai đoạn 2: Logic Hardening (debugger)
- Sửa hàm `sort` trong `TranslationProvider.v2.tsx`.
- Thêm logic gán nhãn POV động.

### Giai đoạn 3: Verification (test-engineer)
- Test với 2-3 bộ truyện khác nhau để đảm bảo logic đếm số lần xuất hiện hoạt động chuẩn.
