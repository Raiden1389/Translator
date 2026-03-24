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

## [2.9.5] - 2026-03-20

### Top Impact
- **[Sync]** `pollAndApplyCloudCorrections()` — Desktop auto-polls cloud every 30s for corrections pushed from Mobile. Applies text replacements to chapters + saves as global correction rules.
- **[Sync]** Auto-poll hook in `CloudSyncButton` — polls on mount + every 30s, shows toast `📱 Nhận N cải chính từ Mobile (cloud)`.
- **[Sync]** Cloud correction flow now fully operational: Mobile `pushCorrectionsToCloud()` → R2 storage → Desktop `pollAndApplyCloudCorrections()` → toast. Previously, corrections could only sync via LAN (broken for HTTPS-hosted PWA due to mixed content block).
- `lib/sync/cloud-sync.ts` — `pollAndApplyCloudCorrections()`, `GLOBAL_WORKSPACE_ID` import
- `components/workspace/shared/CloudSyncButton.tsx` — auto-poll useEffect

### Added
- **[Sync]** `pollAndApplyCloudCorrections()` — Desktop auto-polls cloud every 30s for corrections pushed from Mobile. Applies text replacements to chapters + saves as global correction rules.
- **[Sync]** Auto-poll hook in `CloudSyncButton` — polls on mount + every 30s, shows toast `📱 Nhận N cải chính từ Mobile (cloud)`.

### Changed
- **[Sync]** Cloud correction flow now fully operational: Mobile `pushCorrectionsToCloud()` → R2 storage → Desktop `pollAndApplyCloudCorrections()` → toast. Previously, corrections could only sync via LAN (broken for HTTPS-hosted PWA due to mixed content block).
- `lib/sync/cloud-sync.ts` — `pollAndApplyCloudCorrections()`, `GLOBAL_WORKSPACE_ID` import
- `components/workspace/shared/CloudSyncButton.tsx` — auto-poll useEffect

## [2.9.4] - 2026-03-08

### Top Impact
- **[Bridge]** Auto-import not triggering — `pollJobProgress` now considers job done when outbox file count matches expected, not just when sentinel file exists.
- **[UI]** Toolbar icon hover inconsistency — all icons now use `icon-only` Button variant (no hover background), matching the Sync button style.
- **[UI]** Pagination scroll — changing pages now smooth-scrolls to the top of the chapter list.
- **[Bridge]** `reopenForImport()` — reopen Bridge dialog after closing to import pending outbox files.
- **[Bridge]** `findLatestOutboxInfo()` — returns metadata about the latest outbox job for dialog re-opening.

### Added
- **[Bridge]** `reopenForImport()` — reopen Bridge dialog after closing to import pending outbox files.
- **[Bridge]** `findLatestOutboxInfo()` — returns metadata about the latest outbox job for dialog re-opening.
- **[UI]** 📦 Import Bridge button in toolbar — one-click access to import pending Bridge translations.
- **[UI]** `icon-only` Button variant — no hover background, only color change on hover.
- **[Build]** `sccache` integration — shared compilation cache for Rust, survives `cargo clean`.
- **[Build]** Dev profile optimization — `[profile.dev.package."*"]` with `opt-level=1`, `debug=false`.

### Changed
- **[Build]** Tauri release profile tuned for speed: `opt-level=1`, `codegen-units=32`, `strip=true`, `panic=abort`.
- **[Build]** Incremental build time: **55s → 38s** (30% faster).
- `lib/bridge/antigravity-bridge.ts` — pollJobProgress fix + findLatestOutboxInfo
- `components/workspace/hooks/useAntigravityOrchestrator.ts` — reopenForImport
- `components/workspace/shared/ChapterListHeader.tsx` — Bridge Import button + icon-only variant
- `components/workspace/chapter-list/ChapterList.tsx` — pagination scroll-to-top

### Fixed
- **[Bridge]** Auto-import not triggering — `pollJobProgress` now considers job done when outbox file count matches expected, not just when sentinel file exists.
- **[UI]** Toolbar icon hover inconsistency — all icons now use `icon-only` Button variant (no hover background), matching the Sync button style.
- **[UI]** Pagination scroll — changing pages now smooth-scrolls to the top of the chapter list.

## [2.9.3] - 2026-03-07

### Top Impact
- **[CloudSync]** Bridge import now auto-pushes to cloud — previously Bridge flow returned early in `TranslationProvider`, skipping the cloud sync step entirely.
- **[CloudSync]** Cover image lost during delta sync — `pushDelta` was sending sparse workspace metadata (`{id, title, sourceLang, targetLang}` only), causing the worker to overwrite full metadata (including `cover`, `author`, `description`, `genre`) on merge. Now sends full metadata matching `pushWorkspace`.
- **[Bridge]** `/dich` workflow Step 4: Added `OVERRIDE` warning — config.prompt contains `CẤM JSON` (meant for App's internal AI flow), but Bridge Agent must always write JSON format. Explicit override prevents format confusion.
- **[Bridge]** 6 feature ideas analyzed and added to backlog: Missing Chapter Detection + Retry, Background Monitor, Preflight Check, One-click Export, History Log, Review Mode.

### Changed
- **[Bridge]** `/dich` workflow Step 4: Added `OVERRIDE` warning — config.prompt contains `CẤM JSON` (meant for App's internal AI flow), but Bridge Agent must always write JSON format. Explicit override prevents format confusion.
- **[Bridge]** 6 feature ideas analyzed and added to backlog: Missing Chapter Detection + Retry, Background Monitor, Preflight Check, One-click Export, History Log, Review Mode.

### Fixed
- **[CloudSync]** Bridge import now auto-pushes to cloud — previously Bridge flow returned early in `TranslationProvider`, skipping the cloud sync step entirely.
- **[CloudSync]** Cover image lost during delta sync — `pushDelta` was sending sparse workspace metadata (`{id, title, sourceLang, targetLang}` only), causing the worker to overwrite full metadata (including `cover`, `author`, `description`, `genre`) on merge. Now sends full metadata matching `pushWorkspace`.

## [2.9.2] - 2026-03-07

### Top Impact
- **[Bridge]** Auto-Import v2 — App polls outbox every 2s, detects `done_{jobId}.json` sentinel, auto-imports translated chapters.
- **[Bridge]** `checkDoneSentinel()` — detects agent completion signal file.
- **[Bridge]** `pollJobProgress()` — returns `{ completed, total, isDone }` for UI.
- **[Bridge]** `DoneSentinel`, `PollProgress` interfaces; `BridgePhase` type.
- **[Bridge]** `AutoImportTrigger` invisible component for auto-import glue.

### Added
- **[Bridge]** Auto-Import v2 — App polls outbox every 2s, detects `done_{jobId}.json` sentinel, auto-imports translated chapters.
- **[Bridge]** `checkDoneSentinel()` — detects agent completion signal file.
- **[Bridge]** `pollJobProgress()` — returns `{ completed, total, isDone }` for UI.
- **[Bridge]** `DoneSentinel`, `PollProgress` interfaces; `BridgePhase` type.
- **[Bridge]** `AutoImportTrigger` invisible component for auto-import glue.
- **[UI]** Real-time progress bar + phase-based state machine in `AgBridgeDialog` (waiting → translating → complete → importing → success).

### Changed
- **[Bridge]** `importOutbox()` accepts `expectedCount` for safe cleanup validation.
- **[Bridge]** `cleanupJobFiles()` also removes `done_*.json` sentinel files.
- **[Bridge]** `findOutboxFilesForJob()` now exported for polling use.
- **[Hook]** `useAntigravityOrchestrator` expanded with `phase`, `progress` state, polling `useEffect`, `triggerAutoImport` callback.
- **[Workflow]** `/dich` steps renumbered (old 5→6, old 6→7, new 5 = Self-QA).
- `lib/bridge/antigravity-bridge.ts` — polling + sentinel + safe cleanup

### Fixed
- **[Translator]** Typo fixes in batch Ch48-52: "đường xá"→"đường sá", "không thảo"→"không khéo", "chủng dự cảm"→"loại dự cảm".
- **[Workflow]** Self-QA blacklist checklist referenced wrong terms (hallucinated "huynh/đệ/tiểu thư") — corrected to actual SKILL §3 blacklist.

## [2.9.1] - 2026-03-06

### Top Impact
- **[Translator]** Ultra-lean Rules v3 — Added 10+ specific guardrails to combat typical translation engine hallucinations:
- **[Translator]** Silent Word Purge — Automated removal of redundant/repetitive words ("ngoài ra ngoài", "thầm lẩm bẩm").
- **[Workflow]** Refined `/dich` workflow to be even more aggressive in enforcing natural phrasing over literal conversion.
- **[Prompt]** Updated embedded translation rules with clear "SAI / ĐÚNG" examples for the AI.
- **[Translator]** "Ta ở đây" opening — Fixed common AI filler opening when no actual location is implied.

### Added
- **[Translator]** Ultra-lean Rules v3 — Added 10+ specific guardrails to combat typical translation engine hallucinations:
- **[Translator]** Silent Word Purge — Automated removal of redundant/repetitive words ("ngoài ra ngoài", "thầm lẩm bẩm").

### Changed
- **[Workflow]** Refined `/dich` workflow to be even more aggressive in enforcing natural phrasing over literal conversion.
- **[Prompt]** Updated embedded translation rules with clear "SAI / ĐÚNG" examples for the AI.
- `.agent/workflows/dich.md` — Rule set v3 expansion
- `bridge/out_*.json` — Applied new rules to Chapter 42-44 deliveries
- `lib/sync/cloud-sync.ts` — Gzip body: Blob → ArrayBuffer
- `raiden-sync/src/index.ts` — Buffer decompressed body before R2.put (deployed)

### Fixed
- **[Translator]** "Ta ở đây" opening — Fixed common AI filler opening when no actual location is implied.
- **[Translator]** Incorrect "Nhất" usage — Limited "nhất" to actual comparative contexts only.
- **[Sync]** Cloud push 500 for new novels — R2 rejected `DecompressionStream` output (unknown length). Worker now buffers decompressed body as string before `R2.put()`. Also fixed client-side gzip: `Blob` → `ArrayBuffer` for reliable `Content-Length`.
