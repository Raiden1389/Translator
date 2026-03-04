---
title: Session 2026-03-04 — NER Save Bug Fix + Character Delete + Bulk Retranslate
createdAt: '2026-03-04T05:10:42.858Z'
updatedAt: '2026-03-04T05:10:42.858Z'
tags:
  - bugfix
  - ux
  - v2.7.13
---
# Session 2026-03-04 — v2.7.13

## Objective
Fix critical bugs and add UX improvements to AI Translator.

## Completed Tasks
1. ✅ **Fix ReviewDialog onSave bug** — `ChapterListDialogs.tsx` was wrapping `onSave` in arrow function that ignored edited data. Fixed by passing `handleConfirmSaveAI` directly.
2. ✅ **Character delete button** — Added hover-to-show trash icon on `CharacterRow`. Exposed `handleDelete` from `useCharacterManagement` hook.
3. ✅ **Fix build crash** — `Cannot access 'J' before initialization` caused by top-level `import { invoke }` from `@tauri-apps/api/core` in `client.ts`. SSR can't load Tauri. Reverted to lazy `await import()` inside `isTauri()`.
4. ✅ **Bulk retranslate button** — Added "Dịch lại" button to `ChapterSelectionDock` with RefreshCw icon. Clears translations then triggers onTranslate.
5. ✅ **Post-cleanup module** — `lib/gemini/text/post-cleanup.ts` with deduplication, quote normalization, Vietnamese AI chatter scrubbing.

## Key Decisions
- **Tauri imports must be lazy** — Never use top-level `import { invoke }` from `@tauri-apps/api/core`. Always use `const { invoke } = await import(...)` inside `isTauri()` guard.
- **onSave callback pattern** — Never wrap ReviewDialog's onSave in arrow function that ignores params. Pass handler directly.

## Files Modified
- `components/workspace/characters/CharacterRow.tsx`
- `components/workspace/CharacterTab.tsx`
- `components/workspace/ChapterSelectionDock.tsx`
- `components/workspace/chapter-list/ChapterList.tsx`
- `components/workspace/chapter-list/components/ChapterListDialogs.tsx`
- `lib/gemini/contentProcessor.ts`
- `lib/gemini/text/casing.ts`
- `lib/gemini/text/post-cleanup.ts` (NEW)
- `lib/gemini/translation/post-processor.ts`
