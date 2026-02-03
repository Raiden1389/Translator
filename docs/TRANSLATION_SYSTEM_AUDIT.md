# 🔍 TRANSLATION SYSTEM AUDIT REPORT

**Date:** 2026-02-03  
**Focus:** constants.ts, translate.ts, system instructions

---

## 🚨 CRITICAL ISSUES FOUND

### **ISSUE 1: TITLE NOT TRANSLATED** 🔴
**Severity:** CRITICAL  
**Evidence:** Screenshot shows "Chương 104 順勢" (Hán tự còn lại!)

**Current Rule (constants.ts:8):**
```typescript
- TIÊU ĐỀ: Dòng một PHẢI là Tiêu đề đã dịch (VD: Chương 1: Khởi Đầu). KHÔNG giữ chữ Hán.
```

**Problem:** Rule TOO WEAK! AI ignores it.

**Root Cause Analysis:**
1. Rule is buried in middle of CORE_RULES
2. Not emphatic enough
3. No explicit format example with Chinese → Vietnamese

**Recommended Fix:**
```typescript
export const CORE_RULES = `
- 🔥 TIÊU ĐỀ BẮT BUỘC: Dòng ĐẦU TIÊN phải dịch HOÀN TOÀN sang tiếng Việt.
  VD: "第一章 开始" → "Chương 1: Khởi Đầu"
  VD: "第104章 顺势" → "Chương 104: Thuận Thế"
  ⛔ TUYỆT ĐỐI KHÔNG để chữ Hán trong tiêu đề!

- DỊCH: Trung-Việt tiểu thuyết, thoát ý, thuần Việt. 1 dòng gốc = 1 dòng dịch.
- VIẾT HOA: Chỉ tên riêng/đầu câu. Chức danh/đại từ (hắn, nàng, tướng quân, môn chủ) VIẾT THƯỜNG.
- ĐẠI TỪ: 我-Ta, 你-Ngươi, 他/她-Hắn/Nàng. Võ hiệp: Ta/Ngươi, Hiện đại: Tôi/Bạn.
- ĐỊNH DẠNG: Plain Text. Tiêu đề \\n\\n Nội dung. CẤM JSON/Giải thích.
`;
```

**Changes:**
1. ✅ Move title rule to TOP (highest priority)
2. ✅ Add 🔥 emoji for emphasis
3. ✅ Add explicit Chinese → Vietnamese examples
4. ✅ Add ⛔ prohibition symbol
5. ✅ Use "BẮT BUỘC" (MANDATORY) instead of "PHẢI"

---

### **ISSUE 2: LONG CHAPTERS (5000+ chars)** 🟡
**Severity:** MEDIUM  
**Evidence:** User reports 5000 token chapters

**Current Dynamic Calculation:**
```typescript
const estimatedOutputTokens = Math.ceil((text.length * 1.5) / 4) + 500;
const dynamicMaxTokens = Math.min(4096, Math.max(1024, estimatedOutputTokens));
```

**For 5000 char chapter:**
```
5000 × 1.5 / 4 + 500 = 2375 tokens
```

**Problem:** May be insufficient for very long chapters!

**Analysis:**
- Input: 5000 chars Chinese
- Expected output: ~6000-7500 chars Vietnamese
- Tokens needed: ~1500-1875 tokens
- Current allocation: 2375 tokens
- **Status:** ✅ SHOULD BE OK

**But if chapter is 10,000 chars:**
```
10000 × 1.5 / 4 + 500 = 4250 → capped at 4096
```

**Recommendation:**
```typescript
// Option 1: Increase cap to 8192 for very long chapters
const dynamicMaxTokens = Math.min(8192, Math.max(1024, estimatedOutputTokens));

// Option 2: Add warning if input is too long
if (text.length > 8000) {
    onLog({ 
        timestamp: new Date(), 
        message: `⚠️ Chapter rất dài (${text.length} chars). Có thể cần chia nhỏ.`, 
        type: 'warning' 
    });
}
```

**Decision:** Keep 4096 cap for now, monitor for truncation issues.

---

## 📊 SYSTEM INSTRUCTION AUDIT

### **Current Structure (constants.ts):**

```typescript
export const CORE_RULES = `...`;
export const VOICE_TONE_RULE = `- GIỌNG: Sát nhân vật...`;
export const STRUCTURE_RULE = `- CẤU TRÚC: Phá câu Tàu...`;
export const IDIOM_SYSTEM_RULE = `...` (from idioms.ts)
```

**Assembly (constants.ts:18-24):**
```typescript
export function buildSystemInstruction(
    customInstruction?: string,
    glossaryContext?: string
): string {
    const base = customInstruction || "Dịch giả tiểu thuyết cao cấp.";
    return `${base}\n${CORE_RULES}\n${VOICE_TONE_RULE}\n${IDIOM_SYSTEM_RULE}\n${STRUCTURE_RULE}\n${glossaryContext || ""}`;
}
```

### **Issues:**

1. **Title rule buried** - Not prominent enough
2. **No explicit format enforcement** - AI can ignore
3. **Glossary appended at end** - May be overlooked

### **Optimized Structure:**

```typescript
export const TITLE_RULE = `
🔥 QUY TẮC TIÊU ĐỀ (BẮT BUỘC - PRIORITY #1):
Dòng ĐẦU TIÊN của output PHẢI là tiêu đề đã dịch HOÀN TOÀN sang tiếng Việt.
VD: "第一章 开始" → "Chương 1: Khởi Đầu"
VD: "第104章 顺势" → "Chương 104: Thuận Thế"
⛔ TUYỆT ĐỐI KHÔNG để chữ Hán trong tiêu đề!
`;

export const CORE_RULES = `
- DỊCH: Trung-Việt tiểu thuyết, thoát ý, thuần Việt. 1 dòng gốc = 1 dòng dịch.
- VIẾT HOA: Chỉ tên riêng/đầu câu. Chức danh/đại từ (hắn, nàng, tướng quân, môn chủ) VIẾT THƯỜNG.
- ĐẠI TỪ: 我-Ta, 你-Ngươi, 他/她-Hắn/Nàng. Võ hiệp: Ta/Ngươi, Hiện đại: Tôi/Bạn.
- ĐỊNH DẠNG: Plain Text. Tiêu đề \\n\\n Nội dung. CẤM JSON/Giải thích.
`;

export function buildSystemInstruction(
    customInstruction?: string,
    glossaryContext?: string
): string {
    const base = customInstruction || "Dịch giả tiểu thuyết cao cấp.";
    return `${base}
${TITLE_RULE}
${glossaryContext || ""}
${CORE_RULES}
${VOICE_TONE_RULE}
${IDIOM_SYSTEM_RULE}
${STRUCTURE_RULE}`;
}
```

**Changes:**
1. ✅ Title rule extracted to separate constant
2. ✅ Title rule placed FIRST (after base instruction)
3. ✅ Glossary moved UP (before core rules)
4. ✅ Clear hierarchy: Title > Glossary > Core > Voice > Idioms > Structure

---

## 📋 TRANSLATION FLOW AUDIT

### **Current Flow (translate.ts):**

1. **Get Glossary** (line 25-66) ✅ GOOD
   - 2-layer system (Manual + Heuristic)
   - Filters by presence in text
   - Blacklist filtering

2. **Compact Glossary Format** (line 68-70) ✅ OPTIMIZED
   - Already implemented compact format

3. **Heuristic Analysis** (line 72-76) ✅ GOOD
   - Multi-point sampling
   - Context-aware

4. **System Instruction Assembly** (line 81) ⚠️ NEEDS FIX
   - Uses `assembleSystemInstruction` from rules/assembler.ts
   - May not prioritize title rule

5. **Dynamic maxOutputTokens** (line 83-95) ✅ OPTIMIZED
   - Already implemented

6. **API Call** (line 97-109) ✅ GOOD
   - Key rotation
   - Usage recording

7. **Post-processing** (line 111-120) ✅ GOOD
   - Extract response
   - Final sweep (cleanup)

### **Bottleneck:**

**File:** `lib/gemini/rules/assembler.ts`

Need to check if it properly prioritizes title rule!

---

## 🎯 RECOMMENDED FIXES

### **Priority 1: FIX TITLE TRANSLATION** 🔴

**File:** `lib/gemini/constants.ts`

```typescript
// BEFORE
export const CORE_RULES = `
- DỊCH: Trung-Việt tiểu thuyết, thoát ý, thuần Việt. 1 dòng gốc = 1 dòng dịch.
- TIÊU ĐỀ: Dòng một PHẢI là Tiêu đề đã dịch (VD: Chương 1: Khởi Đầu). KHÔNG giữ chữ Hán.
...
`;

// AFTER
export const TITLE_RULE = `
🔥 QUY TẮC TIÊU ĐỀ (BẮT BUỘC):
Dòng ĐẦU TIÊN phải dịch HOÀN TOÀN sang tiếng Việt.
VD: "第104章 顺势" → "Chương 104: Thuận Thế"
⛔ KHÔNG để chữ Hán trong tiêu đề!
`;

export const CORE_RULES = `
- DỊCH: Trung-Việt tiểu thuyết, thoát ý, thuần Việt. 1 dòng gốc = 1 dòng dịch.
...
`;

export function buildSystemInstruction(...) {
    return `${base}\n${TITLE_RULE}\n${glossaryContext}\n${CORE_RULES}...`;
}
```

### **Priority 2: MONITOR LONG CHAPTERS** 🟡

Add logging for chapters > 8000 chars:

```typescript
if (text.length > 8000) {
    onLog({ 
        timestamp: new Date(), 
        message: `⚠️ Chapter dài ${text.length} chars. MaxTokens: ${dynamicMaxTokens}`, 
        type: 'warning' 
    });
}
```

---

## 📊 TOKEN USAGE ANALYSIS

### **Current System Instruction Size:**

```
Base: "Dịch giả tiểu thuyết cao cấp." (~10 tokens)
CORE_RULES: ~150 tokens
VOICE_TONE_RULE: ~20 tokens
IDIOM_SYSTEM_RULE: ~100 tokens
STRUCTURE_RULE: ~15 tokens
Glossary (4 terms): ~40 tokens
─────────────────────────────────
TOTAL: ~335 tokens (input)
```

**Status:** ✅ REASONABLE (not excessive)

### **Optimization Opportunities:**

1. ❌ **Don't compress further** - Clarity > Token savings
2. ✅ **Keep current structure** - Well-balanced
3. ✅ **Title rule emphasis** - Worth extra tokens for correctness

---

## 🧪 TEST CASES

### **Test 1: Title Translation**
```
Input: "第104章 顺势\n\n本文内容..."
Expected: "Chương 104: Thuận Thế\n\n..."
Current: "Chương 104 順勢\n\n..." ❌ FAIL
```

### **Test 2: Long Chapter (5000 chars)**
```
Input: 5000 chars
MaxTokens: 2375
Expected: Complete translation
Status: ⚠️ MONITOR
```

### **Test 3: Very Long Chapter (10000 chars)**
```
Input: 10000 chars
MaxTokens: 4096 (capped)
Expected: May truncate
Status: ⚠️ NEEDS CHUNKING
```

---

## ✅ ACTION ITEMS

1. **IMMEDIATE:**
   - [ ] Fix title rule (extract + emphasize)
   - [ ] Move title rule to top of system instruction
   - [ ] Add explicit Chinese → Vietnamese examples

2. **MONITOR:**
   - [ ] Watch for truncation on 8000+ char chapters
   - [ ] Log warning for very long chapters

3. **FUTURE:**
   - [ ] Consider 8192 cap for long chapters
   - [ ] Auto-chunking for 10000+ char chapters

---

**STATUS:** ⚠️ CRITICAL FIX NEEDED (Title Translation)

*Detailed analysis complete. Ready to implement fixes.*
