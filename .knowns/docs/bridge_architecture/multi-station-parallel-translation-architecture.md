---
title: Multi-Station Parallel Translation Architecture
createdAt: '2026-03-10T14:30:21.752Z'
updatedAt: '2026-03-11T14:35:23.442Z'
description: >-
  Technical documentation for the isolated multi-station parallel translation
  workflow. Covers distribution, CLI auto-open, collection, and UTF-8 encoding
  integrity.
tags:
  - parallel-translation
  - bridge
  - automation
---
# Multi-Station Parallel Translation Architecture (v2.9.5)

## Overview
This architecture enables concurrent translation of multiple novel chapters by distributing the workload across multiple independent AI station workspaces. This bypasses single-agent token limits and model response times while leveraging the free usage quota of multiple AI agents.

## Key Components

### 1. Isolated Workspaces (`scratch/dich-N/`)
To prevent AI agents from "cross-reading" or getting confused by different file paths in the same workspace, each station is given its own physical directory in the `scratch` folder.
- `dich-1/`
- `dich-2/`
- `dich-3/`

Each station contains:
- `input.json`: The specific chapters to translate.
- `GEMINI.md`: Hard-coded translation rules for that station.
- `.agent/workflows/dich.md`: Localized workflow for the `/dich` command.
- `output.json`: The final translation result.

### 2. Distribution Engine (`scripts/bridge-distribute.mjs`)
- **Trigger**: `npm run bd` or `./bd` (shortcut).
- **Logic**: Reads the latest `inbox_*.json` from the Bridge, splits chapters into N chunks, and writes them to the station folders.
- **Auto-Open**: Uses the `antigravity` CLI command to automatically open a new IDE window for each station.

### 3. Collection Engine (`scripts/bridge-collect.mjs`)
- **Trigger**: `npm run bc` or `./bc` (shortcut).
- **Logic**: Merges all `output.json` files from the stations back into individual `out_*.json` files per chapter, compatible with the Bridge protocol.
- **Safety**: Forces UTF-8 encoding during both reading and writing to prevent double-encoding/mojibake issues on Windows systems.

## Workflow Summary
1.  **Export** chapters from the Raiden App (Bridge Export).
2.  **Distribute** via `./bd`.
3.  **Translate** in each station window using the `/dich` command (or "Dịch đi").
4.  **Collect** via `./bc`.
5.  **Import** back into the Raiden App.

## Troubleshooting
### Encoding Issues
If Vietnamese characters (đ, ớ, ...) are mangled, it's usually due to PowerShell's default ANSI encoding when reading/writing. The `bridge-collect.mjs` script (Node.js) is the enforced standard for file processing to ensure UTF-8 integrity.

### Agent Cross-Talk
If an agent in station 2 tries to read a file from station 1, ensure that the workspace is correctly opened to the station's *own* folder, not the parent `scratch` folder.



## Auto-Translation Pipeline (v3.0 — Planned)

### One-Click Flow
App button → `exportInbox()` → shell spawn `bridge-auto-translate.mjs` → distribute to N stations → launch N IDE windows via `antigravity chat --profile translator --mode agent --new-window` → watch for completion → auto-collect → App auto-import.

### Key Parameters
- **Chapters/station:** 3 (default)
- **Max stations:** 6 (cap for 32GB RAM)
- **Station count:** `Math.min(ceil(chapters/3), 6)`
- **Model:** Gemini 3 Flash via IDE profile `translator`
- **QA:** Embedded — agent self-reviews before writing output

### GEMINI.md Upgraded
Station GEMINI.md now includes full rules: pronouns (Ta/Ngươi/hắn/nàng), blacklist phrases, glossary priority, convert smell detection, and mandatory QA self-review step.

### Detailed Plan
See conversation artifact: `auto-translation-plan.md`
