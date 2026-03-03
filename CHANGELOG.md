## [2.7.12] - 2026-03-04 00:10

### Bug Fixes
- **[AI NER]** Fix bug sửa tên trong ReviewDialog bị reset về giá trị cũ khi save. Root cause: `useEffect` deps `[open, initialCharacters, initialTerms]` re-sync data mỗi khi parent re-render → mất hết chỉnh sửa. Fix: dùng `wasOpenRef` chỉ sync data khi dialog lần đầu mở (false→true transition).

## [2.7.11] - 2026-03-03 23:24

### Refactored
- **[Translator]** Refactor `TranslationProvider.v2.tsx` — **628 LOC → 195 LOC**. Extracted 5 new modules:
  - `chapter-title-normalizer.ts` — Title normalization (xóa duplicate prefix)
  - `prepare-chapter-payload.ts` — Clean HTML + prepend title
  - `glossary.service.ts` — Build shared glossary từ DB
  - `useBatchOrchestrator.ts` — Batch translation orchestration
  - `useSingleOrchestrator.ts` — Single chapter translation

### Bug Fixes
- **[Translator]** Fix "OOuroboros" double-letter bug — Thêm `\b` word boundary vào correction regex để tránh match substring bên trong từ đã sửa
- **[Translator]** Fix Heuristic scan bị cancel khi chuyển tab — Không abort scan on unmount nữa, scan chạy background, toast progress vẫn cập nhật
- **[Reader]** Fix text selection bị thiếu chữ khi bôi đen — Đổi `onSelect` → `onMouseUp` + thêm 10ms delay cho browser finalize selection

## [2.7.10] - 2026-02-25

### Top Impact
- **[Translator]** Auto-apply corrections on new translations — every chapter gets global corrections applied silently after translation completes.
- **[Translator]** `corrections.service.ts` — dedicated service layer with `applyCorrectionsText()`, `sweepSingleRule()`, `applyCorrectionsToChapter()`.
- **[UI]** "Tuning / Cải chính" tab → "Luyện Văn / Global Corrections" with better dark mode contrast.
- **[UI]** Apply button → "🔥 Luyện Văn — Áp dụng X quy tắc" (clearer global scope).
- **[Translator]** Add correction rule → auto-sweep ALL chapters silently (no toast spam).

### Added
- **[Translator]** Auto-apply corrections on new translations — every chapter gets global corrections applied silently after translation completes.
- **[Translator]** `corrections.service.ts` — dedicated service layer with `applyCorrectionsText()`, `sweepSingleRule()`, `applyCorrectionsToChapter()`.

### Changed
- **[UI]** "Tuning / Cải chính" tab → "Luyện Văn / Global Corrections" with better dark mode contrast.
- **[UI]** Apply button → "🔥 Luyện Văn — Áp dụng X quy tắc" (clearer global scope).
- **[Translator]** Add correction rule → auto-sweep ALL chapters silently (no toast spam).
- **[Translator]** 3 correction hooks refactored to thin UI adapters — zero inline correction logic.

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
