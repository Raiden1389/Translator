---
title: Term Audit — Post-Translation Consistency Scanner
description: 'Implementation guide for Term Audit feature: anchor-first extraction, bucket clustering, autofix pipeline, and UI integration.'
createdAt: '2026-03-24T06:25:52.367Z'
updatedAt: '2026-03-24T06:25:52.367Z'
tags:
  - term-audit
  - clustering
  - consistency
  - feature
  - v2.11.0
---

# Term Audit — Post-Translation Consistency Scanner

> Session: 2026-03-24 | Version: 2.11.0 | Status: Implemented (feature flag OFF)

## Objective

Phát hiện và sửa các biến thể tiếng Việt của cùng một thuật ngữ trong `content_translated`, không cần source Chinese. Ví dụ:
- `suy diễn giả` ↔ `người suy diễn` ↔ `tên suy diễn`
- `kẻ tuần đêm` ↔ `người gác đêm`
- `nghi thức thăng hoa` ↔ `nghi lễ thăng hoa`

## Architecture

```
content_translated
      ↓
[Extraction] anchor-first (giả/sư/người/kẻ...)
      ↓
[Normalization] NFC + ascii-fold + rootHint
      ↓
[Clustering] bucket-by-rootHint → greedy merge (score ≥ 0.72)
      ↓
[Review Zone] 0.60–0.71 → show, no auto-merge
      ↓
[Autofix] confirmed clusters → sweepSingleRule() → CorrectionEntry
```

## Files

| File | Role |
|------|------|
| `lib/services/term-audit.types.ts` | Types: TermCluster, TermOccurrence, ClusterMode |
| `lib/services/term-audit.extraction.ts` | Anchor-first extractor |
| `lib/services/term-audit.normalization.ts` | NFC + ascii-fold + rootHint |
| `lib/services/term-audit.clustering.ts` | Bucket+greedy+guard |
| `lib/services/term-audit.autofix.ts` | sweepSingleRule + 3 guards |
| `lib/services/term-audit.service.ts` | Orchestrator |
| `hooks/useTermAudit.ts` | React hook state machine |
| `components/.../TermClusterCard.tsx` | Cluster card UI |
| `components/.../TermAuditModule.tsx` | Module UI |
| `__tests__/term-audit.test.ts` | 16 unit tests |

## Key Design Decisions

### 1. Anchor-first Extraction (vs sliding window)
- **Lý do:** Vietnamese novel text tạo quá nhiều n-gram rác với sliding window
- **Cách:** Tìm anchor token trước (hard: giả/sư/tông/môn/phái; soft: người/kẻ/tên), expand trái/phải theo pattern
- **Guard:** Soft wrapper chỉ valid nếu tail có ≥1 content token sau khi strip stopwords

### 2. Cluster Modes
- `auto`: Confidence ≥ 0.72 — merge tự động, user chọn canonical
- `review`: Confidence 0.60–0.71 — hiển thị nhưng KHÔNG merge
- `protected-related`: Term đã có trong Glossary/Correction — chỉ show, không touch

### 3. Canonical Guard (no chain-merge)
- Canonical của cluster A không được là variant của cluster B
- Prevents: A~B mạnh, B~C → A~C merge không mong muốn

### 4. scanRunId Guard
- `confirmed` flag bị reset khi rescan
- Prevents: apply nhầm cluster đã biến dạng sau lần rescan mới

### 5. Autofix Guards (3 bắt buộc)
- `cluster.confirmed === true`
- `cluster.variants.length >= 2`  
- `cluster.scanRunId === currentScanRunId`

## Enable Feature

```typescript
// lib/featureFlags.ts
termAudit: true  // Bật Term Audit tab trong Intelligence Hub
```

## Rollback

```bash
# Option 1: instant
featureFlags.termAudit = false

# Option 2: full removal
rm lib/services/term-audit.*
rm hooks/useTermAudit.ts
rm components/workspace/intelligence/TermCluster*.tsx
rm components/workspace/intelligence/TermAuditModule.tsx
# Revert IntelligenceHub.tsx changes
```

## Test Coverage

16 unit tests in `__tests__/term-audit.test.ts`:
- Normalization (NFC, ascii-fold, rootHint)
- Levenshtein distance
- Tokenization + stopword filtering
- Cluster formation (merge / no-merge / review zone)
- Canonical guard (no chain-merge)
