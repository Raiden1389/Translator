# Phase 03: Review UI (Hub Tab)
Status: ✅ Complete
Dependencies: Phase 01, Phase 02

## Objective
Thêm tab **"Name Audit"** vào Intelligence Hub, hiển thị kết quả scan dưới dạng bảng interactive cho Sếp review và chọn tên chuẩn.

## Implementation Steps

### 1. [ ] Register Tab trong Intelligence Hub
**File:** `components/workspace/intelligence/IntelligenceHub.tsx`

```typescript
// Thêm vào navItems:
{ id: "nameAudit", label: "Name Audit", icon: UserSearch, sub: "Nhất quán tên" }

// Thêm vào ModuleType:
type ModuleType = "discovery" | "glossary" | "persona" | "tuning" | "sanitizer" | "nameAudit";

// Render:
{activeModule === "nameAudit" && <NameAuditModule workspaceId={workspaceId} />}
```

### 2. [ ] NameAuditModule Component
**File:** `components/workspace/intelligence/NameAuditModule.tsx` — **NEW**

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  📊 Name Audit                                         │
│  Scanned: 847 chapters | 156 unique names              │
│  ⚠️ 12 inconsistencies detected                        │
│                                                         │
│  [🔍 Scan Now]  [Filter: ⚠️ Inconsistent Only ▼]      │
│─────────────────────────────────────────────────────────│
│                                                         │
│  ┌─ 朱南 (Chu Nam) ──── Confidence: 95% ──────────┐   │
│  │                                                  │   │
│  │  ● Cư Nam  ████████████████████  20× (ch.6-45) │   │
│  │  ○ Trư Nam ██████████            10× (ch.1-5)  │   │
│  │                                                  │   │
│  │  📖 Context: "...Cư Nam bước vào phòng..."     │   │
│  │                                                  │   │
│  │  Tên chuẩn: [ Cư Nam ▼ ]          [✓ Confirm]  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ 李明海 (Lý Minh Hải) ── Confidence: 100% ────┐   │
│  │  ...                                             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  [✅ Apply All Confirmed Fixes]                         │
└─────────────────────────────────────────────────────────┘
```

**States:**
1. **Idle** — Chưa scan, hiện nút "Scan Now"
2. **Scanning** — Progress bar + "Đang quét X/Y chương..."
3. **Results** — Bảng clusters, filter, confirm
4. **Applying** — Progress "Đang fix X/Y chương..."
5. **Done** — Tổng kết "Đã fix N chương, M corrections tạo mới"

### 3. [ ] NameClusterCard Component  
**File:** `components/workspace/intelligence/NameClusterCard.tsx` — **NEW**

Props:
```typescript
interface NameClusterCardProps {
    cluster: NameCluster;
    onSelectCanonical: (clusterId: string, canonicalName: string) => void;
    onDismiss: (clusterId: string) => void; // "Không phải cùng người"
}
```

Features:
- **Bar chart** hiển thị frequency mỗi variant (proportional width)
- **Radio select** chọn tên chuẩn (default = highest frequency)
- **Dropdown** override tên chuẩn (nhập tay nếu cần)
- **Context preview** — expand/collapse mẫu câu chứa tên
- **Dismiss button** — "Đây không phải cùng 1 người" → bỏ khỏi fix list
- **Chinese source badge** — hiện "朱南 (Chu Nam)" nếu cross-ref thành công
- **Confidence indicator** — dot color: green (>80%), yellow (60-80%), red (<60%)

### 4. [ ] Hook: `useNameAudit`
**File:** `components/workspace/intelligence/hooks/useNameAudit.ts` — **NEW**

```typescript
function useNameAudit(workspaceId: string) {
    const [report, setReport] = useState<NameAuditReport | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
    const [confirmedFixes, setConfirmedFixes] = useState<Map<string, string>>(); 
    // clusterId → chosen canonical name

    const startScan = async () => { ... };
    const selectCanonical = (clusterId: string, name: string) => { ... };
    const dismissCluster = (clusterId: string) => { ... };
    const applyAllFixes = async () => { ... }; // → Phase 04

    return { report, isScanning, scanProgress, confirmedFixes, 
             startScan, selectCanonical, dismissCluster, applyAllFixes };
}
```

## Files to Create/Modify
- `components/workspace/intelligence/IntelligenceHub.tsx` — **MODIFY** — Add tab
- `components/workspace/intelligence/NameAuditModule.tsx` — **NEW** — Main module
- `components/workspace/intelligence/NameClusterCard.tsx` — **NEW** — Cluster card
- `components/workspace/intelligence/hooks/useNameAudit.ts` — **NEW** — Logic hook

## Test Criteria
- [ ] Tab "Name Audit" hiện trong Hub sidebar với icon UserSearch
- [ ] Click "Scan Now" → loading state → kết quả hiện đúng
- [ ] Cluster card hiển thị frequency bar, tên gốc Trung + Hán Việt
- [ ] Radio select chọn tên chuẩn hoạt động
- [ ] Filter "Inconsistent Only" ẩn các tên nhất quán
- [ ] Dismiss cluster hoạt động (loại khỏi fix list)
- [ ] Responsive: không vỡ layout trên màn hình nhỏ hơn

## Notes
- Dùng design tokens có sẵn (border colors, spacing 4/8/12/16/24/32)
- Animation duration < 200ms
- Nút Scan nên disable khi đang scan
- Progress feedback quan trọng vì scan 800+ chapters có thể mất vài giây
- Bar chart dùng CSS width proportional, không cần chart library

---
Next Phase: [phase-04-autofix.md](./phase-04-autofix.md)
