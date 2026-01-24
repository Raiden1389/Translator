# Holistic Technical Audit: AI Translator (Staff Architect Review)

## Executive Summary (The Brutal Truth)
The application is currently a **"Prototype with Scale Ambitions"**. While the UI is polished and the feature set is rich, the underlying data architecture is a ticking time bomb. The "Sync Worker" implementation and monolithic serialization pattern will cause catastrophic failure (app freezes, data corruption, or memory exhaustion) once a user reaches the 1,000+ chapter milestone. The AI integration lacks global coordination, putting the API key pool at high risk of rapid exhaustion and account flags.

---

## Top 5 Critical Issues

### 1. The "Monolithic Synchronizer" Death Loop (Priority: CRITICAL)
- **Detected in**: `lib/db.ts` (Dirty Flag Sync Worker) & `lib/storageBridge.ts`.
- **Impact**: Every 5 seconds, if *any* change occurs, the app loads **all** chapters and the **entire** dictionary into RAM, serializes them to JSON (with pretty-print whitespace!), and writes them to disk.
- **Why it kills scale**: At 5,000 chapters (~50MB text), you are performing 50MB of Read -> 100MB of Stringify -> 100MB of IO every few seconds. The UI thread will be perpetually blocked by serialization.

### 2. Global Concurrency Blindness (Priority: HIGH)
- **Detected in**: `TranslationProvider.tsx` vs `chunking.ts`.
- **Impact**: Concurrency is managed locally. `TranslationProvider` allows 5 concurrent chapters, and `chunking.ts` allows 3 concurrent chunks per chapter. 
- **The Math**: 15 parallel requests per workspace. If a user opens two workspaces or double-clicks, you hit 30+ requests. 
- **Risk**: You will burn through Gemini's free tier quotas and trigger "Abuse" flags on your IP/Keys near instantly.

### 3. History Bloom (V-RAM Bloat) (Priority: HIGH)
- **Detected in**: `lib/db.ts` (HistoryEntry).
- **Impact**: `HistoryEntry` stores full snapshots of `{ before, after }` chapter content. 
- **Risk**: A single "Batch Correct" on 100 chapters will inject ~2MB * 100 = 200MB into IndexedDB as a **single object**. Dexie/IndexedDB struggles with multi-MB objects due to structured clone overhead.

### 4. Key Pool "Dead Key" Penalty (Priority: MED)
- **Detected in**: `lib/gemini/client.ts` (`withKeyRotation`).
- **Impact**: The rotation logic always tries the `undefined` (primary) key first. 
- **Risk**: If the primary key is exhausted (quota error 429), every single chunk translation in the app will wait for that key to fail before trying a pool key. This adds 1-2s of latency to *every* request.

### 5. O(N) Loop in Import/Export (Priority: MED)
- **Detected in**: `lib/export-import.ts`.
- **Impact**: Importing a dictionary runs a `for` loop with individual `db.dictionary.where().first()` checks.
- **Risk**: Importing a 2,000-entry dictionary will perform 2,000 sequential DB roundtrips. This is significantly slower than a `bulkPut` after a multi-set check.

---

## Hidden Risks
- **SSD Burn-in**: The interval-based JSON flush for large files will drastically reduce SSD lifespan for power users.
- **Memory Fragmentation**: Heavy regex operations in `ReaderModal` on multi-MB strings without Web Workers will lead to "Jank" that increases as the chapter grows.
- **Version Skew**: `rehydrateFromStorage` on mount is a race condition. If the DB is partially populated but the sync worker fires, you might overwrite local data with stale disk data.

---

## Quick Wins (High ROI, <1 Day)
1. **Disable `JSON.stringify` Pretty-print**: Remove the `null, 2` from `storageBridge.ts`. This immediately slashes disk IO and serialization CPU time by ~40%.
2. **Intelligent Key Sorting**: Modify `getAvailableKeys` to move the last failed key to the end of the line for 5 minutes.
3. **Regex Memoization**: Move the `new RegExp` generation for corrections outside the main translation loop.
4. **Global `p-limit`**: Share a single `p-limit` instance across the entire `TranslationProvider` rather than creating one per batch.

---

## Refactor Roadmap

### Immediate (Must Fix)
- **Incremental Sync**: Abandon the "Full Workspace Save". Save individual chapters to individual files (`workspaces/[ws_id]/chapters/[ch_id].json`).
- **Atomic Operations**: Move dictionary and correction imports to `bulkPut`.

### Short-term
- **Global Concurrency Manager**: Create a singleton `AIQueueService` that manages concurrency across the whole app, regardless of which component triggers the request.
- **Off-load Heavy Logic**: Move `inspectChapter` and `formatReaderText` to a Web Worker. The UI thread should only handle DOM updates.

### Long-term
- **SQLite Migration**: IndexedDB is not meant for multi-GB text storage with relational-ish needs. Consider Tauri's SQL plugin with SQLite for better indexing and data safety.

---

## Anti-Patterns Detected
- **The "Everything Hook"**: Hooking DB updates to trigger global disk sync is a massive anti-pattern for performance.
- **Mixed IO**: Doing IO in the main thread (serialization) is dangerous.
- **Try/Catch Silence**: Deep logic in `storageBridge` and `db.ts` uses `catch {}` with no logging. You will lose user data and never know why.

---

## What I Would Refactor FIRST
I would immediately kill the **Flush-to-Disk Sync Worker**. I would replace it with an **Incremental Save System** where each `db.chapters.update` triggers a targeted save for **only** that chapter's JSON file. This removes the O(N) bottleneck and makes the app feel "instant" even with 10,000 chapters.
