# Plan: Hybrid Context Caching cho Raiden AI Translator

## 1. Mục tiêu (Objectives)
- **Tối ưu chi phí (Cost):** Giảm ~50-80% lượng Input Token khi dịch Batch cho rules và glossary.
- **Nhất quán văn phong (Consistency):** Sử dụng chương đã dịch làm 'mẫu' (Few-shot) trong Cache để giữ giọng văn 'Ta - Ngươi' chuẩn convert.
- **Tính linh hoạt (Flexibility):** Chỉ kích hoạt Cache khi dịch Batch hoặc chương siêu dài (Chunking).

## 2. Kiến trúc (Proposed Architecture)

### Chế độ A: Standard (Dịch lẻ 1-2 chương)
- Giữ nguyên cơ chế hiện tại. Gửi trực tiếp Prompt + Rules.
- Ưu điểm: Đơn giản, không tốn phí lưu trữ Cache (Storage cost).

### Chế độ B: Turbo Cache (Dịch Batch > 10 chương hoặc Chunking)
- **Tạo Cache:** 
  - Model: **Gemini 2.5 Flash** (Tối ưu nhất cho tốc độ và giá cả).
  - Content: [TITLE_RULE] + [CORE_RULES] + [IDIOM_RULES] + [FULL_DICTIONARY] + [2 CHƯƠNG DỊCH MẪU].
  - TTL (Time To Live): 1 giờ (đủ để chạy hết Batch rồi tự hủy).
- **Thực thi:** Tất cả các Request trong Batch sẽ trỏ về `cachedContent`.
- **Kết thúc:** Gọi API xóa Cache ngay lập tức.

## 3. Câu hỏi cho GPT-5.2 (Survey Questions)
1. **TTL Management:** Làm sao để quản lý vòng đời của Cache một cách tự động trong Node.js để tránh tốn phí lưu trữ ngoài ý muốn?
2. **Chunking Sync:** Khi chia nhỏ 1 chương cực dài thành nhiều Chunk, dùng chung 1 Cache ID có giúp AI giữ được ngữ cảnh từ đoạn trước tốt hơn so với việc gửi context thủ công không?
3. **Cost Sensitivity:** Với mức minimum 32k tokens của Gemini 2.5, làm thế nào để tối ưu hóa việc grouping các chương lẻ vào cùng một Cache hiệu quả nhất?

## 4. Tích hợp GPT vào Antigravity
- **Phương án 1 (Dùng MCP):** Đã cấu hình OpenAI MCP Server để gọi GPT-5.2.
- **Phương án 2 (Dùng CLI):** Viết một script bridge để anh em mình gõ lệnh `./gpt "câu hỏi"` là nó trả kết quả vào đây luôn.
