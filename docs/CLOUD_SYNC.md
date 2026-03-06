# ☁️ Cloud Sync — Technical Reference

> Push workspaces from Desktop → R2 Cloud → Auto-pull on Mobile.
> No tunnel, no LAN, no WiFi pairing.

## Architecture

```
┌─────────────────┐       PUT /api/sync/{wsId}        ┌──────────────┐
│  ai-translator   │ ─────────────────────────────────► │  raidenhub.xyz │
│  (Tauri Desktop) │       (body: JSON stream)         │  CF Worker    │
│                  │       (headers: title, count)     │  + R2 Bucket  │
└─────────────────┘                                    └──────┬───────┘
                                                              │
                                                     GET /api/sync/{wsId}
                                                              │
┌─────────────────┐       auto-pull on mount           ┌──────▼───────┐
│  raiden-mobile   │ ◄──────────────────────────────── │  R2: raiden-  │
│  (Cloudflare     │       (compare counts)            │  sync bucket  │
│   Pages PWA)     │                                    └──────────────┘
└─────────────────┘
```

## 3 Codebases

### 1. `raiden-sync/` — Cloudflare Worker

**Location:** `~/.gemini/antigravity/scratch/raiden-sync/`
**Deployed at:** `raidenhub.xyz/api/sync/*`
**Bundle:** ~6.4 KiB

#### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/sync/list` | List all workspaces with metadata |
| `PUT` | `/api/sync/{wsId}` | Desktop pushes workspace (gzip + delta support) |
| `GET` | `/api/sync/{wsId}` | Mobile pulls full workspace JSON |
| `POST` | `/api/sync/{wsId}/corrections` | Mobile pushes corrections |
| `GET` | `/api/sync/{wsId}/corrections` | Desktop pulls corrections |

#### Auth
- **Bearer token** via `SYNC_TOKEN` Cloudflare secret
- Value: `010389`
- Header: `Authorization: Bearer 010389`

#### R2 Structure
```
raiden-sync (bucket)
└── ws/
    ├── {uuid}/
    │   ├── data.json        ← full workspace (chapters + dictionary)
    │   ├── meta.json        ← lightweight {title, chapterCount, pushedAt}
    │   └── corrections.json ← mobile corrections
    └── ...
```

#### Key Design: Streaming Upload + Gzip + Delta
Worker streams `req.body` directly to R2 — **no buffering in memory**.
Metadata (title, chapter count) sent via headers:
- `X-Ws-Title`: `encodeURIComponent(title)` (Unicode-safe)
- `X-Ws-Chapters`: `"173"`
- `Content-Encoding`: `gzip` → Worker auto-decompresses before storing
- `X-Delta`: `true` → Worker loads existing data, merges by `chapter.order`, saves back

#### Deploy
```bash
cd raiden-sync
npx wrangler deploy
```

---

### 2. `ai-translator/` — Desktop (Tauri)

**Key files:**
- `lib/sync/cloud-sync.ts` — API client
- `components/workspace/shared/CloudSyncButton.tsx` — UI
- `components/workspace/hooks/TranslationProvider.v2.tsx` — auto-push hook

#### `cloud-sync.ts` API

```typescript
// Token management
setToken(token: string)
hasToken(): boolean

// Push (full)
pushWorkspace(workspaceId): Promise<{chapterCount, sizeKB}>

// Push (delta — only changed chapters, gzip compressed)
pushDelta(workspaceId): Promise<{chapterCount, sizeKB, delta: boolean}>

// Push all (uses pushDelta per workspace)
pushAllDirty(onProgress?): Promise<{pushed, skipped, errors}>

// Pull
listCloudWorkspaces(): Promise<CloudWorkspaceInfo[]>
pullCorrections(workspaceId): Promise<CorrectionEntry[]>
```

#### Push Strategy

| Function | When | Logic |
|----------|------|-------|
| `pushWorkspace` | First push ever | Full workspace, gzip compressed |
| `pushDelta` | Auto-push / manual | Only chapters where `lastTranslatedAt > lastPushTime` |
| `pushAllDirty` | "Push All" button | Calls `pushDelta()` per workspace |

**Re-translate detection**: `pushDelta` uses `lastTranslatedAt` timestamp (set by both single & batch orchestrator) — catches NEW chapters AND re-translated ones.

#### Auto-Push (after translation)
In `TranslationProvider.v2.tsx`, step 6 after `onComplete()`:
```typescript
import("@/lib/sync/cloud-sync").then(({ hasToken, pushDelta }) => {
    if (!hasToken()) return;
    pushDelta(workspaceId).then(result => {
        toast.success(`☁️ Đã sync +${result.chapterCount} chương lên cloud`);
    });
});
```

#### Gzip Compression
All pushes compress JSON using `CompressionStream("gzip")` before sending.
Typical reduction: **5MB → 1.2MB (~76%)**. Falls back to uncompressed if API unavailable.

#### Tauri Security (CRITICAL)
Both files must have `raidenhub.xyz`:
- `src-tauri/tauri.conf.json` → `security.csp` → `connect-src`
- `src-tauri/tauri.fast.conf.json` → same
- `src-tauri/capabilities/default.json` → `http:allow-fetch`

Without CSP: `fetch()` silently fails with "Failed to fetch".

---

### 3. `raiden-mobile/` — PWA (Cloudflare Pages)

**Deployed at:** `raiden-reader.pages.dev` (custom domain: `raidenhub.xyz`)
**Key files:**
- `src/lib/cloudSync.ts` — API client
- `src/components/CloudSyncDialog.tsx` — UI dialog
- `src/pages/Library.tsx` — auto-sync hook

#### `cloudSync.ts` API

```typescript
// Token
setCloudToken(token), hasCloudToken()

// Subscribe management (localStorage)
subscribe(wsId), unsubscribe(wsId), isSubscribed(wsId)

// Cloud operations
listCloudWorkspaces(): Promise<CloudWorkspaceInfo[]>
pullWorkspace(wsId, onProgress?): Promise<{chapterCount}>
pushCorrectionsToCloud(wsId): Promise<number>
removeWorkspace(wsId): Promise<void>

// Auto-sync (THE KEY FUNCTION)
autoSyncUpdated(): Promise<{updated, checked}>
```

#### Auto-Sync on Mount (`Library.tsx`)
```typescript
useEffect(() => {
    autoSyncUpdated().then(result => {
        if (result.updated.length > 0) {
            setSyncToast(`☁️ Cập nhật: ${summary}`);
        }
    });
}, []);
```

Logic:
1. Fetch cloud list
2. For each local workspace: if `cloud.chapterCount > localCount` → `pullWorkspace()`
3. Toast: `"☁️ Cập nhật: Zombie (+5)"`

#### Deploy
```bash
cd raiden-mobile
npm run build
cd ../Exe/mobile-dist
npx wrangler pages deploy . --project-name raiden-reader
```

---

## Bugs & Fixes Log

| Bug | Root Cause | Fix |
|-----|-------|-----|
| Worker OOM crash | `req.text()` buffers entire body | Stream `req.body` to R2 |
| `non ISO-8859-1 code point` | Vietnamese in HTTP headers | `encodeURIComponent()` |
| `Failed to fetch` (silent) | Tauri CSP missing domain | Add `raidenhub.xyz` to `connect-src` |
| `Already up to date` (wrong) | Dirty check compared oldest chapter date | Compare chapter counts vs cloud list |
| viewMode resets on update | `useState('grid')` not persisted | `localStorage.getItem('library_viewMode')` |

## Environment

| Component | Service | URL |
|-----------|---------|-----|
| Worker | Cloudflare Workers | `raidenhub.xyz/api/sync/*` |
| Storage | Cloudflare R2 | bucket: `raiden-sync` |
| PWA Host | Cloudflare Pages | `raiden-reader.pages.dev` |
| Auth | CF Secrets | `SYNC_TOKEN` = `010389` |
