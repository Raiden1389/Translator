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
