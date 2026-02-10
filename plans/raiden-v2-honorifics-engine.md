# 📜 THẦN THUẬT QUY TRÌNH: CHƯỞNG QUẢN THẦN THÁI & LINH QUAN MAPPING (v2.0)

> **Mục tiêu:** Đột phá cảnh giới dịch thuật, xóa bỏ xưng hô "Ta-Ngươi" khô cứng, thay bằng hệ thống xưng hô thông minh theo ngữ cảnh (Contextual Honorifics) mà không làm tốn linh thạch (Tokens) hay gây lag app.

---

## 🏛️ TẦM NHÌN TÔNG MÔN (3-Persona Vision)

- **Trưởng lão Architect:** Tối ưu hóa linh lực, chỉ map Top 30 nhân vật quan trọng nhất. Dùng cơ chế Selective Context Injection để Prompt luôn gọn gàng.
- **Thánh Nữ UX:** Giao diện sơ đồ quan hệ Apple-style. Tự động nhận diện quan hệ (Auto-Discovery), người dùng chỉ cần duyệt tấu.
- **Đại đệ tử Antigravity:** Thực thi ngầm trong 4-5 giây dịch chương. Không thêm status rườm rà, kết quả dịch phải mượt như Xcode.

---

## 🛠️ LINH ĐỒ THỰC THI (3 Giai đoạn)

### 1️⃣ GIAI ĐOẠN 1: THANH LỌC LINH THỨC (HEU MAX PING)
Nâng cấp `HeuristicEngine` hiện tại để giảm 90% rác:
- **N-gram Filter:** Đối chiếu tần suất xuất hiện của nhân vật (Survival Rate).
- **Contextual Verification:** Kiểm tra xem danh từ riêng có đi kèm động từ/tính từ thường thấy của nhân vật không.
- **Phân tước vị:** Tự động gán nhãn `Main`, `Recurrent`, `Disposable`.

### 2️⃣ GIAI ĐOẠN 2: TÀNG KINH CÁC QUAN HỆ (RELATIONSHIP HUB)
Xây dựng Database và UI cho quan hệ nhân vật:
- **Schema Mapping:** 
  - `SourceCharacter` -> `TargetCharacter`
  - `RelationType`: (Sư đồ, Thù địch, Thân mật, Chủ tớ...)
  - `ToneTag`: (Kính trọng, Kiêu ngạo, Bình đẳng, Khúm núm...)
- **Auto-Discovery:** Khi scan truyện, AI Flash quét nháp quan hệ dựa trên từ khóa xưng hô gốc (Sư phụ, Huynh, Tỷ...) và lưu vào trạng thái `Draft`.

### 3️⃣ GIAI ĐOẠN 3: ĐỘNG CƠ THÀNH THÁI (DYNAMIC HONORIFICS ENGINE)
Đây là trái tim của hệ thống:
- **Pre-Processing:** Trước khi dịch, app lướt qua nội dung chương, nhặt ra danh sách nhân vật có mặt.
- **Smart Prompt Injection:** 
  - *Ví dụ:* Nếu chương có A và B đang đấu khẩu, nhét vào prompt: `Mode: Hostile, Character A (Arrogant) vs Character B (Defiant)`.
- **Result:** AI tự động chọn xưng hô: *"Lão tử sẽ lột da ngươi!"* thay vì *"Ta sẽ đánh ngươi!"*.

---

## 💎 TIẾT KIỆM LINH THẠCH (Token Efficiency)
- Không nhét toàn bộ Hub vào Prompt.
- Chỉ nhét đúng **Mapping của những người có mặt** trong đoạn đang dịch. 
- Dự kiến: Tăng thêm ~50 tokens/request nhưng hiệu quả tăng 200%.

---

## 📅 LỘ TRÌNH TU LUYỆN (Next Steps)
1. **Dựng Table Schema** trong IndexedDB cho Relationship (Architect).
2. **Thiết kế UI Sơ đồ quan hệ** chuẩn macOS trong Raiden Hub (UX Saint).
3. **Logic Inject Context** vào Translation Flow (Antigravity).

---
*Ký tên phê duyệt:*
**Chưởng môn Sếp**
(Vui lòng gõ `/accept` hoặc chỉ thị sửa đổi)
