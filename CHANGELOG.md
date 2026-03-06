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

## [2.7.6] - 2026-02-11

### Top Impact
- **[Sync]** Tunnel URL port appending bug (mobile couldn't connect).
- **[Mobile]** PWA manifest MIME type → Chrome install prompt now works.
- **[Mobile]** Missing PWA icons (192/512).
- **[Build]** Static export for `manifest.ts`.
- **[Sync]** Disabled auto-shutdown, enhanced CORS headers.

### Fixed
- **[Sync]** Tunnel URL port appending bug (mobile couldn't connect).
- **[Mobile]** PWA manifest MIME type → Chrome install prompt now works.
- **[Mobile]** Missing PWA icons (192/512).
- **[Build]** Static export for `manifest.ts`.
- **[Sync]** Disabled auto-shutdown, enhanced CORS headers.

## [2.7.5] - 2026-02-11

### Top Impact
- **[Translator]** Eliminated cross-chunk character contamination — AI no longer substitutes POV with minor chars during concurrent translation.
- **[Translator]** Double-layer glossary isolation prevents "Ghost Characters" leaking across batch chapters.
- **[Translator]** Main character auto-tagged `(Main)` in prompt for priority.
- **[Translator]** Glossary moved to end of system instruction for max saliency.

### Fixed
- **[Translator]** Eliminated cross-chunk character contamination — AI no longer substitutes POV with minor chars during concurrent translation.
- **[Translator]** Double-layer glossary isolation prevents "Ghost Characters" leaking across batch chapters.
- **[Translator]** Main character auto-tagged `(Main)` in prompt for priority.
- **[Translator]** Glossary moved to end of system instruction for max saliency.

## [2.7.4] - 2026-02-11

### Top Impact
- **[Translator]** Race condition: `sharedGlossary` shared by reference → `structuredClone()` + `Object.freeze()`.
- **[Translator]** Title normalization: auto-fix ALL CAPS and Title Case.
- **[UI]** Retranslate button now reloads fresh chapters from DB.
- **[Translator]** CORE_RULES: explicit prohibition of Title Case and ALL CAPS in titles.

### Changed
- **[Translator]** CORE_RULES: explicit prohibition of Title Case and ALL CAPS in titles.

### Fixed
- **[Translator]** Race condition: `sharedGlossary` shared by reference → `structuredClone()` + `Object.freeze()`.
- **[Translator]** Title normalization: auto-fix ALL CAPS and Title Case.
- **[UI]** Retranslate button now reloads fresh chapters from DB.
