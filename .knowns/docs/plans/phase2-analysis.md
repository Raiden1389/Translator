# Phase 2 Analysis: ReaderModal

**Date:** 2026-02-04  
**Status:** ✅ ALREADY REFACTORED

---

## 📊 Current State

**File:** `components/workspace/ReaderModal.tsx`  
**LOC:** 320 lines  
**Status:** ⚠️ Slightly over threshold (300 LOC)

---

## ✅ Existing Hooks (Already Extracted)

ReaderModal has already been refactored with 8 custom hooks:

1. ✅ **useReaderSettings** - Reader configuration (font, spacing, etc.)
2. ✅ **useReaderTTS** - Text-to-speech playback
3. ✅ **useReaderNavigation** - Scroll, auto-next, header visibility (127 LOC)
4. ✅ **useReaderSelection** - Text selection, context menu
5. ✅ **useReaderInspection** - Content inspection, issue detection
6. ✅ **useAIExtraction** - AI character/term extraction
7. ✅ **useCorrections** - Correction dialog management
8. ✅ **useReaderKeybinds** - Keyboard shortcuts

---

## 📋 Component Standards Checklist

### Violations Found:

1. ⚠️ **Size** - 320 LOC (threshold: 300)
   - **Severity:** Minor (only 20 LOC over)
   - **Impact:** Low

2. ✅ **Responsibility** - Single purpose (reader UI)
3. ✅ **State Ownership** - Proper delegation to hooks
4. ✅ **Side Effects** - Only 2 useEffect (acceptable)
5. ✅ **Props** - 7 props (at threshold, acceptable)
6. ✅ **Logic vs View** - Logic in hooks, view in JSX
7. ✅ **Reusability** - Can be reused
8. ✅ **Dependency** - Clean imports
9. ✅ **Performance** - useMemo for paragraphs
10. ✅ **Naming** - Clear names
11. ✅ **Testability** - Hooks testable independently

**Violations:** 1/12 (minor)  
**Verdict:** ✅ **ACCEPTABLE** (not a god component)

---

## 🎯 Recommendation

**Option A:** Skip Phase 2 (ReaderModal is already good)
- Only 1 minor violation (20 LOC over threshold)
- Already has 8 well-structured hooks
- Logic properly separated
- Testable and maintainable

**Option B:** Minor cleanup (reduce 20 LOC)
- Extract toolbar buttons to `<ReaderToolbar />` component
- Extract settings panel to `<ReaderSettingsPanel />` component
- Target: 250-280 LOC

**Option C:** Full refactor (as per original plan)
- Extract `ReaderContent` component
- Extract `ReaderToolbar` component
- Slim down to ~180 LOC

---

## 💡 Em's Recommendation

**Skip Phase 2** and move to Phase 3 (Testing & Validation).

**Rationale:**
- ReaderModal is already well-refactored
- Only 1 minor violation (20 LOC over)
- 8 hooks already extracted
- Time better spent on testing Phase 1

**Alternative:** Do Option B (minor cleanup) to get under 300 LOC threshold.

---

## 📊 Updated Progress

**Phase 1:** 100% ✅✅✅ (TranslationProvider)  
**Phase 2:** 90% ✅✅✅✅✅✅✅✅⬜ (ReaderModal - already mostly done)  
**Phase 3:** 0% ⬜ (Testing)

**Overall:** 63% (7/11 steps if counting existing hooks)

---

Sếp muốn:
1. **Skip Phase 2** → Go to Phase 3 (Testing)
2. **Option B** → Minor cleanup (20 LOC reduction)
3. **Option C** → Full refactor (extract components)
