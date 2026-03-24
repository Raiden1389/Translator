---
title: 'Session 2026-03-23 — Prompt Rule Audit & Post-Processing Fixes'
description: v2.10.1 patch — Fix 5 lỗi audit từ Codex + deterministic capitalize [] trong finalSweep
createdAt: '2026-03-24T02:06:15.125Z'
updatedAt: '2026-03-24T02:06:15.125Z'
tags:
  - translator
  - prompt-rules
  - post-processing
  - bugfix
  - codex-audit
---

# Session 2026-03-23 — Prompt Rule Audit & Post-Processing Fixes

## Objective
Audit và fix các lỗi trong `constants.ts` được phát hiện bởi Codex analysis. Đồng thời fix lỗi hiển thị text hệ thống `[]` viết thường đầu dòng.

## Completed Tasks

### 1. Fix 5 lỗi Codex Audit (constants.ts)

| Priority | Finding | Fix |
|----------|---------|-----|
| 🔴 HIGH | `batch/prompt.ts` gọi `buildSystemInstruction()` không truyền `isBatch=true` → "CẤM JSON" conflict JSON output | Truyền `true` vào `prompt.ts:24` |
| 🔴 HIGH | `CURRENCY_RULE`: 万→nghìn tệ **SAI 10x** (万 = 10,000 = vạn) | Sửa: 万→vạn tệ (mười nghìn), thêm 千万, 亿 |
| 🟡 MED | `WESTERN_NAME_RULE` fallback "ghi chú" mâu thuẫn CẤM Hán tự + CẤM giải thích | Đổi: "giữ phiên âm Latin hóa, KHÔNG ghi chú, KHÔNG Hán tự" |
| 🟡 MED | `[HARD LIMIT]` ẩn chủ ngữ quá cứng → mờ nhân vật scene đông | Nới: "NÊN hạn chế, ĐƯỢC PHÉP nếu cần rõ nghĩa" |
| 🟢 LOW | `IDIOM_RULE` dead code — export nhưng không dùng `ALL_RULES` | Comment DEPRECATED |

### 2. Fix capitalize [] system text (casing.ts)

**Vấn đề:** Text hệ thống/game trong `[...]` viết thường đầu dòng, VD: `[tỷ lệ chuyển đổi...]`

**Nguyên nhân:** `finalSweep()` escape `[...]` → process keyword → restore, nhưng sau restore không có bước capitalize.

**Fix:** Thêm step 3.5 trong `finalSweep()` — deterministic regex capitalize:
```typescript
cleaned = cleaned.replace(/\[([a-zà-ỹ\u00C0-\u024F])/gu, (_, firstChar) => {
    return '[' + firstChar.toLocaleUpperCase('vi-VN');
});
```

**Tại sao code level thay vì prompt?** Prompt-based → Flash ignore 30-40% cases. Code-level → 100% guaranteed.

### 3. Rule mới: [VIẾT HOA] + tách rule đại từ

- Thêm `[VIẾT HOA]` section trong `CORE_RULES` với Sentence case example rõ ràng cho `[]`
- Tách "VIẾT THƯỜNG trừ đầu câu" → **"GIỮA CÂU viết thường / ĐẦU CÂU BẮT BUỘC hoa"** để Flash không bỏ qua ngoại lệ

## Key Decisions

### Rule enforcement: Code > Prompt
Khi Flash consistently ignore 1 rule (~30%+ miss rate), **luôn ưu tiên enforce ở code level** (post-processing) thay vì chỉ dùng prompt. Prompt là guidance, code là guarantee.

### isBatch flag pattern
`buildSystemInstruction(customPrompt, glossary, isBatch)` — flag này loại bỏ rule "CẤM JSON/Giải thích" khỏi system instruction khi batch mode cần JSON output. **Mọi batch caller PHẢI truyền `isBatch=true`.**

### Sentence case cho system text []
Quy ước: Text `[...]` hệ thống/game dùng **Sentence case** (không phải Title Case). Enforce deterministic ở `finalSweep()` step 3.5.

## Files Modified
- `lib/gemini/batch/prompt.ts` — `isBatch=true`
- `lib/gemini/constants.ts` — 5 rule fixes + [VIẾT HOA] + tách đại từ rule
- `lib/gemini/text/casing.ts` — capitalize `[]` post-process (step 3.5)
- `CHANGELOG.full.md` / `CHANGELOG.md` — v2.10.1 entry
- `package.json` / `src-tauri/Cargo.toml` / `src-tauri/tauri.conf.json` — v2.10.1 bump

## Version
`v2.10.0` → `v2.10.1` (patch)
Commit: `0d948fd`
