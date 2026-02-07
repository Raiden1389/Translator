# 🔍 ZOD AUDIT REPORT - Raiden AI Translator

**Ngày:** 2026-02-07  
**Phân tích bởi:** Dev Pro Coder  
**Mục tiêu:** Xác định boundaries cần Zod validation

---

## 📊 EXECUTIVE SUMMARY

**Tổng số boundaries phát hiện:** 8 categories  
**Đã có Zod:** 2/8 (25%)  
**Nên thêm Zod:** 3/8 (37.5%)  
**KHÔNG nên Zod:** 3/8 (37.5%)

---

## ✅ ĐÃ CÓ ZOD (2/8) - GOOD!

### 1. ✅ JSON Import (User Upload)
**File:** `components/dashboard/JSONImportDialog.tsx`  
**Schema:** `lib/schemas/json-import.schema.ts`  
**Status:** ✅ DONE (Phase 1)

**Lý do cần Zod:**
- User upload file → Không tin được
- Nhiều format khác nhau
- Lỗi = crash app

**Impact:** HIGH (user-facing)

---

### 2. ✅ Gemini API Response
**Files:** `lib/gemini/client.ts`, `lib/gemini/translate.ts`  
**Schema:** `lib/schemas/gemini-response.schema.ts`  
**Status:** ✅ DONE (Phase 2)

**Lý do cần Zod:**
- External API → Google có thể đổi format
- Mỗi request đều gọi
- Lỗi = translation fail

**Impact:** CRITICAL (core functionality)

---

## 🎯 NÊN THÊM ZOD (3/8) - RECOMMENDED

### 3. 🔥 AI Service Responses (HIGH PRIORITY)
**Files:**
- `lib/services/ai-service.ts` (2 JSON.parse)
- `lib/services/ai-ner.service.ts` (1 JSON.parse)

**Code hiện tại:**
```typescript
// ai-service.ts:27
const parsed = JSON.parse(result); // ❌ No validation!

// ai-ner.service.ts:124
const entities: ExtractedEntity[] = JSON.parse(jsonMatch[0]); // ❌ No validation!
```

**Lý do NÊN dùng Zod:**
- ✅ AI response không ổn định (hallucination, format sai)
- ✅ Dùng thường xuyên (mỗi lần AI scan)
- ✅ Lỗi = feature fail (NER, character extraction)

**Impact:** HIGH

**Recommended Schema:**
```typescript
// lib/schemas/ai/ner.schema.ts
export const ExtractedEntitySchema = z.object({
  term: z.string(),
  chinese: z.string().optional(),
  vietnamese: z.string().optional(),
  type: z.enum(['character', 'place', 'item', 'skill']),
  description: z.string().optional(),
});

export const NERResponseSchema = z.array(ExtractedEntitySchema);
```

**Effort:** 1 hour  
**ROI:** Very High (prevent AI hallucination bugs)

---

### 4. 🔥 Heuristic Refiner (MEDIUM PRIORITY)
**File:** `lib/gemini/heuristic/refiner.ts`

**Code hiện tại:**
```typescript
// Line 110
refined = JSON.parse(jsonStr); // ❌ No validation!

// Line 115 - Even has repair logic!
refined = JSON.parse(repaired); // ❌ Still no validation after repair!
```

**Lý do NÊN dùng Zod:**
- ✅ AI-generated JSON → Không tin được
- ✅ Đã có repair logic → Nên validate sau repair
- ✅ Lỗi = heuristic scan fail

**Impact:** MEDIUM

**Recommended Schema:**
```typescript
// lib/schemas/ai/heuristic.schema.ts
export const RefinedTermSchema = z.object({
  term: z.string(),
  chinese: z.string(),
  vietnamese: z.string(),
  confidence: z.number().min(0).max(1),
  context: z.string().optional(),
});

export const HeuristicRefinerResponseSchema = z.array(RefinedTermSchema);
```

**Effort:** 30 minutes  
**ROI:** High (prevent scan corruption)

---

### 5. ⚠️ Export/Import Backup (LOW PRIORITY)
**File:** `lib/export-import.ts`

**Code hiện tại:**
```typescript
// Line 40 - Import workspace
const data = JSON.parse(text); // ❌ No validation!

// Line 143 - Restore backup
const backupData = JSON.parse(backupString); // ❌ No validation!
```

**Lý do NÊN dùng Zod:**
- ✅ User-provided file → Không tin được
- ✅ Backup restore = critical operation
- ✅ Lỗi = data loss

**Impact:** MEDIUM (but infrequent)

**Recommended Schema:**
```typescript
// lib/schemas/import/backup.schema.ts
export const BackupDataSchema = z.object({
  workspace: WorkspaceSchema,
  chapters: z.array(ChapterSchema),
  dictionary: z.array(DictionaryEntrySchema),
  version: z.string(),
});
```

**Effort:** 1 hour  
**ROI:** Medium (infrequent but critical)

---

## ❌ KHÔNG NÊN DÙNG ZOD (3/8) - OVERKILL

### 6. ❌ LocalStorage Parsing (INTERNAL STATE)
**Files:**
- `lib/hooks/usePersistedState.ts`
- `components/workspace/hooks/useReaderConfig.ts`
- `components/workspace/hooks/useReaderSettings.ts`

**Code:**
```typescript
// usePersistedState.ts:19
return JSON.parse(saved); // ❌ Don't validate!

// useReaderConfig.ts:33
const parsed = JSON.parse(savedConfig); // ❌ Don't validate!
```

**Lý do KHÔNG nên Zod:**
- ❌ Internal state (app tự ghi)
- ❌ TypeScript đã đủ
- ❌ Overhead không cần thiết
- ❌ Nếu corrupt → Clear localStorage là xong

**Alternative:** Try-catch + fallback to default
```typescript
try {
  return JSON.parse(saved);
} catch {
  return defaultValue; // ✅ Simple & effective
}
```

---

### 7. ❌ Tauri Storage Bridge (TRUSTED SOURCE)
**File:** `lib/storageBridge.ts`

**Code:**
```typescript
// Line 116
const metadata: Workspace | null = metadataStr ? JSON.parse(metadataStr) : null;

// Line 120
const dictionary: DictionaryEntry[] = dictStr ? JSON.parse(dictStr) : [];
```

**Lý do KHÔNG nên Zod:**
- ❌ Tauri backend (Rust) → Trusted
- ❌ App tự ghi → Controlled format
- ❌ TypeScript types đã đủ
- ❌ Performance overhead (đọc nhiều lần)

**Alternative:** TypeScript types + error handling
```typescript
try {
  const metadata: Workspace | null = metadataStr ? JSON.parse(metadataStr) : null;
} catch (error) {
  console.error('Corrupt metadata, resetting...');
  return null;
}
```

---

### 8. ❌ AI Utility Functions (LOW RISK)
**Files:**
- `lib/gemini/style-dna.ts`
- `lib/gemini/prompt-lab.ts`
- `lib/gemini/inspector.ts`
- `lib/gemini/glossary.ts`

**Code:**
```typescript
// style-dna.ts:24
return JSON.parse(jsonText || '{}'); // ❌ Don't validate!

// prompt-lab.ts:18
return JSON.parse(jsonText || '{"promptA": "", "promptB": ""}'); // ❌ Don't validate!
```

**Lý do KHÔNG nên Zod:**
- ❌ Utility functions (không critical)
- ❌ Đã có fallback defaults
- ❌ Lỗi không crash app
- ❌ Overhead không đáng

**Alternative:** Try-catch + fallback
```typescript
try {
  return JSON.parse(jsonText || '{}');
} catch {
  return {}; // ✅ Safe fallback
}
```

---

## 📋 PRIORITY MATRIX

| Boundary | Impact | Frequency | Risk | Zod? | Priority |
|----------|--------|-----------|------|------|----------|
| JSON Import | HIGH | Low | HIGH | ✅ Done | - |
| Gemini API | CRITICAL | High | HIGH | ✅ Done | - |
| **AI NER Service** | **HIGH** | **Medium** | **HIGH** | ❌ | **🔥 P0** |
| **Heuristic Refiner** | **MEDIUM** | **Medium** | **MEDIUM** | ❌ | **🔥 P1** |
| **Backup Import** | **MEDIUM** | **Low** | **HIGH** | ❌ | **⚠️ P2** |
| LocalStorage | LOW | High | LOW | ❌ No | - |
| Storage Bridge | LOW | High | LOW | ❌ No | - |
| AI Utils | LOW | Low | LOW | ❌ No | - |

---

## 🎯 RECOMMENDED ACTION PLAN

### Phase 3: AI Service Validation (P0 - HIGH ROI)
**Effort:** 1 hour  
**Files to create:**
- `lib/schemas/ai/ner.schema.ts`

**Files to update:**
- `lib/services/ai-service.ts`
- `lib/services/ai-ner.service.ts`

**Benefits:**
- ✅ Prevent AI hallucination bugs
- ✅ Better error messages
- ✅ Catch format changes early

---

### Phase 4: Heuristic Validation (P1 - MEDIUM ROI)
**Effort:** 30 minutes  
**Files to create:**
- `lib/schemas/ai/heuristic.schema.ts`

**Files to update:**
- `lib/gemini/heuristic/refiner.ts`

**Benefits:**
- ✅ Prevent scan corruption
- ✅ Validate after repair logic
- ✅ Better debugging

---

### Phase 5: Backup Validation (P2 - OPTIONAL)
**Effort:** 1 hour  
**Files to create:**
- `lib/schemas/import/backup.schema.ts`

**Files to update:**
- `lib/export-import.ts`

**Benefits:**
- ✅ Prevent data loss
- ✅ Validate backup integrity
- ✅ Better restore UX

---

## 📊 FINAL RECOMMENDATIONS

### ✅ DO (High ROI):
1. **Phase 3: AI NER Service** - Prevent AI bugs
2. **Phase 4: Heuristic Refiner** - Prevent scan corruption

### ⚠️ MAYBE (Medium ROI):
3. **Phase 5: Backup Import** - If users report issues

### ❌ DON'T (Low ROI):
- LocalStorage parsing (internal state)
- Storage Bridge (trusted source)
- AI utility functions (low risk)

---

## 💡 GOLDEN RULES

### ✅ Use Zod when:
1. **External data** (user upload, API, AI)
2. **High impact** (crash, data loss, core feature)
3. **Frequent use** (every request, every scan)
4. **Unstable format** (AI, third-party API)

### ❌ Don't use Zod when:
1. **Internal state** (localStorage, app-controlled)
2. **Trusted source** (Tauri backend, own DB)
3. **Low impact** (utility, fallback available)
4. **Performance critical** (hot path, high frequency)

---

## 📈 CURRENT STATUS

**Zod Coverage:**
- ✅ User Input: 100% (JSON import)
- ✅ External API: 100% (Gemini)
- ⚠️ AI Services: 0% (should be 100%)
- ❌ Internal State: 0% (correct - don't need)

**Overall Score:** 7/10 (Good, can be 9/10 with Phase 3)

---

## 🎓 CONCLUSION

**App mình đang dùng Zod RẤT ĐÚNG!**

**Nên thêm:**
- 🔥 AI NER Service (P0)
- 🔥 Heuristic Refiner (P1)
- ⚠️ Backup Import (P2 - optional)

**KHÔNG nên thêm:**
- ❌ LocalStorage (internal)
- ❌ Storage Bridge (trusted)
- ❌ AI Utils (low risk)

**Estimated Total Effort:** 2.5 hours for all 3 phases  
**Expected ROI:** Very High (prevent AI bugs + scan corruption)

---

**Prepared by:** Dev Pro Coder  
**Date:** 2026-02-07  
**Status:** Ready for implementation
