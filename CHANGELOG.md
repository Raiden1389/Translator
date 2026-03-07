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

## [2.9.0] - 2026-03-06

### Top Impact
- **[Translator]** Workflow-Embedded Rules — 10+ critical translation rules (pronouns, subjects, blacklist) now live directly in `.agent/workflows/dich.md` for zero-hallucination enforcement.
- **[Translator]** Continuous Task Mode — All chapters in a batch are treated as a single task, preventing style/terminology reset per chapter.
- **[Translator]** Quality Gate Checklist — Mandatory pre-save validation for pronouns, blacklist, and formatting.
- **[Translator]** Large Chapter Truncation — fixed "Expect double quote" JSON errors by optimizing the `write_to_file` pipeline for large chapter contents.
- **[Translator]** Rule Adherence — eliminated AI "over-thinking" by prioritizing embedded workflow rules over internal reasoning.

### Added
- **[Translator]** Workflow-Embedded Rules — 10+ critical translation rules (pronouns, subjects, blacklist) now live directly in `.agent/workflows/dich.md` for zero-hallucination enforcement.
- **[Translator]** Continuous Task Mode — All chapters in a batch are treated as a single task, preventing style/terminology reset per chapter.
- **[Translator]** Quality Gate Checklist — Mandatory pre-save validation for pronouns, blacklist, and formatting.

### Changed
- **[Workflow]** Refactored `/dich` command to be completely silent and batch-optimized.
- **[Prompt]** Simplified internal prompts to prevent AI from re-analyzing style per segment.
- `.agent/workflows/dich.md` — Core translation logic overhaul
- `bridge/out_*.json` — Fixed truncation/formatting issues

### Fixed
- **[Translator]** Large Chapter Truncation — fixed "Expect double quote" JSON errors by optimizing the `write_to_file` pipeline for large chapter contents.
- **[Translator]** Rule Adherence — eliminated AI "over-thinking" by prioritizing embedded workflow rules over internal reasoning.

## [2.7.13] - 2026-03-04

### Top Impact
- **[NER]** ReviewDialog `onSave` ignored edited data — renaming/deleting characters in review was discarded on save.
- **[Build]** `Cannot access 'J' before initialization` — top-level `import { invoke }` from `@tauri-apps/api/core` crashed Next.js SSR prerender. Reverted to lazy `await import()` inside `isTauri()` blocks.
- **[UI]** Delete button on Character Tab rows — trash icon appears on hover for quick character removal.
- **[UI]** "Dịch lại" (Retranslate) button in ChapterSelectionDock — bulk retranslate selected chapters with one click.
- **[Translator]** `post-cleanup.ts` module — deduplicateConsecutiveParagraphs, normalizeQuoteStyles, scrubVietnameseAIChatter.

### Added
- **[UI]** Delete button on Character Tab rows — trash icon appears on hover for quick character removal.
- **[UI]** "Dịch lại" (Retranslate) button in ChapterSelectionDock — bulk retranslate selected chapters with one click.
- **[Translator]** `post-cleanup.ts` module — deduplicateConsecutiveParagraphs, normalizeQuoteStyles, scrubVietnameseAIChatter.
- **[Test]** `vitest.config.ts` + `__tests__/title-normalizer.test.ts` unit tests.
- **[Translator]** Auto-apply corrections on new translations — every chapter gets global corrections applied silently after translation completes.
- **[Translator]** `corrections.service.ts` — dedicated service layer with `applyCorrectionsText()`, `sweepSingleRule()`, `applyCorrectionsToChapter()`.

### Changed
- **[Translator]** `finalSweep()` now integrates post-cleanup functions for cleaner output.
- **[Cleanup]** Removed stale lint-report files, TranslationProvider backup, cleaned .gitignore.
- `components/workspace/characters/CharacterRow.tsx` — delete button
- `components/workspace/CharacterTab.tsx` — pass handleDelete
- `components/workspace/ChapterSelectionDock.tsx` — retranslate button
- `components/workspace/chapter-list/ChapterList.tsx` — bulk retranslate handler

### Fixed
- **[NER]** ReviewDialog `onSave` ignored edited data — renaming/deleting characters in review was discarded on save.
- **[Build]** `Cannot access 'J' before initialization` — top-level `import { invoke }` from `@tauri-apps/api/core` crashed Next.js SSR prerender. Reverted to lazy `await import()` inside `isTauri()` blocks.
- **[NER]** ReviewDialog reset edits on parent re-render — `useRef` + `initialData` pattern to prevent data loss.
- **[NER]** AI NER service edge cases in character extraction.

## [2.7.9] - 2026-02-25

### Top Impact
- **[Translator]** `[TÊN TÂY]` rule — AI auto-detects Western names in Chinese (杰克→Jack, 迈克尔→Michael) and restores original English. Prevents "Kiệt Khắc" / "Mạch Khắc Nhĩ" errors.
- **[Translator]** Split `[PHÂN VAI]` guidance: Hán names → Hán Việt, Western names → English restore.
- **[DB]** Corrections now use a single global pool (`__global__`) shared across all workspaces. Zero API cost, pure string replace.
- **[DB]** DB v106: Auto-migration moves all workspace-scoped corrections to global pool with deduplication.
- Automatic on first app launch after update. Old per-workspace corrections are merged into one global pool.

### Added
- **[Translator]** `[TÊN TÂY]` rule — AI auto-detects Western names in Chinese (杰克→Jack, 迈克尔→Michael) and restores original English. Prevents "Kiệt Khắc" / "Mạch Khắc Nhĩ" errors.
- **[Translator]** Split `[PHÂN VAI]` guidance: Hán names → Hán Việt, Western names → English restore.

### Changed
- **[DB]** Corrections now use a single global pool (`__global__`) shared across all workspaces. Zero API cost, pure string replace.
- **[DB]** DB v106: Auto-migration moves all workspace-scoped corrections to global pool with deduplication.

### Breaking/Migration
- Automatic on first app launch after update. Old per-workspace corrections are merged into one global pool.

## [2.7.8] - 2026-02-24

### Top Impact
- **[Translator]** JSON import from Crawler app (`{ metadata, chapters }` format).
- **[Translator]** `appendChaptersFromJSON()` — append new chapters without overwriting translations.
- **[Translator]** `UpdateFromJSONCard` component in Settings tab.
- **[Sync]** Multi-workspace sync protocol — sync ALL workspaces at once.
- **[Sync]** Named tunnel `raidenhub.xyz` (fixed domain, PWA installable).

### Added
- **[Translator]** JSON import from Crawler app (`{ metadata, chapters }` format).
- **[Translator]** `appendChaptersFromJSON()` — append new chapters without overwriting translations.
- **[Translator]** `UpdateFromJSONCard` component in Settings tab.
- **[Sync]** Multi-workspace sync protocol — sync ALL workspaces at once.
- **[Sync]** Named tunnel `raidenhub.xyz` (fixed domain, PWA installable).
- **[Mobile]** Update button with NEW badge in reader menu.

### Fixed
- **[Sync]** Corrections from mobile routed to wrong workspace.
- **[Mobile]** Overscroll pull-to-refresh in Reader.

### Perf
- **[Build]** Rust module extraction (lib.rs 375→58 LOC), dependency trim, build 167s→32s.
