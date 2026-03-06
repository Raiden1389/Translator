---
title: Cloud Sync Implementation v2.8.0
createdAt: '2026-03-04T14:57:20.706Z'
updatedAt: '2026-03-04T15:23:58.698Z'
description: >-
  Full cloud sync implementation across 3 codebases: raiden-sync worker,
  ai-translator desktop, raiden-mobile PWA
tags:
  - sync
  - cloudflare
  - r2
  - worker
  - mobile
  - desktop
---
# Cloud Sync Implementation v2.8.0

## Architecture
```
Desktop (Tauri) → pushWorkspace() → raidenhub.xyz/api/sync/* → R2 Bucket
Mobile (PWA)   ← autoSyncUpdated() ← raidenhub.xyz/api/sync/* ← R2 Bucket
```

## 3 Codebases Modified

### 1. raiden-sync (NEW — Cloudflare Worker)
- `src/index.ts` — 5 endpoints, R2-backed, bearer token auth
- Stream body to R2 (no OOM), metadata via headers
- `decodeURIComponent()` for Unicode titles
- `customMetadata` on R2 objects for Dashboard visibility

### 2. ai-translator (Desktop) v2.8.0
- `lib/sync/cloud-sync.ts` — push/pull/list/dirty-check
- `CloudSyncButton.tsx` — compact popover (summary + push)
- `TranslationProvider.v2.tsx` — auto-push after translate
- CSP `connect-src` + capabilities updated for raidenhub.xyz
- Smart dirty check: compare local count vs cloud list

### 3. raiden-mobile (PWA) v1.8.0
- `lib/cloudSync.ts` — pull/subscribe/corrections/autoSync
- `CloudSyncDialog.tsx` — workspace selection + progress
- `LibraryHeader.tsx` — ☁️ Cloud Sync menu item
- Auto-sync on Library mount
- viewMode persisted to localStorage
- Deployed to Cloudflare Pages (raiden-reader.pages.dev)

## Key Bugs Fixed
1. **OOM crash** — Worker parsed full JSON body → stream to R2
2. **ISO-8859-1 error** — Vietnamese in headers → encodeURIComponent
3. **CSP blocking fetch** — connect-src missing raidenhub.xyz
4. **Dirty check skip** — was comparing oldest chapter date → now compares counts

## Deployment
- Worker: `npx wrangler deploy` in raiden-sync/
- Mobile: `npm run build` in raiden-mobile/ then `npx wrangler pages deploy`
- Desktop: `bxf` in ai-translator/



## Phase 2: Gzip + Delta Sync

### Gzip Compression
- Desktop: `CompressionStream("gzip")` before push (~76% reduction)
- Worker: `DecompressionStream("gzip")` → stores raw JSON in R2
- Fallback: if CompressionStream unavailable, sends uncompressed

### Delta Sync
- `pushDelta()`: sends only chapters where `lastTranslatedAt > lastPushTime`
- Worker: loads existing data.json, merges by `chapter.order`, saves back
- Falls back to full push if no previous push exists

### Re-translate Detection
- Bug: count-based delta missed re-translated chapters
- Fix: timestamp-based — `lastTranslatedAt > lastPushTime`
- Both single & batch orchestrator set `lastTranslatedAt: new Date()`
- `pushAllDirty()` unified to use `pushDelta()` per workspace
