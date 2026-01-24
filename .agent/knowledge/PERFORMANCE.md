# Performance Monitoring Workflow

Every update MUST undergo a performance impact assessment to ensure the "Max Ping" experience remains fluid.

## 1. AI Prompt Overhead (Token Efficiency)
When modifying `constants.ts` or system instructions:
- **Rule:** Keep system instructions under 2000 characters.
- **Check:** Measure the delta in `promptTokenCount`.
- **Optimization:** Use minified rules (like `CORE_RULES`) to save metadata tokens.

## 2. Silent Performance Killers (Critical Vigilance)
These are hidden bottlenecks that don't always show up in simple tests but kill the "Vibe":
- **useEffect without dependency array:** Leads to infinite render loops.
- **Recreating `pLimit` inside render loops:** Breaks concurrency management.
- **Async calls inside map without limiter:** Spams the backend/API simultaneously.
- **JSON.stringify on large objects during render:** Blocks the main thread.

## 3. Fast Rollback Rule (The Lifeboat)
"Vibe coding" requires failing fast and recovering faster:
- **One-Commit Rule:** Any performance regression MUST be reversible within exactly 1 commit.
- **Atomicity:** Avoid mixing performance-sensitive refactors with new feature implementations.

## 4. API & Network Latency
- **Worker Concurrency:** Ensure "Max Ping" parallel workers do not exceed the user-defined `maxConcurrency` (Default: 5).
- **Latency Check:** Translation of a standard 3000-character chapter should take 4-8 seconds on Gemini Flash.

## 5. Storage & I/O (IndexedDB)
- **Batch Operations:** Always use `bulkAdd`, `bulkPut`, or `bulkDelete` (via Dexie) for operations involving >10 items.
- **History Snapshot:** Limit history snapshots to the last 10 actions per workspace to prevent database bloating.

## 6. UI Responsiveness
- **Virtualization:** Ensure `ChapterTable` and list views use virtualization (from `@tanstack/react-virtual`) when rendering >50 chapters.
- **Debounced Inputs:** Inline editing (like in CharacterTab) must use `onBlur` or debounced `onChange` (300ms) to prevent excessive DB writes.

## 7. Build Size
- **Analysis:** Run `npm run build` and check the "Route (app)" output.
- **Standard:** Every main route bundle should be < 500KB.
