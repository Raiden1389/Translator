## [2.15.2] - 2026-04-26

### Top Impact
- **[Safety]** Soft-retry mechanism for PROHIBITED_CONTENT blocks — wraps system instruction with Vietnamese academic framing to bypass input-level false positives.
- **[Safety]** Full safety ratings now embedded directly in error messages (PromptRatings, CandRatings, response keys) — visible in UI overlay without DevTools.
- **[Utils]** `strip-boilerplate.ts` — shared module with 15+ regex patterns to strip Chinese web novel navigation, UI controls, genre tags, disclaimers, page-break prompts, and site watermarks.
- **[Service]** `clean.service.ts` — bulk scan/clean boilerplate from all chapters in a workspace with progress tracking.
- **[UI]** ✂️ "Xóa rác web" button in Action Hub — one-click bulk clean boilerplate from `content_original` in database.

### Added
- **[Safety]** Soft-retry mechanism for PROHIBITED_CONTENT blocks — wraps system instruction with Vietnamese academic framing to bypass input-level false positives.
- **[Safety]** Full safety ratings now embedded directly in error messages (PromptRatings, CandRatings, response keys) — visible in UI overlay without DevTools.
- **[Utils]** `strip-boilerplate.ts` — shared module with 15+ regex patterns to strip Chinese web novel navigation, UI controls, genre tags, disclaimers, page-break prompts, and site watermarks.
- **[Service]** `clean.service.ts` — bulk scan/clean boilerplate from all chapters in a workspace with progress tracking.
- **[UI]** ✂️ "Xóa rác web" button in Action Hub — one-click bulk clean boilerplate from `content_original` in database.

### Changed
- `lib/utils/strip-boilerplate.ts` — NEW: shared boilerplate stripping module
- `lib/services/clean.service.ts` — NEW: bulk workspace clean service
- `lib/gemini/translate.ts` — boilerplate strip + safety soft-retry + diagnostic embedding
- `lib/gemini/client.ts` — type cast fix + raw response debug logging
- `lib/gemini/adaptive-tokens.ts` — finishReason UNKNOWN fix
- `components/workspace/shared/ChapterListHeader.tsx` — ✂️ clean button

### Fixed
- **[Safety]** `adaptive-tokens.ts` — empty candidate responses now correctly report `finishReason: "UNKNOWN"` instead of falsely masking as `"STOP"`.
- **[Build]** `client.ts` — fixed TypeScript type error where `rawResponse` (typed `unknown`) was accessed without proper `Record<string, unknown>` cast.
- **[Safety]** Reverted safety settings to `BLOCK_NONE` for 4 core categories; removed `HARM_CATEGORY_CIVIC_INTEGRITY` which may cause API rejection in Gemini 2.5 Flash.

## [2.15.1] - 2026-04-25

### Top Impact
- **[Bridge]** Missing-chapter re-export is now wired from the Bridge dialog to `exportMissingOnly()`, preserving glossary, corrections, prompt, and temperature from the original export context.
- **[Translator]** `chinese-vietnamese-translator` now includes Translation Mode, Convert Kill List, Before Output Rewrite Pass, and 10 grounded Chinese→Vietnamese few-shot examples.
- **[Workflow]** `/dich` Self-QA now explicitly checks Convert Kill List patterns and records hard/soft findings.
- **[Bridge]** `pollJobProgress()` now treats `done_{jobId}.json` as the only completion signal. Outbox count is progress only, preventing premature import before QA is written.
- **[Bridge]** Outbox discovery and cleanup now use exact filename matching instead of broad `startsWith()` checks.

### Added
- **[Bridge]** Missing-chapter re-export is now wired from the Bridge dialog to `exportMissingOnly()`, preserving glossary, corrections, prompt, and temperature from the original export context.
- **[Translator]** `chinese-vietnamese-translator` now includes Translation Mode, Convert Kill List, Before Output Rewrite Pass, and 10 grounded Chinese→Vietnamese few-shot examples.
- **[Workflow]** `/dich` Self-QA now explicitly checks Convert Kill List patterns and records hard/soft findings.

### Changed
- **[Bridge]** `pollJobProgress()` now treats `done_{jobId}.json` as the only completion signal. Outbox count is progress only, preventing premature import before QA is written.
- **[Bridge]** Outbox discovery and cleanup now use exact filename matching instead of broad `startsWith()` checks.
- **[Bridge]** Partial `done` sentinel chapter lists are surfaced to the orchestrator so partial jobs can import and report missing chapters.
- **[Workflow]** `/dich` now requires Translation Mode → Few-Shot internalization → Before Output Rewrite Pass → Quality Gate before writing every outbox file.
- **[Build]** Version bumped to `2.15.1` across `package.json`, `package-lock.json`, `tauri.conf.json`, `tauri.fast.conf.json`, `Cargo.toml`, and `Cargo.lock`.
- `.agent/workflows/dich.md` — restored bridge contract + quality-over-token translation flow

### Fixed
- **[Bridge]** Early auto-import race: the app could import as soon as all `out_*.json` files appeared, skipping `qa_{jobId}.json` and losing QA hard fixes.
- **[Bridge]** Workspace safety: flat outbox imports now verify `chapter.workspaceId === currentWorkspaceId` before updating DB records.
- **[Bridge]** Missing detection: `exportedOrders` is now populated in the Antigravity export path, so missing chapters are detected correctly.
- **[Bridge]** QA hard fixes now apply only to chapters that actually imported and passed workspace validation.
- **[Workflow]** Restored full `/dich` bridge contract after regression to an incomplete short prompt that omitted JSON contract, QA report, and done sentinel requirements.

## [2.15.0] - 2026-04-21

### Top Impact
- **[OAuth]** Browser Header Mimicry: Implemented `User-Agent` (Chrome/124) in both Rust and Frontend paths to reduce bot-detection surface.
- **[Observability]** Enhanced 429 Logging: Processing overlay now explicitly reports "🚨 429 Rate Limited!" when Google triggers throttling.
- **[Gemini]** Proper Name Protection: Updated system prompt and loosed normalization regex (`TITLE_CASE_RE`) to ensure character names (e.g., "Dương Quân Bác") are NOT lowercased in chapter titles.
- **[OAuth]** Precise Wait Times: `RateLimiter` now returns exact remaining milliseconds in the current window instead of a hardcoded 60s delay.
- **[OAuth]** Migration Stale Counters: Fixed a bug in `resetExpiredCounters` where missing window start timestamps in legacy data caused permanent request blocking until a manual cache clear.

### Added
- **[OAuth]** Browser Header Mimicry: Implemented `User-Agent` (Chrome/124) in both Rust and Frontend paths to reduce bot-detection surface.
- **[Observability]** Enhanced 429 Logging: Processing overlay now explicitly reports "🚨 429 Rate Limited!" when Google triggers throttling.

### Changed
- **[Gemini]** Proper Name Protection: Updated system prompt and loosed normalization regex (`TITLE_CASE_RE`) to ensure character names (e.g., "Dương Quân Bác") are NOT lowercased in chapter titles.
- **[OAuth]** Precise Wait Times: `RateLimiter` now returns exact remaining milliseconds in the current window instead of a hardcoded 60s delay.
- `src-tauri/src/gemini.rs` — HTTP error surfacing + User-Agent
- `lib/gemini/client.ts` — Auto-retry loop + 429/401 handling + User-Agent
- `lib/gemini/rate-limiter.ts` — Precise wait logic + migration reset fix
- `lib/gemini/constants.ts` — Prompt rule update for titles

### Fixed
- **[OAuth]** Migration Stale Counters: Fixed a bug in `resetExpiredCounters` where missing window start timestamps in legacy data caused permanent request blocking until a manual cache clear.
- **[Auth]** OAuth 429 Handling: Rust backend now correctly surfaces HTTP 429 status codes to the frontend orchestrator for retry processing.

## [2.14.0] - 2026-04-16

### Top Impact
- **[Gemini]** Native OAuth 2.0 flow via Tauri/Rust to bypass CORS "Failed to fetch" errors.
- **[Auth]** Combined `exchange_code_native` command for unified token + user info retrieval.
- **[UI]** Detailed OAuth indicators in Max Ping panel (Delay, Quota, Response Time).
- **[Performance]** Optimized `rate-limiter.ts` for Ultra subscribers: 3s delay → 0.3s.
- **[Performance]** RPM increased to 30; Burst cooldown reduced to 5s.

### Added
- **[Gemini]** Native OAuth 2.0 flow via Tauri/Rust to bypass CORS "Failed to fetch" errors.
- **[Auth]** Combined `exchange_code_native` command for unified token + user info retrieval.
- **[UI]** Detailed OAuth indicators in Max Ping panel (Delay, Quota, Response Time).

### Changed
- **[Performance]** Optimized `rate-limiter.ts` for Ultra subscribers: 3s delay → 0.3s.
- **[Performance]** RPM increased to 30; Burst cooldown reduced to 5s.

## [2.12.0] - 2026-03-28

### Top Impact
- **[Translator]** `XƯNG HÔ` Rule Expansion: Full 10 pairs of Chinese pronouns (我/你/他/她/它/我们/你们/他们/她们/它们) mapped to Vietnamese equivalents with context-aware flexibility (e.g., 她=Nàng/Cô ấy).
- **[AI]** `SOFT_WRAPPER_VERB_BLOCKLIST` — Danh sách chặn 50+ động từ/tính từ phổ biến để lọc rác cho Term Audit.
- **[AI]** Term Audit Filter: Strip trailing punctuation (,, ;, ., !, ?) khỏi các term trích xuất.
- **[AI]** Term Audit Extractor: Loại bỏ quantifiers (loạt/mấy/vài) và demonstratives (này/kia) tự động.
- **[Build]** `SYSTEM_VERSION` → `v3.4` (Core rules updated).

### Added
- **[Translator]** `XƯNG HÔ` Rule Expansion: Full 10 pairs of Chinese pronouns (我/你/他/她/它/我们/你们/他们/她们/它们) mapped to Vietnamese equivalents with context-aware flexibility (e.g., 她=Nàng/Cô ấy).
- **[AI]** `SOFT_WRAPPER_VERB_BLOCKLIST` — Danh sách chặn 50+ động từ/tính từ phổ biến để lọc rác cho Term Audit.
- **[AI]** Term Audit Filter: Strip trailing punctuation (,, ;, ., !, ?) khỏi các term trích xuất.
- **[AI]** Term Audit Extractor: Loại bỏ quantifiers (loạt/mấy/vài) và demonstratives (này/kia) tự động.

### Changed
- **[Build]** `SYSTEM_VERSION` → `v3.4` (Core rules updated).
- **[AI]** Term Audit Engine: Yield-to-main thread pattern during scan to prevent UI freeze on large chapter blocks.
- **[Build]** `package.json`, `tauri.conf.json` — 2.11.0 → 2.12.0.
- **Shelved Term Audit**: Tính năng hiện đang để **OFF** mặc định (`featureFlags.termAudit = false`) do extractor vẫn còn sinh noise với truyện hiện đại. Cần tuning theo genre trong tương lai.

### Fixed
- **[AI]** Term Audit extraction noise: Fixed "soft wrapper" over-detection by enforcing 1st content token check against blocklist.

## [2.11.0] - 2026-03-24

### Top Impact
- **[AI]** `term-audit.types.ts` — Types: `TermCluster`, `TermOccurrence`, `ClusterMode` (`auto`, `review`, `protected-related`), `TermAuditReport`, `TermFixResult`
- **[AI]** `term-audit.extraction.ts` — Anchor-first extractor: hard anchors (giả, sư, tông, môn, phái…) + soft wrappers (người, kẻ, tên) với validity guard
- **[AI]** `term-audit.normalization.ts` — NFC, ascii-fold, generic head stripping → stable `rootHint`
- **[AI]** `term-audit.clustering.ts` — Bucket-based greedy merge: score (edit-distance + shared-prefix + set-overlap) ≥ 0.72 = merge; Review Zone 0.60–0.71; canonical guard chống chain-merge
- **[AI]** `term-audit.autofix.ts` — Tạo CorrectionEntry → `sweepSingleRule()`; 3 guards: confirmed, variants ≥ 2, scanRunId match

### Added
- **[AI]** `term-audit.types.ts` — Types: `TermCluster`, `TermOccurrence`, `ClusterMode` (`auto`, `review`, `protected-related`), `TermAuditReport`, `TermFixResult`
- **[AI]** `term-audit.extraction.ts` — Anchor-first extractor: hard anchors (giả, sư, tông, môn, phái…) + soft wrappers (người, kẻ, tên) với validity guard
- **[AI]** `term-audit.normalization.ts` — NFC, ascii-fold, generic head stripping → stable `rootHint`
- **[AI]** `term-audit.clustering.ts` — Bucket-based greedy merge: score (edit-distance + shared-prefix + set-overlap) ≥ 0.72 = merge; Review Zone 0.60–0.71; canonical guard chống chain-merge
- **[AI]** `term-audit.autofix.ts` — Tạo CorrectionEntry → `sweepSingleRule()`; 3 guards: confirmed, variants ≥ 2, scanRunId match
- **[AI]** `term-audit.service.ts` — Orchestrator: extract → cluster → enrich (Glossary/Correction lookup)

### Changed
- **[Build]** `featureFlags.ts` — +`termAudit: false` (off-switch)
- **[UI]** `IntelligenceHub.tsx` — +ScanSearch icon, +TermAuditModule import, +termAudit ModuleType
- Anchor-first extraction tránh n-gram rác • No auto-merge ở Review Zone • scanRunId guard reset confirm khi rescan • Protected terms → chỉ show, không merge • Reuse sweepSingleRule từ corrections.service.ts
- `lib/featureFlags.ts`, `components/workspace/intelligence/IntelligenceHub.tsx`
- `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` — 2.10.1 → 2.11.0

## [2.10.1] - 2026-03-23

### Top Impact
- **[Translator]** Batch prompt gọi `buildSystemInstruction()` không truyền `isBatch=true` → "CẤM JSON" conflict với JSON output yêu cầu. Flash output không ổn định.
- **[Translator]** `CURRENCY_RULE`: 万→nghìn tệ SAI 10x. Sửa thành 万→vạn tệ (mười nghìn) + đầy đủ 千万, 亿.
- **[Translator]** `WESTERN_NAME_RULE` fallback "ghi chú" mâu thuẫn CẤM Hán tự + CẤM giải thích. Sửa: "giữ phiên âm Latin hóa, KHÔNG ghi chú".
- **[Translator]** `[HARD LIMIT]` ẩn chủ ngữ quá cứng → mờ nhân vật scene đông người. Nới thành "NÊN hạn chế, ĐƯỢC PHÉP nếu cần rõ nghĩa".
- **[Translator]** `IDIOM_RULE` dead code — export nhưng không dùng `ALL_RULES`. Comment DEPRECATED.

### Changed
- **[Translator]** Thêm rule `[VIẾT HOA]`: Sentence case cho text `[]` với ví dụ SAI/ĐÚNG.
- **[Translator]** `FLOW_RULE`: "Tuyệt đối không..." → "Ưu tiên tránh..., ĐƯỢC PHÉP nếu cần rõ nghĩa".
- `lib/gemini/batch/prompt.ts` — `isBatch=true`
- `lib/gemini/constants.ts` — 5 rule fixes + [VIẾT HOA]
- `lib/gemini/text/casing.ts` — capitalize `[]` post-process (step 3.5)

### Fixed
- **[Translator]** Batch prompt gọi `buildSystemInstruction()` không truyền `isBatch=true` → "CẤM JSON" conflict với JSON output yêu cầu. Flash output không ổn định.
- **[Translator]** `CURRENCY_RULE`: 万→nghìn tệ SAI 10x. Sửa thành 万→vạn tệ (mười nghìn) + đầy đủ 千万, 亿.
- **[Translator]** `WESTERN_NAME_RULE` fallback "ghi chú" mâu thuẫn CẤM Hán tự + CẤM giải thích. Sửa: "giữ phiên âm Latin hóa, KHÔNG ghi chú".
- **[Translator]** `[HARD LIMIT]` ẩn chủ ngữ quá cứng → mờ nhân vật scene đông người. Nới thành "NÊN hạn chế, ĐƯỢC PHÉP nếu cần rõ nghĩa".
- **[Translator]** `IDIOM_RULE` dead code — export nhưng không dùng `ALL_RULES`. Comment DEPRECATED.
- **[Translator]** Đại từ đầu câu viết thường (hắn/nàng/ngươi). Tách rule: "GIỮA CÂU viết thường / ĐẦU CÂU BẮT BUỘC hoa".

## [2.10.0] - 2026-03-22

### Top Impact
- **[Intelligence]** Name Consistency Audit — Full post-translation scanner detecting inconsistent character name translations (zero API cost, pure string processing + HanViet lookup).
- **[Intelligence]** `name-audit.extraction.ts` — Phase 1: Vietnamese + Chinese name extraction with paragraph alignment and cross-referencing via VietPhrase + HanViet repos.
- **[Intelligence]** `name-audit.clustering.ts` — Phase 2: Fuzzy name clustering using Chinese cross-refs first, then source ref matching, then Levenshtein distance.
- **[Intelligence]** `name-audit.autofix.ts` — Phase 4: Auto-fix engine creates Correction rules (Luyện Văn) + sweeps all translated chapters + saves undo snapshot.
- **[UI]** `NameAuditModule.tsx` — Main Intelligence Hub module with chapter range selector, scan progress bar, filter tabs (All/Inconsistent/Confirmed), similarity threshold slider.

### Added
- **[Intelligence]** Name Consistency Audit — Full post-translation scanner detecting inconsistent character name translations (zero API cost, pure string processing + HanViet lookup).
- **[Intelligence]** `name-audit.extraction.ts` — Phase 1: Vietnamese + Chinese name extraction with paragraph alignment and cross-referencing via VietPhrase + HanViet repos.
- **[Intelligence]** `name-audit.clustering.ts` — Phase 2: Fuzzy name clustering using Chinese cross-refs first, then source ref matching, then Levenshtein distance.
- **[Intelligence]** `name-audit.autofix.ts` — Phase 4: Auto-fix engine creates Correction rules (Luyện Văn) + sweeps all translated chapters + saves undo snapshot.
- **[UI]** `NameAuditModule.tsx` — Main Intelligence Hub module with chapter range selector, scan progress bar, filter tabs (All/Inconsistent/Confirmed), similarity threshold slider.
- **[UI]** `NameClusterCard.tsx` — Cluster card with proportional frequency bars, radio canonical selection, source ref look-back (VietPhrase + Chinese + Vietnamese), "Convert" chapter button.

### Changed
- **[Intelligence]** Refactored monolithic `name-audit.service.ts` into 4 modules: extraction, clustering, autofix, orchestrator.
- **[UI]** Intelligence Hub — added "Name Audit" tab with `Users` icon.
- `lib/services/name-audit.types.ts` — Shared types (SourceParagraphRef, NameCluster, NameVariant, NameAuditReport, NameFixSelection, NameFixResult)
- `lib/services/name-audit.extraction.ts` — NEW (Phase 1)
- `lib/services/name-audit.clustering.ts` — NEW (Phase 2) + ambiguity guard
- `lib/services/name-audit.autofix.ts` — NEW (Phase 4) + override logic + global snapshot

### Fixed
- **[Intelligence]** Dictionary cold-start — `SyllableRepository` and `VietPhraseRepository` not loaded before Name Audit scan/convert. Cold start returned raw Chinese text instead of HanViet/VietPhrase.
- **[Intelligence]** SourceRef ambiguity — paragraphs with multiple Chinese names caused false cluster merges. Now skipped when >1 name found.
- **[Intelligence]** Stale Correction rules — re-auditing with a different canonical silently skipped the new rule. Now updates existing rule when `to` differs.
- **[Intelligence]** Undo scope mismatch — snapshot was workspace-scoped but sweep was global. Snapshot now captures all translated chapters.
- **[Corrections]** `sweepSingleRule()` now also corrects `title_translated`, matching the main Luyện Văn flow and preventing "body fixed, title stale".
- **[UI]** Fix result label: "chương" → "lượt cập nhật" to avoid inflated count when 1 chapter is updated by multiple rules.
