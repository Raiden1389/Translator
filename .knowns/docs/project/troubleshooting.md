---
title: Troubleshooting Guide
createdAt: '2026-02-04T12:59:00.000Z'
updatedAt: '2026-02-04T12:59:00.000Z'
description: Common issues and solutions
tags: [troubleshooting, bugs, fixes]
---

# 🔧 Troubleshooting Guide

> **Purpose:** Document all major bugs encountered, root causes, and solutions for future reference.

---

## 🚨 Critical Issues

### 1. **Max Token Count Error - Translation Fails Silently**
**Date:** 2026-02-04  
**Severity:** 🔴 Critical  
**Symptom:**
- Translation returns empty result
- No error message shown
- Console shows: `"finishReason": "MAX_TOKENS"`

**Root Cause:**
- `maxOutputTokens` set too low (e.g., 2000 tokens)
- Gemini 2.5 Flash hits limit before completing translation
- System doesn't handle `MAX_TOKENS` finish reason

**Solution:**
```typescript
// lib/gemini/adaptive-tokens.ts
const ADAPTIVE_MULTIPLIER = 4.0; // Increased from 2.5x

// Always ensure minimum safety margin
const safeMax = Math.max(
  Math.ceil(inputLength * ADAPTIVE_MULTIPLIER),
  4000 // Minimum threshold
);
```

**Prevention:**
- Monitor `finishReason` in API response
- Add explicit error handling for `MAX_TOKENS`
- Log warning when approaching token limits

**Files Changed:**
- `lib/gemini/adaptive-tokens.ts`
- `lib/gemini/translate.ts`

---

### 2. **Thinking Tokens Not Counted - Cost Underestimated**
**Date:** 2026-02-04  
**Severity:** 🟡 Medium  
**Symptom:**
- Actual API cost higher than displayed cost
- Token breakdown missing "thinking tokens"

**Root Cause:**
- Gemini 2.5 Flash uses thinking tokens (extended reasoning)
- Old code only counted `promptTokenCount` + `candidatesTokenCount`
- Thinking tokens stored in `usageMetadata.cachedContentTokenCount`

**Solution:**
```typescript
// lib/gemini/translate.ts
const thinkingTokens = response.usageMetadata?.cachedContentTokenCount || 0;

return {
  tokens: {
    input: promptTokenCount,
    output: candidatesTokenCount,
    thinking: thinkingTokens,
    total: promptTokenCount + candidatesTokenCount + thinkingTokens
  }
};
```

**Files Changed:**
- `lib/gemini/translate.ts`
- `lib/gemini/types.ts`
- `components/workspace/TranslationProvider.tsx`

---

### 3. **Translation Cache Causing Stale Results**
**Date:** 2026-02-04  
**Severity:** 🟡 Medium  
**Symptom:**
- Re-translating same chapter returns old result
- Changes to system instructions not reflected
- Hard to debug translation quality issues

**Root Cause:**
- In-memory cache (`translationCache`) persists across sessions
- Cache key only based on chapter ID, not content hash
- No cache invalidation on system instruction changes

**Solution:**
- **REMOVED** translation cache entirely
- Rely on Gemini's built-in caching (context caching)
- Each translation is fresh and debuggable

**Files Changed:**
- `lib/gemini/translate.ts` (removed cache logic)
- `components/workspace/ChapterList.tsx` (removed clear cache button)

---

## 🐛 UI/UX Issues

### 4. **Console Log Spam During Translation**
**Date:** 2026-02-04  
**Severity:** 🟢 Low  
**Symptom:**
- 10+ console logs per chapter translation
- Hard to debug real issues
- Performance impact on large batches

**Solution:**
- Removed debug logs from production code
- Keep only essential error logs
- Use structured logging for important events

**Files Changed:**
- `lib/gemini/translate.ts`
- `components/workspace/TranslationProvider.tsx`

---

### 5. **Toast Notification Spam**
**Date:** 2026-02-04  
**Severity:** 🟢 Low  
**Symptom:**
- 3-5 toasts per chapter (start, progress, complete, cost)
- UI feels cluttered
- User can't dismiss fast enough

**Solution:**
- Consolidated to **1 final toast** per chapter
- Show cost and stats in single message
- Use Max Ping Progress overlay for real-time updates

**Files Changed:**
- `components/workspace/TranslationProvider.tsx`

---

## 🔍 Type Errors

### 6. **Token Stats Type Mismatch**
**Date:** 2026-02-04  
**Severity:** 🟡 Medium  
**Symptom:**
- TypeScript error: `Property 'content' does not exist on type 'tokens'`
- Build fails

**Root Cause:**
- Old token structure had `content` and `system` fields
- New structure only has `input`, `output`, `thinking`, `total`
- Components still referencing old fields

**Solution:**
```typescript
// Old structure (removed)
tokens: {
  content: number;
  system: number;
  input: number;
  output: number;
}

// New structure
tokens: {
  input: number;
  output: number;
  thinking: number;
  total: number;
}
```

**Files Changed:**
- `components/workspace/ChapterRow.tsx`
- `components/workspace/TranslationProgressOverlay.tsx`

---

### 7. **clearChapterTranslation Import Error**
**Date:** 2026-02-04  
**Severity:** 🔴 Critical  
**Symptom:**
- Build error: `Module '"@/lib/db"' has no exported member 'clearChapterTranslation'`

**Root Cause:**
- Function renamed from `clearChapterTranslation` to `clearTranslation`
- Import not updated in `ReaderModal.tsx`

**Solution:**
```typescript
// Before
import { clearChapterTranslation } from "@/lib/db";

// After
import { clearTranslation } from "@/lib/db";
```

**Files Changed:**
- `components/workspace/ReaderModal.tsx`

---

## 🏗️ Architecture Decisions

### 8. **Why We Removed Translation Cache**
**Date:** 2026-02-04  
**Rationale:**
1. **Debugging Difficulty:** Hard to know if seeing cached or fresh result
2. **Stale Data Risk:** System instruction changes not reflected
3. **Gemini Has Caching:** Context caching already handles performance
4. **Simplicity:** Less code to maintain, fewer edge cases

**Trade-off:**
- ❌ Slightly slower re-translation (rare use case)
- ✅ Always fresh results
- ✅ Easier debugging
- ✅ Simpler codebase

---

### 9. **Why 4.0x Token Multiplier?**
**Date:** 2026-02-04  
**Analysis:**
- Chinese → Vietnamese expansion: ~1.2-1.5x
- Thinking tokens overhead: ~0.5-1.0x
- Safety margin: ~1.5x
- **Total: 4.0x** provides comfortable buffer

**Evidence:**
- 800-char input → 3200 tokens needed
- Old 2.5x multiplier → 2000 tokens → **FAIL**
- New 4.0x multiplier → 3200 tokens → **SUCCESS**

---

## 📊 Performance Optimizations

### 10. **System Instruction Optimization**
**Date:** 2026-02-04  
**Before:** ~800 tokens  
**After:** ~600 tokens  
**Savings:** 25% reduction

**Changes:**
- Removed redundant examples
- Compacted TITLE_RULE and IDIOM_RULE
- Merged similar instructions

**Files Changed:**
- `lib/gemini/constants.ts`
- `lib/gemini/rules/assembler.ts`

---

## 🛡️ Best Practices Learned

### General Debugging
1. **Always check `finishReason`** in Gemini responses
2. **Log token counts** for cost tracking
3. **Remove caches** when debugging quality issues
4. **Use TypeScript strictly** - catch errors at compile time

### Token Management
1. **Be generous with maxOutputTokens** - better safe than sorry
2. **Monitor thinking tokens** - they add up fast
3. **Test with real content** - synthetic tests miss edge cases

### UI/UX
1. **Less is more** - consolidate notifications
2. **Show progress** - but don't spam
3. **Make costs visible** - users care about spending

---

## 🔗 Related Documents
- [CHANGELOG.md](../../../CHANGELOG.md) - Version history
- [Overview](./overview.md) - Project overview
- [Guidelines](./guidelines.md) - AI communication rules
