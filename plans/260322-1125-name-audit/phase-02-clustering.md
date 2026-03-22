# Phase 02: Clustering & Cross-reference
Status: ✅ Complete
Dependencies: Phase 01

## Objective
Gom nhóm các biến thể tên Việt tương tự nhau (fuzzy match), cross-reference với tên gốc Trung → tạo ra danh sách "inconsistencies" sẵn sàng cho UI review.

## Implementation Steps

### 1. [ ] Fuzzy Name Clusterer (`clusterSimilarNames`)
**File:** `lib/services/name-audit.service.ts`

```typescript
// Dùng Jaro-Winkler similarity (đã có sẵn trong heuristic/utils.ts)
// Threshold: >= 0.75 → coi là cùng 1 nhân vật
//
// Algorithm:
// 1. Sort tên theo frequency (nhiều nhất trước)
// 2. Với mỗi tên, so sánh với các tên chưa assigned
// 3. Nếu similarity >= threshold → gom vào cùng cluster
// 4. Tên có frequency cao nhất = "suggested canonical"
//
// Edge case: "Trương Nam" vs "Trư Nam" — giống nhưng khác người
// → Threshold 0.75 giúp avoid false positive
// → Cross-ref với tên Trung sẽ confirm chắc chắn

interface NameCluster {
    id: string;                           // Auto-generated UUID
    chineseName?: string;                 // "朱南" (if cross-ref found)
    hanViet?: string;                     // "Chu Nam"
    variants: {
        name: string;                     // "Cư Nam"
        count: number;                    // 20
        chapters: number[];               // [6,7,...,45]
        contexts: string[];               // Sample sentences
    }[];
    suggestedCanonical: string;           // "Cư Nam" (highest frequency)
    totalOccurrences: number;             // 30
    isInconsistent: boolean;              // true if variants.length > 1
}
```

### 2. [ ] Cross-reference Enrichment (`enrichWithChineseSource`)
**File:** `lib/services/name-audit.service.ts`

```typescript
// Dùng paragraph alignment data từ Phase 01
// Với mỗi cluster Việt:
//   1. Lấy sample chapters chứa variant
//   2. Tìm paragraph tương ứng trong content_original
//   3. Extract tên Trung từ paragraph đó
//   4. Nếu cùng 1 tên Trung → confirm cùng nhân vật
//   5. Gán chineseName + hanViet vào cluster
//
// Kết quả: "朱南 (Chu Nam) → Cư Nam(20) / Trư Nam(10)"
```

### 3. [ ] Confidence Scoring
```typescript
// Mỗi cluster có confidence score:
// - 1.0: Cùng tên Trung gốc (100% chắc chắn cùng người)
// - 0.8: Fuzzy match cao + chapter overlap 
// - 0.6: Fuzzy match trung bình, chưa cross-ref được
// - < 0.5: Có thể khác người → hiện warning cho user
```

### 4. [ ] Final Audit Report (`generateAuditReport`)
```typescript
interface NameAuditReport {
    clusters: NameCluster[];              // Tất cả nhóm tên
    inconsistentCount: number;            // Số nhóm có > 1 biến thể
    consistentCount: number;              // Số nhóm chỉ có 1 tên (OK)
    totalNamesFound: number;
    totalChaptersScanned: number;
    scanDuration: number;
}
```

## Files to Create/Modify
- `lib/services/name-audit.service.ts` — **MODIFY** — Add clustering logic
- `lib/services/name-audit.types.ts` — **MODIFY** — Add cluster types

## Test Criteria
- [ ] "Cư Nam"(20) + "Trư Nam"(10) → gom vào 1 cluster, suggest "Cư Nam"
- [ ] "Lý Minh Hải"(15) + "Lý Minh"(5) → gom vào 1 cluster, suggest "Lý Minh Hải"
- [ ] "Trương Nam" + "Trư Nam" → KHÔNG gom (khác nhau đủ lớn, hoặc khác tên gốc Trung)
- [ ] Cross-ref: tìm được "朱南" cho cluster "Cư Nam/Trư Nam"
- [ ] Clusters sorted by: inconsistent first, then by totalOccurrences desc

## Notes
- Jaro-Winkler threshold 0.75 cần tuning — có thể expose ra UI cho user adjust
- Cross-reference không phải lúc nào cũng thành công (paragraph count khác nhau, tên nằm giữa câu dài)
- Nên có fallback: nếu cross-ref fail → vẫn show cluster dựa trên fuzzy match thuần

---
Next Phase: [phase-03-ui.md](./phase-03-ui.md)
