# Plan: Name Consistency Audit (Kiểm tra nhất quán tên)
Created: 2026-03-22T11:25:00+07:00
Status: ✅ Complete

## Overview
Post-translation scanner quét toàn bộ chương đã dịch trong workspace, trích xuất **tên riêng** từ cả text Việt và text gốc Trung, gom nhóm các biến thể khác nhau của cùng 1 nhân vật, hiển thị bảng review cho Sếp chọn tên chuẩn, rồi auto-fix bằng Corrections system có sẵn.

**Pain point:** Dùng Gemini 2.5 Flash no-thinking dịch mà không quét NER trước → nhân vật phụ bị phiên âm không nhất quán (VD: "朱南" → "Trư Nam" ở ch.1-5, "Cư Nam" ở ch.6-45).

**Zero API cost** — Toàn bộ logic là string processing + HanViet dictionary lookup.

## Tech Stack
- **Frontend:** React (Tab mới trong Intelligence Hub)
- **Logic:** TypeScript service layer (lib/services/)
- **Data:** Dexie.js (chapters table — `content_translated` + `content_original`)
- **Existing Infra:**
  - `SyllableRepository.toHanViet()` — chuyển ký tự Trung → Hán Việt
  - `calculateSimilarity()` — Jaro-Winkler fuzzy matching
  - `corrections.service.ts` — Global Corrections auto-apply

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Name Extraction Engine | ✅ Complete | 100% |
| 02 | Clustering & Cross-reference | ✅ Complete | 100% |
| 03 | Review UI (Hub Tab) | ✅ Complete | 100% |
| 04 | Auto-Fix + Corrections Integration | ✅ Complete | 100% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
