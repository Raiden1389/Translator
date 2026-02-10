# 🦅 RAIDEN CASE STUDY: Character POV Hijacking (Bùi Khiêm vs Hoàng Tư Bác)

## 🔴 Vấn đề (The Issue)
Trong quá trình dịch **Concurrent (Song song 10+ chương)**, AI đôi khi thay thế tên nhân vật chính (POV) bằng tên của một nhân vật phụ. 
- **Ví dụ điển hình**: "Bùi Khiêm" bị AI tự ý đổi thành "Hoàng Tư Bác" mặc dù chương đó Hoàng Tư Bác còn chưa xuất hiện.
- **🚨 Lưu ý quan trọng**: Đây không phải hallucination ngẫu nhiên của AI, mà là hành vi nhất quán do dữ liệu đầu vào bị sai lệch (__deterministic input corruption__). Việc thay đổi Model hay Temperature sẽ không giải quyết được gốc rễ nếu dữ liệu Glossary vẫn bị "nhiễm".

## 🔍 Phân tích Nguyên nhân (Root Cause Analysis)

### 1. Lỗi "Ghost Characters" (Rò rỉ Glossary qua Concurrent Requests)
- **Cơ chế cũ**: Khi dịch 10 chương song song, hệ thống gộp glossary của cả 10 chương lại thành `sharedGlossary` để tiết kiệm tài nguyên.
- **Lỗ hổng**: Hệ thống mặc định cho phép tất cả `type: character` vào Glossary mà không kiểm tra sự tồn tại trong text của từng chương cụ thể.
- **Hệ quả**: Nhân vật từ chương 10 "hiện hồn" trong luồng dịch của chương 1, tạo ra sự nhiễu loạn dữ liệu chéo.

### 2. Sắp xếp Metadata sai lệch (Saliency Inversion)
- **Cơ chế cũ**: Glossary được sắp xếp theo độ dài chuỗi (`length DESC`).
- **Lỗ hổng**: "Hoàng Tư Bác" (3 chữ) dài hơn "Bùi Khiêm" (2 chữ) nên leo lên TOP 1. 
- **Hậu quả**: AI nhìn thấy nhân vật phụ ở vị trí có độ ưu tiên cao nhất trong danh sách.

### 3. Mất Metadata Tần suất (Frequency Drop)
- **Cơ chế cũ**: Quá trình merge làm rơi field `occurrences`. Hệ thống mất khả năng nhận diện Protagonist.

### 4. Vai trò của Prompt: Amplifier (Khuếch đại)
- Các Prompt rules như `[PHÂN VAI]` hay `Consistency Rule` **không gây ra lỗi**, nhưng chúng **khuếch đại hậu quả** khi Glossary đã bị nhiễm. AI cố gắng tuân thủ rules bằng cách sử dụng các "Ghost Characters" sai lệch trong glossary để "neo" bản dịch.

## ✅ Giải pháp Triệt để (The Ultimate Fix - v2.7.5)

### Tầng Dữ liệu & Cách ly (Data Isolation)
- **Double Filtering**: Ép lọc lại Glossary tại mỗi luồng dịch (vệ binh Isolate). Chỉ giữ lại nhân vật thực sự có tên trong text của chương đó.
- **Frequency-Based Sorting**: Sắp xếp theo: **Nhân vật > Tần suất nhắc tên > Độ dài**.

### Tầng Prompting (Instruction)
- **Semantic Tagging**: Gán nhãn `(Main)` cho nhân vật TOP 1.
- **Saliency Optimization**: Đẩy Glossary xuống cuối System Instruction để AI tập trung tối đa.

## 💡 Bài học kinh nghiệm (Key Takeaways)
1. **Deterministic Fix**: Đừng cố sửa lỗi dữ liệu bằng cách tinh chỉnh Prompt ngẫu nhiên.
2. **Isolation is King**: Trong xử lý song song, context phải được cô lập tuyệt đối.

---
## 🛡️ Thuật ngữ Nội bộ (Standard Pattern)

**Pattern Name**: `Cross-Chunk Character Contamination (C³)`
*Mô tả: Sự rò rỉ glossary gây ra bởi xử lý song song, dẫn đến đảo lộn độ ưu tiên (Saliency Inversion) của nhân vật trong Prompt.*

---
*Lưu giữ bởi Trưởng lão Tàng Kinh Các (Raiden Sect Librarian)*
