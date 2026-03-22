# Phase 04: Auto-Fix Integration
Status: ⬜ Pending
Dependencies: Phase 01, Phase 02, Phase 03

## Objective
Khi Sếp confirm tên chuẩn cho các cluster, tự động tạo correction rules + apply vào toàn bộ chương đã dịch. Tận dụng hoàn toàn `corrections.service.ts` có sẵn.

## Implementation Steps

### 1. [ ] Generate Correction Rules (`generateCorrections`)
**File:** `lib/services/name-audit.service.ts`

```typescript
// Input: Map<clusterId, canonicalName> — user's selections
// Output: CorrectionEntry[] — ready to save to DB
//
// For each cluster where user selected canonical:
//   For each variant !== canonical:
//     Create: { type: 'replace', from: variant, to: canonical }
//
// VD: Cluster "Cư Nam/Trư Nam", canonical = "Cư Nam"
//   → { type: 'replace', from: 'Trư Nam', to: 'Cư Nam' }
```

### 2. [ ] Batch Apply (`applyNameAuditFixes`)
**File:** `lib/services/name-audit.service.ts`

```typescript
// 1. Save correction rules to DB (global workspace)
//    → Dùng db.corrections.bulkAdd()
// 2. Apply corrections to all translated chapters
//    → Dùng applyCorrectionsToChapters() từ corrections.service.ts
// 3. Return summary: { rulesCreated, chaptersFixed, duration }
//
// IMPORTANT: 
// - Corrections saved as GLOBAL (workspaceId = '__global__')
// - Sau khi save, mọi bản dịch MỚI cũng tự động apply
// - Dedup: check nếu rule from→to đã tồn tại thì skip
```

### 3. [ ] Undo Support (History Entry)
**File:** `lib/services/name-audit.service.ts`

```typescript
// Trước khi apply, snapshot tất cả chapters sẽ bị ảnh hưởng
// Save vào history table
// Cho phép user undo nếu chọn sai
//
// Dùng HistoryEntry interface có sẵn:
// { actionType: 'batch_correction', summary: 'Name Audit fix', snapshot: [...] }
```

### 4. [ ] Connect to UI (`applyAllFixes` in useNameAudit hook)
**File:** `components/workspace/intelligence/hooks/useNameAudit.ts`

```typescript
const applyAllFixes = async () => {
    setIsApplying(true);
    
    // 1. Generate corrections from confirmed selections
    const corrections = generateCorrections(confirmedFixes, report.clusters);
    
    // 2. Save to DB + apply to all chapters
    const result = await applyNameAuditFixes(corrections, workspaceId);
    
    // 3. Show toast summary
    toast.success(`✅ Đã fix ${result.chaptersFixed} chương, tạo ${result.rulesCreated} correction rules`);
    
    setIsApplying(false);
};
```

## Files to Create/Modify
- `lib/services/name-audit.service.ts` — **MODIFY** — Add fix generation + apply
- `components/workspace/intelligence/hooks/useNameAudit.ts` — **MODIFY** — Connect apply

## Test Criteria
- [ ] Click "Apply All Fixes" → tạo đúng số correction rules
- [ ] Rules saved as global (workspaceId = '__global__')
- [ ] Corrections thực sự replace text trong chapters
- [ ] Không tạo duplicate rules nếu đã tồn tại
- [ ] History entry được tạo cho undo
- [ ] Toast hiện summary chính xác
- [ ] Dịch chương MỚI sau khi fix → auto-apply corrections

## Notes
- Nên chạy `applyCorrectionsToChapters` (batch mode) thay vì từng chapter → nhanh hơn
- Progress feedback: "Đang fix X/Y chương..."
- Nếu chapter count > 500, nên batch theo chunks (50 chapters/batch) để tránh UI freeze
- Consider: Web Worker nếu scan + apply cần quá lâu (nhưng MVP không cần)

---
## 🎯 DONE — Feature Complete!
Sau Phase 04, flow hoàn chỉnh:
1. Sếp vào Hub → Tab Name Audit → "Scan Now"
2. Xem bảng inconsistencies với tên gốc Trung + Hán Việt
3. Chọn tên chuẩn cho mỗi nhóm
4. "Apply All Fixes" → auto-correct + tạo rules cho tương lai
