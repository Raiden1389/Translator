# Raiden AI Translator — Changelog

> **Full archive**: [`docs/changelog/archive-2026-02.md`](docs/changelog/archive-2026-02.md)
> Only the 5 most recent versions are shown here.

---

## [2.7.10] - 2026-02-25

**Top Impact**: Luyện Văn auto-apply pipeline • Corrections service refactor (1 engine → 1 service → 3 thin hooks)

### Added
- **[Translator]** Auto-apply corrections on new translations — every chapter gets global corrections applied silently after translation completes.
- **[Translator]** `corrections.service.ts` — dedicated service layer with `applyCorrectionsText()`, `sweepSingleRule()`, `applyCorrectionsToChapter()`.

### Changed
- **[UI]** "Tuning / Cải chính" tab → "Luyện Văn / Global Corrections" with better dark mode contrast.
- **[UI]** Apply button → "🔥 Luyện Văn — Áp dụng X quy tắc" (clearer global scope).
- **[Translator]** Add correction rule → auto-sweep ALL chapters silently (no toast spam).
- **[Translator]** 3 correction hooks refactored to thin UI adapters — zero inline correction logic.

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
