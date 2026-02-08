---
title: Troubleshooting Guide
createdAt: '2026-02-04T12:59:00.000Z'
updatedAt: '2026-02-06T09:55:00.000Z'
description: Common issues and solutions
tags: [troubleshooting, bugs, fixes]
---

# 🔧 Troubleshooting Guide

> **Purpose:** Document all major bugs encountered, root causes, and solutions for future reference.

---

## 🚨 Critical Issues (2026-02-06 Session)

### 10. **Dictionary Usage Stats Not Appearing in Overlay**
**Date:** 2026-02-06  
**Severity:** 🟡 Medium  
**Symptom:**
- Translation overlay shows "0 terms used, 0 characters used"
- Stats remain at 0 even when glossary is loaded
- Heuristic scanner terms not counted

**Root Cause:**
- `sharedGlossary` only loaded from `db.dictionary`
- Approved terms from `db.heuristicTerms` were not merged
- Dictionary usage calculation only counted `db.dictionary` entries

**Solution:**
```typescript
// TranslationProvider.v2.tsx - Merge heuristic terms into glossary
const [dictTerms, heuristicTerms] = await Promise.all([
    db.dictionary.where('workspaceId').equals(workspaceId).toArray(),
    db.heuristicTerms
        .where(['workspaceId+approved'])
        .equals([workspaceId, true])
        .toArray()
]);

// Merge both sources
const sharedGlossary: GlossaryTerm[] = [
    ...dictTerms,
    ...heuristicTerms.map(h => ({
        id: h.id!,
        workspaceId: h.workspaceId,
        original: h.original,
        translation: h.translation,
        createdAt: h.createdAt,
        updatedAt: h.updatedAt
    }))
];

console.log(`[GLOSSARY] Loaded ${dictTerms.length} dict + ${heuristicTerms.length} heuristic = ${sharedGlossary.length} final terms`);
```

**Prevention:**
- Always merge all glossary sources (dictionary + heuristic + persona)
- Add debug logs to track glossary loading
- Test with workspaces that have heuristic-only terms

**Files Changed:**
- `components/workspace/hooks/TranslationProvider.v2.tsx`

---

### 11. **Chunking Not Working - Config Hardcoded to False**
**Date:** 2026-02-06  
**Severity:** 🔴 Critical  
**Symptom:**
- User enables chunking in TranslateConfigDialog
- Translation still runs in non-chunking mode
- Overlay stuck on "Warming up core..." with no progress

**Root Cause:**
- `ChapterList.tsx` hardcoded `enableChunking: false` in `onStart` callback
- User's selection from dialog was overridden
- `TranslationProvider.v2.tsx` never received correct config

**Solution:**
```typescript
// ChapterList.tsx - BEFORE (BROKEN)
onStart={(config: { customPrompt: string; autoExtract: boolean; maxConcurrency: number }, settings: TranslationSettings) => {
    onTranslate({
        translateConfig: {
            ...config,
            enableChunking: false,  // ❌ HARDCODED!
            maxConcurrentChunks: 3
        }
    });
}}

// AFTER (FIXED)
onStart={(config: { 
    customPrompt: string; 
    autoExtract: boolean; 
    maxConcurrency: number;
    enableChunking: boolean;
    maxConcurrentChunks: number;
    chunkSize?: number;
}, settings: TranslationSettings) => {
    onTranslate({
        translateConfig: config  // ✅ Pass config directly
    });
}}
```

**Prevention:**
- Never hardcode config values in callback handlers
- Always pass config objects directly from dialogs
- Add debug logs to verify config propagation

**Files Changed:**
- `components/workspace/chapter-list/ChapterList.tsx`

---

### 12. **Translation Overlay Stuck on "Warming up core..."**
**Date:** 2026-02-06  
**Severity:** 🟡 Medium  
**Symptom:**
- Overlay shows "Warming up core..." indefinitely
- No progress updates during translation
- Stats remain at 0 until completion

**Root Cause:**
- `translateChapter` (non-chunking mode) only sent 2 logs: start + end
- No intermediate `onLog` calls during translation process
- UI had no feedback during API request (~5-15 seconds)

**Solution:**
```typescript
// lib/gemini/translate.ts - Add intermediate logs
async function translateChapter(...) {
    onLog({ timestamp: new Date(), message: '📚 Đang tải từ điển...', type: 'info' });
    
    // ... load glossary ...
    
    onLog({ timestamp: new Date(), message: '🧠 Phân tích ngữ cảnh...', type: 'info' });
    
    // ... build system instruction ...
    
    onLog({ timestamp: new Date(), message: '🤖 Đang gửi yêu cầu đến AI...', type: 'info' });
    
    const adaptiveResult = await withAdaptiveTokens(...);
    
    onLog({ timestamp: new Date(), message: '📝 Đang xử lý kết quả...', type: 'info' });
    
    // ... process response ...
    
    onLog({ timestamp: new Date(), message: `✅ Dịch xong!`, type: 'success' });
}
```

**Prevention:**
- Add progress logs after each major step
- Ensure UI updates even in non-chunking mode
- Test with long-running API calls

**Files Changed:**
- `lib/gemini/translate.ts`

---

### 13. **Adaptive Token Logic Causing MAX_TOKENS Errors**
**Date:** 2026-02-06  
**Severity:** 🔴 Critical  
**Symptom:**
- Chapter 4400+ chars returns empty translation
- API response has `finishReason: "MAX_TOKENS"`
- Error message: "AI trả về nội dung rỗng"

**Root Cause:**
1. **Broken Formula:** Old logic used `inputLength * 4.0` (chars, not tokens)
   ```typescript
   // ❌ OLD (BROKEN)
   const scaledBuffer = Math.max(baseBuffer, Math.ceil(inputLength * 4.0));
   const estimated = Math.ceil((inputLength * 1.5) / 4) + scaledBuffer;
   // For 4400 chars: scaledBuffer = 17600 → OVERFLOW!
   ```

2. **Wrong maxTokens:** Set to 8192, but Gemini 2.5 Flash supports **65,535**

3. **Incorrect baseBuffer:** Set to 3500, but thinking tokens are only ~2400-2800

**Solution:**
```typescript
// lib/gemini/adaptive-tokens.ts - NEW FORMULA
export function calculateDynamicTokens(config: TokenConfig): number {
    // Input tokens estimation (chars / 4)
    const inputTokens = Math.ceil(config.inputLength / 4);
    
    // Output tokens = input tokens * 1.3 (Vietnamese expansion - empirically tested)
    const outputTokens = Math.ceil(inputTokens * 1.3);
    
    // Total needed = baseBuffer (thinking tokens) + outputTokens
    const totalNeeded = config.baseBuffer + outputTokens;
    
    // Cap at maxTokens, but ensure at least minTokens
    return Math.min(config.maxTokens, Math.max(config.minTokens, totalNeeded));
}

// lib/gemini/translate.ts - UPDATED CONFIG
{
    inputLength: text.length,
    baseBuffer: 2800,   // Gemini 2.5 Flash thinking tokens (2400-2800)
    minTokens: 2048,
    maxTokens: 16384    // Gemini 2.5 Flash supports up to 65K
}
```

**Example Calculation (4400 chars):**
```
inputTokens = 4400 / 4 = 1100
outputTokens = 1100 * 1.3 = 1430
totalNeeded = 2800 + 1430 = 4230 tokens ✅
```

**Prevention:**
- Use token-based calculations, not char-based
- Research model-specific limits (Gemini 2.5 Flash ≠ 2.0 Flash)
- Add warning logs for chapters > 5000 chars
- Better error messages for MAX_TOKENS

**Files Changed:**
- `lib/gemini/adaptive-tokens.ts`
- `lib/gemini/translate.ts`

---

### 14. **Thinking Budget Configuration for Gemini 2.5 Flash**
**Date:** 2026-02-06  
**Severity:** 🟢 Low (Knowledge Documentation)  
**Context:**
Gemini 2.5 Flash uses "thinking tokens" for internal reasoning before generating output. Understanding and configuring this is critical for cost optimization.

**Key Facts:**
- **Default Behavior:** `thinkingBudget = -1` (dynamic mode)
- **Dynamic Mode:** Model adjusts thinking tokens (400-8192) based on task complexity
- **Manual Control:** Can set fixed budget (0-24,576 tokens)
- **Cost:** Thinking tokens billed as **output tokens** ($0.30/1M)

**Configuration:**
```typescript
// lib/gemini/client.ts - Type definition
generationConfig?: {
    temperature?: number;
    topP?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
    thinkingConfig?: {
        thinkingBudget?: number;  // -1 = dynamic, 0 = disabled, >0 = fixed
    };
}

// lib/gemini/translate.ts - Usage
generationConfig: {
    temperature: 0.1,
    topP: 0.95,
    maxOutputTokens: 16384,
    responseMimeType: "text/plain",
    thinkingConfig: {
        thinkingBudget: -1  // Dynamic thinking (recommended)
    }
}
```

**Thinking Budget Modes:**
| Mode | Value | Behavior | Use Case |
|------|-------|----------|----------|
| Dynamic | `-1` | Auto-adjust 400-8192 tokens | ✅ Recommended for translation |
| Disabled | `0` | No thinking | Fast, cheap, lower quality |
| Fixed | `1024` | Exactly 1024 tokens | Predictable cost |
| Max Manual | `24576` | Up to 24K tokens | Complex reasoning tasks |

**Example Token Usage:**
- Simple 500-char translation: ~400-600 thinking tokens
- Complex 4000-char chapter: ~2000-2400 thinking tokens
- Math/logic problems: ~3000-5000 thinking tokens

**Best Practices:**
- Use `-1` (dynamic) for translation (balances quality + cost)
- Use `0` (disabled) for simple utility tasks (title fixing, NER)
- Monitor `thoughtsTokenCount` in usage metadata for cost tracking

**Files Changed:**
- `lib/gemini/client.ts` (type definition)
- `lib/gemini/translate.ts` (configuration)

---

## 🚨 Critical Issues (Previous Sessions)

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

### 8. **Incomplete Function Body - Parsing Error**
**Date:** 2026-02-06  
**Severity:** 🔴 Critical  
**Symptom:**
- TypeScript error: `'}' expected` at end of function
- Build fails with parsing error
- Function appears complete but missing implementation

**Root Cause:**
- Function signature defined but body not implemented
- Missing return statement and closing brace
- Code was scaffolded but never completed

**Example:**
```typescript
// ❌ BROKEN - Missing implementation
async extractEntitiesBatch(
    chapters: Chapter[],
    workspaceId: number
): Promise<Map<number, NEREntity[]>> {
    const results = new Map<number, NEREntity[]>();
    // Missing: actual extraction logic, return statement, closing brace
}

// ✅ FIXED - Complete implementation
async extractEntitiesBatch(
    chapters: Chapter[],
    workspaceId: number
): Promise<Map<number, NEREntity[]>> {
    const results = new Map<number, NEREntity[]>();
    
    for (const chapter of chapters) {
        const entities = await this.extractEntities(chapter, workspaceId);
        results.set(chapter.id!, entities);
    }
    
    return results;
}
```

**Prevention:**
- Always implement function body immediately after signature
- Use TODO comments if implementation is deferred
- Run TypeScript check before committing
- Enable "strict" mode in tsconfig.json

**Files Changed:**
- `lib/services/ai-ner.service.ts`

---

### 9. **Multi-Layer Type Interface Sync Issues**
**Date:** 2026-02-06  
**Severity:** 🟡 Medium  
**Symptom:**
- TypeScript error: `Property 'X' does not exist on type 'Y'`
- Data flows through multiple layers but types don't match
- Runtime works but compile fails

**Root Cause:**
- Adding new fields to data model requires updating ALL layers:
  1. Base interface (e.g., `ChapterProgress`)
  2. Aggregate interface (e.g., `AggregateStats`)
  3. Context type (e.g., `TranslationContextType.batchProgress`)
  4. Component props (e.g., `TranslationProgressOverlayProps`)
- Easy to miss one layer in the chain

**Solution - Systematic Approach:**
```typescript
// STEP 1: Update base data interface
interface ChapterProgress {
    // ... existing fields
    termsUsed?: number;        // NEW
    charactersUsed?: number;   // NEW
}

// STEP 2: Update aggregate stats
interface AggregateStats {
    // ... existing fields
    totalTermsUsed: number;        // NEW
    totalCharactersUsed: number;   // NEW
}

// STEP 3: Update calculation logic
const calculateStats = (): AggregateStats => {
    // ... existing calculations
    const totalTermsUsed = chapters.reduce((sum, c) => sum + (c.termsUsed || 0), 0);
    const totalCharactersUsed = chapters.reduce((sum, c) => sum + (c.charactersUsed || 0), 0);
    
    return {
        // ... existing fields
        totalTermsUsed,
        totalCharactersUsed,
    };
};

// STEP 4: Update context provider interface
interface TranslationContextType {
    batchProgress: {
        // ... existing fields
        totalTermsUsed?: number;        // NEW
        totalCharactersUsed?: number;   // NEW
        currentTermsUsed?: number;      // NEW
        currentCharactersUsed?: number; // NEW
    };
}

// STEP 5: Update component props
interface TranslationProgressOverlayProps {
    progress: {
        // ... existing fields
        totalTermsUsed?: number;        // NEW
        totalCharactersUsed?: number;   // NEW
        currentTermsUsed?: number;      // NEW
        currentCharactersUsed?: number; // NEW
    };
}

// STEP 6: Destructure in component
const { 
    // ... existing fields
    totalTermsUsed = 0,
    totalCharactersUsed = 0,
    currentTermsUsed = 0,
    currentCharactersUsed = 0,
} = progress;
```

**Prevention Checklist:**
- [ ] Update base data interface
- [ ] Update aggregate/computed interface
- [ ] Update calculation/aggregation logic
- [ ] Update context provider type
- [ ] Update context provider value
- [ ] Update component props interface
- [ ] Update component destructuring
- [ ] Run `npm run build` to verify

**Best Practice - Data Flow Tracing:**
```
Data Source (DB/API)
    ↓
Base Interface (ChapterProgress)
    ↓
Aggregation Logic (calculateStats)
    ↓
Aggregate Interface (AggregateStats)
    ↓
Context Provider Type (TranslationContextType)
    ↓
Context Provider Value (batchProgress)
    ↓
Component Props (TranslationProgressOverlayProps)
    ↓
Component Destructuring
    ↓
UI Rendering
```

**Files Changed:**
- `components/workspace/hooks/useTranslationProgress.ts`
- `components/workspace/hooks/TranslationProvider.v2.tsx`
- `components/workspace/chapter-list/TranslationProgressOverlay.tsx`

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
