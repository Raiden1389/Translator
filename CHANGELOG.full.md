# Raiden AI Translator — Changelog

> **Full archive**: [`docs/changelog/archive-2026-02.md`](docs/changelog/archive-2026-02.md)
> Only the 5 most recent versions are shown here.

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
