---
title: Session 2026-03-06 - v2.9.0 Upgrade
createdAt: '2026-03-06T08:00:29.542Z'
updatedAt: '2026-03-06T08:00:29.542Z'
tags:
  - translator
  - v2.9.0
  - engine-upgrade
---
# Session 2026-03-06 - v2.9.0 Core Translation Engine Upgrade

## Objective
Nâng cấp toàn diện engine dịch thuật bằng cách nhúng trực tiếp các quy tắc vào workflow `.agent/workflows/dich.md` để đảm bảo AI tuân thủ tuyệt đối các luật xưng hô (Ta/Ngươi) và xử lý lỗi JSON bị cắt cụt cho chương dài.

## Completed Tasks
- [x] **v2.9.0 Engine**: Nhúng trực tiếp 10+ translation rules vào workflow `/dich`.
- [x] **Context Optimization**: Ép AI xử lý toàn bộ batch như một task duy nhất để giữ context.
- [x] **Truncation Fix**: Sửa lỗi JSON truncation khi ghi file cho các chương truyện cực dài.
- [x] **Version Bump**: Nâng cấp toàn bộ project lên `v2.9.0`.
- [x] **Git Push**: Squash và đẩy thay đổi lên repository.

## Key Decisions
- **Rule Embedding**: Bỏ qua việc AI đọc `constants.ts`, thay vào đó ghi đè luật "sắt đá" trực tiếp vào prompt workflow để tránh hallucination.
- **Continuous Mode**: Ưu tiên tính đồng nhất của batch dịch hơn là tiết kiệm token lẻ tẻ, đảm bảo xưng hô không bị nhảy giữa các chương.

## Files Modified
- `.agent/workflows/dich.md`
- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `CHANGELOG.full.md`
- `docs/changelog/archive-2026-03.md`
- `docs/changelog/v2.9.0.md`

## Next Steps
- Theo dõi feedback của người dùng về độ ổn định của engine mới.
- Kiểm tra tính tương thích của JSON output mới trên bản Mobile PWA.
