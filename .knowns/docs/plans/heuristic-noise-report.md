# 🧠 Báo cáo Thảo luận: Heuristic Noise Analysis (Simulation)
**Chủ đề:** Lọc nhiễu danh sách Nhân vật trong Heuristic Center
**Đối tượng:** "Chân Vương" Pattern
**Thời gian:** 03/02/2026 - 20:11

---

## 🙋‍♂️ Antigravity (Team Leader):
"GPT, nhìn cái screenshot kìa! Heuristic nó báo tới 325 nhân vật, nhưng tao nhìn sơ qua là thấy 'toàn rác'. Ví dụ: 
- `以为真王` -> `Dĩ Vi Chân Vương` (Nghĩ là Chân Vương)
- `可能真王` -> `Khả Năng Chân Vương` (Có khả năng là Chân Vương)

Mày lưu ý, cái engine của tao chạy trên **Tauri (Rust) + Next.js + Dexie (IndexedDB)**. 

Cấu trúc Pipeline Heuristic của tao như sau:
1. **Scanner**: Duyệt qua các chương truyện.
2. **Tagger**: Trích xuất các cụm từ tiềm năng (Candidates).
3. **RankResolver**: Engine chuyên xử lý danh hiệu (Vương, Đế, Tông Sư...).
4. **ContextClassifier**: Bộ lọc phủ định (Negative Filters) để loại bỏ:
   - `GENERIC` (những cái chung chung như 'các vị tông sư').
   - `STATEMENT` (mệnh đề như 'đã là tông sư').
   - `OBJECT` (đối tượng tác động như 'giết chết tông sư').
   - Sau cùng mới dùng **Whitelist Patterns** để Opt-in `TITLE`.

Với cấu trúc này, mày đề xuất tao nên cập nhật Rule lọc 'Dĩ vi' (nghĩ là) vào đâu là chuẩn nhất? Tagger, Resolver, hay Classifier?"

---

## 🤖 GPT-5.2 (NLP Specialist):
"Ồ! Cấu trúc Pipeline của bồ rất chuyên nghiệp và rõ ràng. Với một hệ thống phân lớp như vậy, tao đề xuất tập trung vào **Context Classifier** và **Rank Resolver** vì đây là nơi xử lý ngữ cảnh 'Dĩ vi' (nghĩ là) tốt nhất mà không làm hỏng logic của Tagger. Đây là chiến lược cụ thể:"

### 1. Phân tích lỗi (Root Cause):
- Thuật toán đang quét theo pattern: `[Tên?] + [Vương]`. Do "以为" (Dĩ vi) có 2 chữ, kết hợp thành 4 chữ hoàn hảo khớp với Whitelist Pattern của bồ nên nó lọt lưới.

### 2. Chiến lược xử lý (Implementation Points):

#### A. Tại Context Classifier (Trọng tâm):
- Thêm nhóm **'THINKING / LOGIC'** prefix.
- Các từ cần chặn: `以为` (Dĩ vi - Nghĩ là), `认为` (Nhận vi - Cho là), `所谓` (Sở vị - Gọi là), `称为` (Xưng vi - Gọi là), `成了` (Thành liễu - Trở thành).
- Những từ này nếu đứng đầu cụm danh hiệu -> Đẩy về loại `STATEMENT` hoặc `GENERIC` để loại bỏ ngay.

#### B. Tại Rank Resolver (Lớp bảo vệ 2):
- Bổ sung `junkKings` (Prefix rác cho họ Vương).
- Thêm: `以` (Dĩ), `任` (Nhận), `所` (Sở), `称` (Xưng), `成` (Thành).

#### C. Tại Tagger (Dọn dẹp đầu vào):
- Cập nhật `VERB_PREFIX_STRIP` để lột bỏ các từ nối logic này trước khi gửi sang Resolver xử lý, giúp lõi (Core) sạch hơn.

---

## 🛠️ Action Plan (Antigravity):
1. Mở `lib/gemini/heuristic/context-classifier.ts`, thêm `以为`, `认为` vào bộ lọc `STATEMENT`.
2. Mở `lib/gemini/heuristic/rank-resolver.ts`, cập nhật `junkKings` để bắt mấy chữ `以`, `任`...
3. Tiến hành quét lại (Re-scan) và chứng kiến sự kỳ diệu: 325 nhân vật sẽ giảm xuống chỉ còn vài chục ông "xịn".
