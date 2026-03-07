# Raiden AI Translator — Changelog

> **Full archive**: [`docs/changelog/archive-2026-02.md`](docs/changelog/archive-2026-02.md)
> Only the 5 most recent versions are shown here.

---

## [2.9.4] - 2026-03-08

**Top Impact**: Bridge Import UX fix • Toolbar icon cleanup • Tauri build 55s→38s • Pagination scroll-to-top

### Fixed
- **[Bridge]** Auto-import not triggering — `pollJobProgress` now considers job done when outbox file count matches expected, not just when sentinel file exists.
- **[UI]** Toolbar icon hover inconsistency — all icons now use `icon-only` Button variant (no hover background), matching the Sync button style.
- **[UI]** Pagination scroll — changing pages now smooth-scrolls to the top of the chapter list.

### Added
- **[Bridge]** `reopenForImport()` — reopen Bridge dialog after closing to import pending outbox files.
- **[Bridge]** `findLatestOutboxInfo()` — returns metadata about the latest outbox job for dialog re-opening.
- **[UI]** 📦 Import Bridge button in toolbar — one-click access to import pending Bridge translations.
- **[UI]** `icon-only` Button variant — no hover background, only color change on hover.
- **[Build]** `sccache` integration — shared compilation cache for Rust, survives `cargo clean`.
- **[Build]** Dev profile optimization — `[profile.dev.package."*"]` with `opt-level=1`, `debug=false`.
- **[Build]** `rust-analyzer.cargo.targetDir` separation — prevents lock conflicts with `tauri dev`/`bxf`.

### Changed
- **[Build]** Tauri release profile tuned for speed: `opt-level=1`, `codegen-units=32`, `strip=true`, `panic=abort`.
- **[Build]** Incremental build time: **55s → 38s** (30% faster).

### Files Modified
- `lib/bridge/antigravity-bridge.ts` — pollJobProgress fix + findLatestOutboxInfo
- `components/workspace/hooks/useAntigravityOrchestrator.ts` — reopenForImport
- `components/workspace/shared/ChapterListHeader.tsx` — Bridge Import button + icon-only variant
- `components/workspace/chapter-list/ChapterList.tsx` — pagination scroll-to-top
- `components/ui/button.tsx` — icon-only variant
- `src-tauri/Cargo.toml` — release + dev profile optimization
- `.vscode/settings.json` — rust-analyzer targetDir separation
- `~/.cargo/config.toml` — sccache global config

---

## [2.9.3] - 2026-03-07

**Top Impact**: Bridge → Cloud Sync auto-push • Cover image loss fix on delta push • /dich workflow hardening

### Fixed
- **[CloudSync]** Bridge import now auto-pushes to cloud — previously Bridge flow returned early in `TranslationProvider`, skipping the cloud sync step entirely.
- **[CloudSync]** Cover image lost during delta sync — `pushDelta` was sending sparse workspace metadata (`{id, title, sourceLang, targetLang}` only), causing the worker to overwrite full metadata (including `cover`, `author`, `description`, `genre`) on merge. Now sends full metadata matching `pushWorkspace`.

### Changed
- **[Bridge]** `/dich` workflow Step 4: Added `OVERRIDE` warning — config.prompt contains `CẤM JSON` (meant for App's internal AI flow), but Bridge Agent must always write JSON format. Explicit override prevents format confusion.
- **[Bridge]** 6 feature ideas analyzed and added to backlog: Missing Chapter Detection + Retry, Background Monitor, Preflight Check, One-click Export, History Log, Review Mode.

---

## [2.9.2] - 2026-03-07

**Top Impact**: Bridge Auto-Import v2 (poll + sentinel + safe cleanup) • Progress Polling UI • Self-QA Scan workflow step • /changelog workflow

### Added
- **[Bridge]** Auto-Import v2 — App polls outbox every 2s, detects `done_{jobId}.json` sentinel, auto-imports translated chapters.
- **[Bridge]** `checkDoneSentinel()` — detects agent completion signal file.
- **[Bridge]** `pollJobProgress()` — returns `{ completed, total, isDone }` for UI.
- **[Bridge]** `DoneSentinel`, `PollProgress` interfaces; `BridgePhase` type.
- **[Bridge]** `AutoImportTrigger` invisible component for auto-import glue.
- **[UI]** Real-time progress bar + phase-based state machine in `AgBridgeDialog` (waiting → translating → complete → importing → success).
- **[Workflow]** Self-QA Scan — New mandatory Step 5 in `/dich`: agent re-reads outbox files and fixes typos, spelling, Hán Việt sống, glossary inconsistencies before done sentinel.
- **[Workflow]** `/changelog` workflow — standalone 4-step flow (full → trim → release notes → archive), added to global_workflows for cross-project reuse.
- **[Workflow]** Done sentinel step (Step 7) — `done_{jobId}.json` written by agent after translation.

### Changed
- **[Bridge]** `importOutbox()` accepts `expectedCount` for safe cleanup validation.
- **[Bridge]** `cleanupJobFiles()` also removes `done_*.json` sentinel files.
- **[Bridge]** `findOutboxFilesForJob()` now exported for polling use.
- **[Hook]** `useAntigravityOrchestrator` expanded with `phase`, `progress` state, polling `useEffect`, `triggerAutoImport` callback.
- **[Workflow]** `/dich` steps renumbered (old 5→6, old 6→7, new 5 = Self-QA).
- `lib/bridge/antigravity-bridge.ts` — polling + sentinel + safe cleanup
- `components/workspace/hooks/useAntigravityOrchestrator.ts` — phase machine + auto-import
- `components/workspace/chapter-list/bridge/AgBridgeDialog.tsx` — progress UI rewrite
- `components/workspace/chapter-list/components/ChapterListDialogs.tsx` — AutoImportTrigger glue
- `.agent/workflows/dich.md` — Self-QA step + done sentinel step
- `.agent/workflows/changelog.md` — NEW (also copied to global_workflows)

### Fixed
- **[Translator]** Typo fixes in batch Ch48-52: "đường xá"→"đường sá", "không thảo"→"không khéo", "chủng dự cảm"→"loại dự cảm".
- **[Workflow]** Self-QA blacklist checklist referenced wrong terms (hallucinated "huynh/đệ/tiểu thư") — corrected to actual SKILL §3 blacklist.

---

## [2.9.1] - 2026-03-06

**Top Impact**: Ultra-lean Translation Rules v2/v3 • Anti-Literal & Logic Guardrails • Translation Quality Polish

### Added
- **[Translator]** Ultra-lean Rules v3 — Added 10+ specific guardrails to combat typical translation engine hallucinations:
  - Anti-Literal: "chia một chén canh" → natural Vietnamese "kiếm một phần/nhúng tay vào".
  - Han-Structure Ban: Replaced machine-like "danh từ + độ khó cao" with natural "việc này khó".
  - Logic Guardrail: Prevented spatially impossible phrases like "đậu ở bên trong và ngoài doanh trại".
  - POV Consistency: Banned "mình/của mình" in 3rd person narration/thoughts.
  - Collocation Fixer: Auto-corrected machine terms like "bàn chông" (bẫy chông), "trạng thái cơ thể" (thể chất/thể trạng).
- **[Translator]** Silent Word Purge — Automated removal of redundant/repetitive words ("ngoài ra ngoài", "thầm lẩm bẩm").

### Changed
- **[Workflow]** Refined `/dich` workflow to be even more aggressive in enforcing natural phrasing over literal conversion.
- **[Prompt]** Updated embedded translation rules with clear "SAI / ĐÚNG" examples for the AI.

### Fixed
- **[Translator]** "Ta ở đây" opening — Fixed common AI filler opening when no actual location is implied.
- **[Translator]** Incorrect "Nhất" usage — Limited "nhất" to actual comparative contexts only.
- **[Sync]** Cloud push 500 for new novels — R2 rejected `DecompressionStream` output (unknown length). Worker now buffers decompressed body as string before `R2.put()`. Also fixed client-side gzip: `Blob` → `ArrayBuffer` for reliable `Content-Length`.

### Files Modified
- `.agent/workflows/dich.md` — Rule set v3 expansion
- `bridge/out_*.json` — Applied new rules to Chapter 42-44 deliveries
- `lib/sync/cloud-sync.ts` — Gzip body: Blob → ArrayBuffer
- `raiden-sync/src/index.ts` — Buffer decompressed body before R2.put (deployed)

---

## [2.9.0] - 2026-03-06

**Top Impact**: New Workflow-Embedded Translation Engine • Continuous Task Context • Massive Rule Enforcement

### Added
- **[Translator]** Workflow-Embedded Rules — 10+ critical translation rules (pronouns, subjects, blacklist) now live directly in `.agent/workflows/dich.md` for zero-hallucination enforcement.
- **[Translator]** Continuous Task Mode — All chapters in a batch are treated as a single task, preventing style/terminology reset per chapter.
- **[Translator]** Quality Gate Checklist — Mandatory pre-save validation for pronouns, blacklist, and formatting.

### Fixed
- **[Translator]** Large Chapter Truncation — fixed "Expect double quote" JSON errors by optimizing the `write_to_file` pipeline for large chapter contents.
- **[Translator]** Rule Adherence — eliminated AI "over-thinking" by prioritizing embedded workflow rules over internal reasoning.

### Changed
- **[Workflow]** Refactored `/dich` command to be completely silent and batch-optimized.
- **[Prompt]** Simplified internal prompts to prevent AI from re-analyzing style per segment.

### Files Modified
- `.agent/workflows/dich.md` — Core translation logic overhaul
- `bridge/out_*.json` — Fixed truncation/formatting issues

---

## [2.7.13] - 2026-03-04


**Top Impact**: Fix NER save bug • Character delete button • Bulk retranslate • Build crash fix

### Fixed
- **[NER]** ReviewDialog `onSave` ignored edited data — renaming/deleting characters in review was discarded on save.
- **[Build]** `Cannot access 'J' before initialization` — top-level `import { invoke }` from `@tauri-apps/api/core` crashed Next.js SSR prerender. Reverted to lazy `await import()` inside `isTauri()` blocks.

### Added
- **[UI]** Delete button on Character Tab rows — trash icon appears on hover for quick character removal.
- **[UI]** "Dịch lại" (Retranslate) button in ChapterSelectionDock — bulk retranslate selected chapters with one click.
- **[Translator]** `post-cleanup.ts` module — deduplicateConsecutiveParagraphs, normalizeQuoteStyles, scrubVietnameseAIChatter.
- **[Test]** `vitest.config.ts` + `__tests__/title-normalizer.test.ts` unit tests.

### Changed
- **[Translator]** `finalSweep()` now integrates post-cleanup functions for cleaner output.
- **[Cleanup]** Removed stale lint-report files, TranslationProvider backup, cleaned .gitignore.

### Files Modified
- `components/workspace/characters/CharacterRow.tsx` — delete button
- `components/workspace/CharacterTab.tsx` — pass handleDelete
- `components/workspace/ChapterSelectionDock.tsx` — retranslate button
- `components/workspace/chapter-list/ChapterList.tsx` — bulk retranslate handler
- `components/workspace/chapter-list/components/ChapterListDialogs.tsx` — fix onSave
- `lib/gemini/contentProcessor.ts` — export post-cleanup
- `lib/gemini/text/casing.ts` — integrate post-cleanup in finalSweep
- `lib/gemini/text/post-cleanup.ts` — NEW module
- `lib/gemini/translation/post-processor.ts` — integrate post-cleanup

---

**Top Impact**: Luyện Văn auto-apply pipeline • Corrections service refactor (1 engine → 1 service → 3 thin hooks)

### Added
- **[Translator]** Auto-apply corrections on new translations — every chapter gets global corrections applied silently after translation completes.
- **[Translator]** `corrections.service.ts` — dedicated service layer with `applyCorrectionsText()`, `sweepSingleRule()`, `applyCorrectionsToChapter()`.

### Changed
- **[UI]** "Tuning / Cải chính" tab → "Luyện Văn / Global Corrections" with better dark mode contrast.
- **[UI]** Apply button → "🔥 Luyện Văn — Áp dụng X quy tắc" (clearer global scope).
- **[Translator]** Add correction rule → auto-sweep ALL chapters silently (no toast spam).
- **[Translator]** 3 correction hooks refactored to thin UI adapters — zero inline correction logic.

### Fixed
- **[NER]** ReviewDialog reset edits on parent re-render — `useRef` + `initialData` pattern to prevent data loss.
- **[NER]** AI NER service edge cases in character extraction.

### Changed
- **[Translator]** TranslationProvider V3 — extracted into orchestrator-only pattern:
  - `useBatchOrchestrator.ts` — batch translation logic
  - `useSingleOrchestrator.ts` — single chapter translation  
  - `glossary.service.ts` — shared glossary building
  - `chapter-title-normalizer.ts` — title normalization
  - `prepare-chapter-payload.ts` — content preparation
- **[Cleanup]** Purged 200+ unused skills from `.agent/skills/`.

### Files Modified
- `components/workspace/hooks/TranslationProvider.v2.tsx` — 526→~230 LOC
- `components/workspace/hooks/useBatchOrchestrator.ts` — NEW
- `components/workspace/hooks/useSingleOrchestrator.ts` — NEW
- `components/workspace/shared/ReviewDialog.tsx` — re-render fix
- `lib/services/glossary.service.ts` — NEW
- `lib/utils/chapter-title-normalizer.ts` — NEW
- `lib/utils/prepare-chapter-payload.ts` — NEW

---

## [2.7.9] - 2026-02-25

**Top Impact**: Western name auto-detection in translation • Global corrections pool (Luyện Văn)

### Added
- **[Translator]** `[TÊN TÂY]` rule — AI auto-detects Western names in Chinese (杰克→Jack, 迈克尔→Michael) and restores original English. Prevents "Kiệt Khắc" / "Mạch Khắc Nhĩ" errors.
- **[Translator]** Split `[PHÂN VAI]` guidance: Hán names → Hán Việt, Western names → English restore.

### Changed
- **[DB]** Corrections now use a single global pool (`__global__`) shared across all workspaces. Zero API cost, pure string replace.
- **[DB]** DB v106: Auto-migration moves all workspace-scoped corrections to global pool with deduplication.

### Migration
- Automatic on first app launch after update. Old per-workspace corrections are merged into one global pool.

---

## [2.7.8] - 2026-02-24

**Top Impact**: Crawler JSON import • Multi-workspace sync • Named tunnel (raidenhub.xyz)

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

---

## [2.7.6] - 2026-02-11

**Top Impact**: PWA sync fixes • Mobile install prompt • CORS enhancement

### Fixed
- **[Sync]** Tunnel URL port appending bug (mobile couldn't connect).
- **[Mobile]** PWA manifest MIME type → Chrome install prompt now works.
- **[Mobile]** Missing PWA icons (192/512).
- **[Build]** Static export for `manifest.ts`.
- **[Sync]** Disabled auto-shutdown, enhanced CORS headers.

---

## [2.7.5] - 2026-02-11

**Top Impact**: Character hijacking fix (C³ Purge) • Main character semantic tagging

### Fixed
- **[Translator]** Eliminated cross-chunk character contamination — AI no longer substitutes POV with minor chars during concurrent translation.
- **[Translator]** Double-layer glossary isolation prevents "Ghost Characters" leaking across batch chapters.
- **[Translator]** Main character auto-tagged `(Main)` in prompt for priority.
- **[Translator]** Glossary moved to end of system instruction for max saliency.

---

## [2.7.4] - 2026-02-11

**Top Impact**: Race condition fix • Title normalization • Retranslate button fix

### Fixed
- **[Translator]** Race condition: `sharedGlossary` shared by reference → `structuredClone()` + `Object.freeze()`.
- **[Translator]** Title normalization: auto-fix ALL CAPS and Title Case.
- **[UI]** Retranslate button now reloads fresh chapters from DB.

### Changed
- **[Translator]** CORE_RULES: explicit prohibition of Title Case and ALL CAPS in titles.
