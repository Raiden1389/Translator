# Phase 01: Name Extraction Engine
Status: ✅ Complete
Dependencies: None

## Objective
Tạo service layer có khả năng quét toàn bộ chương đã dịch trong 1 workspace, trích xuất tên riêng từ cả text Việt và text gốc Trung.

## Data Source
```typescript
// Dexie chapters table
interface Chapter {
    id: number;
    workspaceId: string;
    content_original: string;   // Text gốc Trung
    content_translated?: string; // Text dịch Việt
    order: number;
    status: 'draft' | 'translated' | 'reviewing';
}
```

## Implementation Steps

### 1. [ ] Vietnamese Name Extractor (`extractVietnameseNames`)
**File:** `lib/services/name-audit.service.ts`

```typescript
// Regex trích xuất tên riêng tiếng Việt
// Pattern: 2-4 từ viết hoa liên tiếp, không nằm đầu câu sau dấu chấm
// VD: "Cư Nam", "Lý Minh Hải", "Trương Thiên Ái"

const VIET_NAME_REGEX = /(?<![.!?]\s)([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s[A-ZÀ-Ỹ][a-zà-ỹ]+){1,3})/g;

// Filter list — loại bỏ từ phổ biến viết hoa nhưng KHÔNG phải tên riêng
const COMMON_PHRASES = new Set([
    "Việt Nam", "Trung Quốc", "Đại Ca", "Sư Phụ", "Sư Huynh",
    "Thiếu Gia", "Tiểu Thư", "Đại Nhân", "Lão Gia", "Ma Vương",
    "Thần Vương", "Quỷ Vương", "Thánh Nữ", "Thánh Tử",
    // ... thêm khi cần
]);
```

**Output type:**
```typescript
interface NameOccurrence {
    name: string;           // "Cư Nam"
    chapters: number[];     // [6, 7, 8, ..., 45] (chapter orders)
    count: number;          // 20
    contexts: string[];     // Mẫu câu chứa tên (max 3, để review)
}
```

### 2. [ ] Chinese Name Extractor (`extractChineseNames`)
**File:** `lib/services/name-audit.service.ts`

```typescript
// Pattern: Họ phổ biến Trung Quốc (top 100) + 1-2 ký tự
// Danh sách ~100 họ cover 95% tên Trung Quốc
const COMMON_SURNAMES = "赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏" +
    "水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳酆鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐" +
    "于时傅皮卞齐康伍余元卜顾孟平黄和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴谈宋茅" +
    "庞熊纪舒屈项祝董梁杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱骆高夏蔡田" +
    "樊胡凌霍虞万支柯管卢莫经房裘缪干解应宗丁宣贲邓郁单杭洪";

const SURNAME_SET = new Set(Array.from(COMMON_SURNAMES));

// Extract: tìm ký tự trong SURNAME_SET + 1-2 ký tự theo sau
// VD: "朱南走进了房间" → extract "朱南"
```

**Output type:**
```typescript
interface ChineseNameOccurrence {
    name: string;           // "朱南"
    hanViet: string;        // "Chu Nam" (from SyllableRepository)
    chapters: number[];     // chapter orders
    count: number;
}
```

### 3. [ ] Paragraph Alignment (`alignParagraphs`)
**File:** `lib/services/name-audit.service.ts`

```typescript
// Raiden dịch paragraph-by-paragraph nên thứ tự giữ nguyên
// Split cả 2 text theo "\n\n" hoặc "\n" → map theo index
// 
// Input: content_original, content_translated
// Output: Array<{ original: string, translated: string }>
//
// Dùng để cross-reference: 
// Tìm "Cư Nam" ở paragraph dịch thứ 5 
// → Tìm tên Trung ở paragraph gốc thứ 5
// → Map: "朱南" ↔ "Cư Nam"
```

### 4. [ ] Full Scan Orchestrator (`scanWorkspaceNames`)
**File:** `lib/services/name-audit.service.ts`

```typescript
// Main entry point
// 1. Load tất cả chapter đã dịch (status === 'translated')
// 2. Extract Vietnamese names từ content_translated
// 3. Extract Chinese names từ content_original  
// 4. Paragraph alignment để cross-reference
// 5. Return unified result

interface NameAuditResult {
    vietnameseNames: NameOccurrence[];
    chineseNames: ChineseNameOccurrence[];
    crossRefMap: Map<string, string[]>; // chineseName → [vietVariant1, vietVariant2]
    totalChaptersScanned: number;
    scanDuration: number; // ms
}
```

## Files to Create/Modify
- `lib/services/name-audit.service.ts` — **NEW** — Core extraction logic
- `lib/services/name-audit.types.ts` — **NEW** — Shared types

## Test Criteria
- [ ] Quét 100 chapters xong trong < 2 giây (pure string, no API)
- [ ] Regex Vietnamese: bắt "Cư Nam", "Lý Minh Hải", bỏ "Đại Ca", "Sư Phụ"
- [ ] Regex Chinese: bắt "朱南", "李明海", bỏ ký tự ngẫu nhiên
- [ ] HanViet convert: "朱南" → "Chu Nam" (dùng SyllableRepository)
- [ ] Paragraph alignment: index matching khi số paragraph bằng nhau

## Notes
- SyllableRepository phải load trước khi scan (đã có singleton pattern)
- Regex Vietnamese cần handle edge case: tên đầu câu sau dấu chấm
- Chinese name extractor chỉ cần regex đơn giản vì ta chỉ cần **tên**, không cần ngữ nghĩa
- COMMON_PHRASES filter nên để user thêm/bớt được (Phase 3 UI)

---
Next Phase: [phase-02-clustering.md](./phase-02-clustering.md)
