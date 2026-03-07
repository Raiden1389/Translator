# Raiden AI Translator — Changelog Archive: March 2026

---

## [2.9.2] - 2026-03-07

**Session**: Bridge Auto-Import v2 + Self-QA Scan + /changelog Workflow
**Objective**: Automate bridge import flow with polling/sentinel, add post-translation QA step, create reusable changelog workflow.

### Added
- Bridge Auto-Import v2 — poll outbox 2s, detect `done_*.json` sentinel, auto-import.
- `checkDoneSentinel()`, `pollJobProgress()`, `DoneSentinel`, `PollProgress` interfaces.
- `BridgePhase` type + phase state machine in orchestrator hook.
- `AutoImportTrigger` invisible component for auto-import glue.
- Real-time progress bar + phase UI in `AgBridgeDialog`.
- Self-QA Scan — Step 5 in `/dich`: re-read outbox, fix typos/spelling/glossary before done sentinel.
- `/changelog` workflow — 4-step flow, added to global_workflows.
- Done sentinel step (Step 7) in `/dich`.

### Changed
- `importOutbox()` accepts `expectedCount` for safe cleanup.
- `cleanupJobFiles()` removes `done_*.json`.
- `findOutboxFilesForJob()` exported.
- `useAntigravityOrchestrator` expanded with phase, progress, polling, triggerAutoImport.
- `/dich` steps renumbered (new Step 5 = Self-QA).

### Fixed
- Typo fixes batch Ch48-52: "đường xá"→"đường sá", "không thảo"→"không khéo".
- Self-QA blacklist hallucination — corrected to actual SKILL §3 items.

### Technical Notes
- **Polling vs Watcher**: Chose 2s polling for V1 simplicity. Tauri file watcher = V2 optimization.
- **Safe cleanup**: `cleanupJobFiles` only runs if imported count >= expected count.
- **Self-QA**: Scan-only step, no re-translation. Catches "mechanical" errors that Quality Gate misses.

### Files
| File | Change |
|------|--------|
| `lib/bridge/antigravity-bridge.ts` | polling + sentinel + safe cleanup |
| `components/workspace/hooks/useAntigravityOrchestrator.ts` | phase machine + auto-import |
| `components/workspace/chapter-list/bridge/AgBridgeDialog.tsx` | progress UI rewrite |
| `components/workspace/chapter-list/components/ChapterListDialogs.tsx` | AutoImportTrigger |
| `.agent/workflows/dich.md` | Self-QA step + done sentinel |
| `.agent/workflows/changelog.md` | NEW |
| `package.json` | v2.9.1 → v2.9.2 |
| `src-tauri/Cargo.toml` | v2.9.1 → v2.9.2 |
| `src-tauri/tauri.conf.json` | v2.9.1 → v2.9.2 |

---


## [2.9.0] - 2026-03-06

**Session**: Workflow-Embedded Translation Engine + Continuous Task Mode
**Objective**: Hardcode translation rules into `/dich` workflow for maximum adherence and fix truncation issues.

### Added
- Workflow-Embedded Rules — 10+ critical rules now live directly in `.agent/workflows/dich.md`.
- Continuous Task Mode — Batch chapters treated as one task to maintain stylistic consistency.
- Quality Gate Checklist — Mandatory pre-save validation for pronouns, blacklist, and formatting.

### Fixed
- Large Chapter Truncation — Fix "Expect double quote" JSON errors by optimizing `write_to_file`.
- Rule Adherence — Prioritize workflow-embedded rules over AI internal reasoning.

### Changed
- Refactored `/dich` command to be completely silent and batch-optimized.
- Simplified internal prompts to prevent segment-by-segment style re-analysis.

### Technical Notes
- **Root cause (truncation)**: `write_to_file` call was failing on very large chapter contents, causing incomplete JSON outputs.
- **Root cause (rule failure)**: Flash model sometimes ignored rules in `constants.ts` or `config.prompt` if context window was cluttered or prompt was too long.

### Files
| File | Change |
|------|--------|
| `.agent/workflows/dich.md` | Core translation logic overhaul |
| `package.json` | v2.8.0 -> v2.9.0 |
| `src-tauri/Cargo.toml` | v2.8.0 -> v2.9.0 |
| `src-tauri/tauri.conf.json` | v2.8.0 -> v2.9.0 |
| `CHANGELOG.full.md` | Session notes |

---

## [2.7.13] - 2026-03-04


**Session**: Fix NER save bug + Character delete + Bulk retranslate
**Objective**: Fix critical bugs and add UX improvements

### Fixed
- ReviewDialog `onSave` ignored edited data — renaming/deleting characters in review was discarded on save.
- `Cannot access 'J' before initialization` — top-level `import { invoke }` from `@tauri-apps/api/core` crashed Next.js SSR prerender. Reverted to lazy `await import()` inside `isTauri()` blocks.

### Added
- Delete button on Character Tab rows — trash icon appears on hover for quick character removal.
- "Dịch lại" (Retranslate) button in ChapterSelectionDock — bulk retranslate selected chapters with one click.
- `post-cleanup.ts` module — deduplicateConsecutiveParagraphs, normalizeQuoteStyles, scrubVietnameseAIChatter.
- `vitest.config.ts` + `__tests__/title-normalizer.test.ts` unit tests.

### Changed
- `finalSweep()` now integrates post-cleanup functions for cleaner output.
- Removed stale lint-report files, TranslationProvider backup, cleaned .gitignore.

### Technical Notes
- **Root cause (onSave)**: `ChapterListDialogs.tsx` line 166 wrapped `onSave` in `() => handleConfirmSaveAI(pendingCharacters, pendingTerms)` — arrow function ignored params from ReviewDialog
- **Root cause (build)**: `client.ts` had `import { invoke }` at top-level, Turbopack bundles it for SSR where `@tauri-apps/api/core` isn't available

### Files
| File | Change |
|------|--------|
| `CharacterRow.tsx` | Delete button (hover) |
| `CharacterTab.tsx` | Pass handleDelete |
| `ChapterSelectionDock.tsx` | Retranslate button |
| `ChapterList.tsx` | Bulk retranslate handler |
| `ChapterListDialogs.tsx` | Fix onSave |
| `contentProcessor.ts` | Export post-cleanup |
| `casing.ts` | Integrate post-cleanup in finalSweep |
| `post-cleanup.ts` | NEW module |
| `post-processor.ts` | Integrate post-cleanup |

---

## [2.7.12] - 2026-03-04

**Session**: Fix ReviewDialog re-render bug + TranslationProvider refactor
**Objective**: Fix NER data loss on re-render, decompose TranslationProvider

### Fixed
- ReviewDialog reset edits on parent re-render — `useRef` + `initialData` pattern.
- AI NER service edge cases in character extraction.

### Changed
- TranslationProvider V3 — extracted into orchestrator-only pattern (526→~230 LOC):
  - `useBatchOrchestrator.ts`, `useSingleOrchestrator.ts`, `glossary.service.ts`
  - `chapter-title-normalizer.ts`, `prepare-chapter-payload.ts`
- Purged 200+ unused skills from `.agent/skills/`.

### Files
| File | Change |
|------|--------|
| `TranslationProvider.v2.tsx` | 526→~230 LOC |
| `useBatchOrchestrator.ts` | NEW |
| `useSingleOrchestrator.ts` | NEW |
| `ReviewDialog.tsx` | Re-render fix |
| `glossary.service.ts` | NEW |
| `chapter-title-normalizer.ts` | NEW |
| `prepare-chapter-payload.ts` | NEW |
