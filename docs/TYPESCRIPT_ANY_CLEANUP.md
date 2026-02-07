# 📋 TypeScript `any` Cleanup Checklist

**Tổng số:** 132 lỗi `@typescript-eslint/no-explicit-any`  
**Phân bố:** 40 files  
**Chiến lược:** Sửa dần 5-20 files mỗi session

---

## 📊 Phân loại theo mức độ ưu tiên

### 🔴 **PRIORITY 1: Core Services (8 files)** - Quan trọng nhất
Các file này là trái tim của app, được dùng nhiều nhất.

| # | File | Số lỗi `any` | Độ khó | Ghi chú |
|---|------|--------------|--------|---------|
| 1 | `lib/services/workspace.service.ts` | 1 | ⭐ Dễ | catch block |
| 2 | `lib/storageBridge.ts` | 1 | ⭐⭐ TB | JSON.parse result |
| 3 | `lib/hooks/usePersistedState.ts` | 1 | ⭐⭐ TB | Generic hook |
| 4 | `lib/gemini/titleFixer.ts` | 2 | ⭐⭐ TB | catch block + error handling |
| 5 | `lib/gemini/translate.ts` | 1 | ⭐⭐⭐ Khó | Core translation logic |
| 6 | `lib/googleDrive.ts` | 2 | ⭐⭐ TB | API response types |
| 7 | `lib/gemini/heuristic/forensic-export.ts` | 1 | ⭐⭐ TB | impact parameter |
| 8 | `lib/gemini/heuristic/conflict-resolver.ts` | 1 | ⭐⭐ TB | semanticFlags type |

**Tổng:** 10 lỗi `any`

---

### 🟡 **PRIORITY 2: Workspace Hooks (9 files)** - Quan trọng
Logic xử lý workspace, được dùng thường xuyên.

| # | File | Số lỗi `any` | Độ khó | Ghi chú |
|---|------|--------------|--------|---------|
| 9 | `components/workspace/hooks/useChapterImport.ts` | 4 | ⭐⭐⭐ Khó | JSON import, map callbacks |
| 10 | `components/workspace/hooks/useAISettings.ts` | 2 | ⭐ Dễ | catch blocks |
| 11 | `components/workspace/hooks/useExport.ts` | 3 | ⭐⭐ TB | Export logic, catch blocks |
| 12 | `components/workspace/dictionary/hooks/useBlacklist.ts` | 1 | ⭐ Dễ | catch block |
| 13 | `components/workspace/dictionary/hooks/useDictionaryAI.ts` | 4 | ⭐⭐⭐ Khó | AI extraction, chapter types |
| 14 | `components/workspace/context/ReaderContext.tsx` | 2 | ⭐⭐ TB | chapter type definition |
| 15 | `components/workspace/chapter-list/components/ChapterListDialogs.tsx` | 7 | ⭐⭐⭐ Khó | Multiple dialog props |
| 16 | `components/workspace/FixBracketsButton.tsx` | 1 | ⭐ Dễ | catch block |
| 17 | `components/workspace/hooks/useChapterList.types.ts` | ? | ⭐⭐ TB | Type definitions |

**Tổng:** ~24 lỗi `any`

---

### 🟢 **PRIORITY 3: PromptLab (4 files)** - Có thể đợi
PromptLab đã có .legacy backup, ít dùng hơn.

| # | File | Số lỗi `any` | Độ khó | Ghi chú |
|---|------|--------------|--------|---------|
| 18 | `components/workspace/PromptLab.legacy.tsx` | 3 | ⚠️ SKIP | Legacy file, sẽ xóa |
| 19 | `components/workspace/PromptLab/hooks/usePromptActions.ts` | 3 | ⭐⭐ TB | catch blocks |
| 20 | `components/workspace/PromptLab/hooks/usePromptState.ts` | ? | ⭐ Dễ | State management |
| 21 | `components/workspace/PromptLab.tsx` | ? | ⭐⭐ TB | Main component |

**Tổng:** ~6 lỗi `any` (bỏ qua .legacy)

---

### 🔵 **PRIORITY 4: UI Components (5 files)** - Ít quan trọng
UI components, ít logic phức tạp.

| # | File | Số lỗi `any` | Độ khó | Ghi chú |
|---|------|--------------|--------|---------|
| 22 | `components/editor/settings/AISettingsTab.tsx` | 2 | ⭐ Dễ | map callback + catch |
| 23 | `components/dashboard/JSONImportDialog.tsx` | 2 | ⭐⭐ TB | JSON import |
| 24 | `components/workspace/CharacterTab.tsx` | ? | ⭐ Dễ | UI logic |
| 25 | `components/workspace/ExportTab.tsx` | ? | ⭐ Dễ | UI logic |
| 26 | `components/workspace/OverviewTab.tsx` | ? | ⭐ Dễ | UI logic |

**Tổng:** ~4 lỗi `any`

---

### ⚪ **PRIORITY 5: Test/Utils (2 files)** - Có thể bỏ qua
Test files và utilities.

| # | File | Số lỗi `any` | Độ khó | Ghi chú |
|---|------|--------------|--------|---------|
| 27 | `components/workspace/hooks/useTranslationQueue.manual-test.ts` | 4 | ⚠️ SKIP | Test file, mock functions |
| 28 | `lib/types.ts` | 1 | ⭐ Dễ | Empty interface |

**Tổng:** 1 lỗi `any` (bỏ qua test file)

---

## 🎯 Kế hoạch thực hiện

### **Session 1 (Hôm nay):** Priority 1 - Core Services (8 files, ~10 lỗi)
- [ ] `lib/services/workspace.service.ts`
- [ ] `lib/storageBridge.ts`
- [ ] `lib/hooks/usePersistedState.ts`
- [ ] `lib/gemini/titleFixer.ts`
- [ ] `lib/gemini/translate.ts`
- [ ] `lib/googleDrive.ts`
- [ ] `lib/gemini/heuristic/forensic-export.ts`
- [ ] `lib/gemini/heuristic/conflict-resolver.ts`

**Thời gian ước tính:** 30-45 phút

---

### **Session 2:** Priority 2 Part 1 (5 files, ~10 lỗi)
- [ ] `components/workspace/hooks/useAISettings.ts`
- [ ] `components/workspace/hooks/useExport.ts`
- [ ] `components/workspace/dictionary/hooks/useBlacklist.ts`
- [ ] `components/workspace/FixBracketsButton.tsx`
- [ ] `components/workspace/context/ReaderContext.tsx`

**Thời gian ước tính:** 30 phút

---

### **Session 3:** Priority 2 Part 2 (4 files, ~14 lỗi)
- [ ] `components/workspace/hooks/useChapterImport.ts` (khó)
- [ ] `components/workspace/dictionary/hooks/useDictionaryAI.ts` (khó)
- [ ] `components/workspace/chapter-list/components/ChapterListDialogs.tsx` (khó)
- [ ] `components/workspace/hooks/useChapterList.types.ts`

**Thời gian ước tính:** 45-60 phút

---

### **Session 4:** Priority 3 - PromptLab (3 files, ~6 lỗi)
- [ ] `components/workspace/PromptLab/hooks/usePromptActions.ts`
- [ ] `components/workspace/PromptLab/hooks/usePromptState.ts`
- [ ] `components/workspace/PromptLab.tsx`

**Thời gian ước tính:** 30 phút

---

### **Session 5:** Priority 4 - UI Components (5 files, ~4 lỗi)
- [ ] `components/editor/settings/AISettingsTab.tsx`
- [ ] `components/dashboard/JSONImportDialog.tsx`
- [ ] `components/workspace/CharacterTab.tsx`
- [ ] `components/workspace/ExportTab.tsx`
- [ ] `components/workspace/OverviewTab.tsx`

**Thời gian ước tính:** 20-30 phút

---

### **Session 6:** Cleanup & Verification
- [ ] Xóa `PromptLab.legacy.tsx`
- [ ] Xóa `useTranslationQueue.manual-test.ts`
- [ ] Fix `lib/types.ts` empty interface
- [ ] Run full lint check
- [ ] Run build verification
- [ ] Update CHANGELOG.md

**Thời gian ước tính:** 15 phút

---

## 📈 Tiến độ

- **Tổng files cần sửa:** ~28 files
- **Tổng lỗi `any`:** ~132 lỗi
- **Số session ước tính:** 6 sessions
- **Thời gian tổng:** ~3-4 giờ

---

## 🔧 Pattern sửa phổ biến

### **1. Catch blocks** (Dễ nhất - ~50% lỗi)
```typescript
// ❌ Before
catch (error: any) {
  console.error(error.message);
}

// ✅ After
catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
}
```

### **2. JSON.parse** (Trung bình)
```typescript
// ❌ Before
const data: any = JSON.parse(jsonString);

// ✅ After
interface ExpectedData {
  id: string;
  title: string;
}
const data = JSON.parse(jsonString) as ExpectedData;
```

### **3. Array.map callbacks** (Trung bình)
```typescript
// ❌ Before
chapters.map((c: any) => ({ ...c }))

// ✅ After
interface RawChapter {
  id: number;
  title: string;
}
chapters.map((c: RawChapter) => ({ ...c }))
```

---

## 💡 Ghi chú

- **Bỏ qua:** `PromptLab.legacy.tsx`, `useTranslationQueue.manual-test.ts`
- **Ưu tiên:** Core services → Hooks → UI
- **Mỗi session:** 5-10 files, 30-60 phút
- **Verify:** Chạy `npm run lint` sau mỗi session

---

**Created:** 2026-02-07  
**Last Updated:** 2026-02-07  
**Status:** Ready for Session 1
