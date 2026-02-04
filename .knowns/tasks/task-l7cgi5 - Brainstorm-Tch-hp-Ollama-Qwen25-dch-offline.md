---
id: l7cgi5
title: 'Brainstorm: Tích hợp Ollama (Qwen2.5) dịch offline'
status: done
priority: medium
labels: []
createdAt: '2026-02-03T11:57:18.727Z'
updatedAt: '2026-02-04T05:03:16.972Z'
timeSpent: 0
---
# Brainstorm: Tích hợp Ollama (Qwen2.5) dịch offline

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Nghiên cứu khả năng tích hợp mô hình ngôn ngữ lớn chạy nội bộ (Local LLM) để dịch truyện Trung-Việt không cần internet và tiết kiệm chi phí API.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 - [ ] Đánh giá độ chính xác của Qwen2.5 1.5B/3B/7B với truyện tiên hiệp/kiếm hiệp
- [x] #2 - [ ] Phân tích hiệu năng (Speed/Latency) trên phần cứng người dùng
- [x] #3 - [ ] Thiết kế kiến trúc Hybrid (Gemini + Local LLM)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
✅ Đã test Ollama (Qwen2.5) - Kết luận: Dùng như mứt, không đủ chất lượng cho truyện tiên hiệp/kiếm hiệp. Quyết định scrap, đã xóa.
<!-- SECTION:NOTES:END -->

