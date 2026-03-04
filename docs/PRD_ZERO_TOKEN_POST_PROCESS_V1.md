# PRD: Zero-Token Post-Process Correction (V1)

## 1. Bối Cảnh
- Bản dịch AI (Gemini 2.5, thinking off) đã đạt mức dùng được, nhưng còn lỗi "dịch máy" như lặp cụm từ gần nhau, câu cứng, một số đoạn thiếu mượt.
- Không muốn dùng thêm LLM hậu kỳ vì tốn token, tăng độ trễ và khó kiểm soát.
- Heuristic NER/tag ngữ cảnh hiện tại chưa đủ chính xác để làm lõi quyết định.

## 2. Mục Tiêu
- Tăng độ mượt bản dịch sau AI bằng cơ chế thuần rule, deterministic, 0 token.
- Không làm sai nghĩa và không phá glossary/constant.
- Tích hợp thẳng vào pipeline hiện tại, bật/tắt được.

## 3. Phi Mục Tiêu (Non-goals)
- Không thay thế AI dịch chính.
- Không làm văn phong cao cấp như biên tập thủ công.
- Không xử lý toàn bộ lỗi ngữ nghĩa phức tạp.

## 4. Phạm Vi V1
- Chỉ xử lý 3 nhóm lỗi:
1. Cụm từ lặp gần nhau (anti-repeat).
2. Một số mẫu câu máy phổ biến (de-machine templates).
3. Chuẩn hóa khóa thuật ngữ/constant (consistency lock).
- Không dùng NER nâng cao, không dùng model để phân loại ngữ cảnh.

## 5. Yêu Cầu Chức Năng
1. Hệ thống nhận `translatedText` sau `finalSweep`.
2. Hệ thống áp dụng rules theo thứ tự cố định, kết quả deterministic.
3. Bỏ qua các dòng hệ thống/game prompt (`[...]`, `Gợi ý:`, `Vật phẩm:`...).
4. Không thay thế các term nằm trong glossary, constant lock, tên riêng đã khóa.
5. Có log thống kê:
- Số rule match.
- Số thay thế thực hiện.
- Top cụm đã thay.
6. Có feature flag bật/tắt toàn bộ pass (`enableRulePostCorrection`).

## 6. Yêu Cầu Phi Chức Năng
- 0 API call, 0 token.
- Độ trễ trung bình dưới 50ms/chương 5k-10k chars trên máy dev.
- Kết quả idempotent tương đối: chạy lần 2 không đổi đáng kể.
- Dễ mở rộng rule qua config JSON hoặc DB.

## 7. Thiết Kế Giải Pháp
- Vị trí pipeline:
`AI output -> parse -> applyAllCorrections -> finalSweep -> rulePostCorrection(V1) -> save`
- Rule engine:
1. `AntiRepeatRule`
- Trigger phrase.
- Variants.
- Window lines (5-8).
- Safe context (`any` hoặc `narration_only`).
2. `TemplateFixRule`
- Regex/pattern cứng.
- Replacement cố định.
3. `LockRule`
- Danh sách term không được đụng (glossary + constants).

## 8. Dữ Liệu Rule (Đề Xuất)
```ts
type Rule = {
  id: string;
  type: "anti_repeat" | "template_fix";
  from?: string;
  pattern?: string;
  to?: string;
  variants?: string[];
  window?: number;
  safeContext: "any" | "narration_only";
  enabled: boolean;
};
```

## 9. Luật An Toàn
1. Không sửa dòng hệ thống.
2. Không sửa trong term khóa.
3. Không sửa nếu câu có dấu hội thoại khi rule là `narration_only`.
4. Không chain-replace vô hạn.
5. Nếu mơ hồ, bỏ qua.

## 10. Ví Dụ
- Input: `... lũ lượt lao tới ... lũ lượt tràn vào ...`
- Output: `... lũ lượt lao tới ... ào ạt tràn vào ...`
- Input system line: `[Gợi ý: Người chơi nhận được ...]`
- Output: giữ nguyên.

## 11. KPI Đánh Giá
1. Repetition density giảm tối thiểu 20% trên tập test.
2. Không tăng lỗi glossary/constant (0 regression critical).
3. Tỉ lệ can thiệp vừa phải: 3-12 thay/chương (tránh over-edit).
4. Feedback đọc mượt từ người dùng nội bộ: pass.

## 12. Kế Hoạch Triển Khai
1. Phase 1 (1-2 ngày)
- Implement engine + feature flag + logging.
- Seed 20-30 rules an toàn.
2. Phase 2 (2-3 ngày)
- Chạy trên tập chương thực tế, tune window/variants.
- Thêm 20 rules từ lỗi lặp phổ biến.
3. Phase 3
- UI quản lý rule cơ bản (bật/tắt, ưu tiên, test nhanh trên đoạn text).

## 13. Rủi Ro
- Over-correction làm lệch giọng.
- Replace nhầm trong ngữ cảnh đặc biệt.
- Rule phình to, khó maintain.

## 14. Giảm Thiểu Rủi Ro
- Chỉ cho phép "safe rules" ở V1.
- Có lock glossary/constant bắt buộc.
- Có log + rollback bằng feature flag.

## 15. Tiêu Chí Nghiệm Thu (Acceptance Criteria)
1. Bật/tắt được `rulePostCorrection`.
2. Không thay đổi dòng system prompt.
3. Không thay đổi term khóa.
4. Chạy 100 chương test không crash.
5. KPI repetition giảm theo ngưỡng đề ra.

## 16. Open Questions (Dành Cho Brainstorm Với Claude)
1. Rule storage nên đặt trong code, JSON file, hay DB table riêng?
2. Có cần per-workspace ruleset hay dùng global rules mặc định trước?
3. Ưu tiên deterministic tuyệt đối hay cho phép random seed để đỡ đơn điệu?
4. Cách đo "reading smoothness" ngoài repetition density?
5. Khi nào V1 đủ ổn để mở UI editor cho rules?
