# Bridge Watcher

Prototype watcher for the Antigravity bridge.

Commands:

```bash
node scripts/ag-bridge-watcher.mjs --status
node scripts/ag-bridge-watcher.mjs --watch
node scripts/ag-bridge-watcher.mjs --job 2e311f25 --watch
```

What it does:
- Polls the bridge folder.
- Groups files by `jobId`.
- Shows `waiting`, `partial`, `ready`, `done`, `error`, or `locked`.
- Reads inbox files to infer expected chapter count.

What it does not do yet:
- It does not auto-import.
- It does not launch Antigravity.
- It does not translate or write outbox files by itself.
