# 🚀 Auto-Translation Pipeline v4.0 — Deck API Orchestrator

> **Status:** PLAN — Chờ implement
> **Updated:** 2026-03-18
> **Base:** Plan v3.0 + Deck Integration Findings (2026-03-13)
> **Context:** Raiden AI Translator (Tauri + Next.js) — Parallel translation via Antigravity Deck API

---

## 1. Tổng Quan

### Thay đổi so với v3.0
Plan v3.0 dùng `antigravity chat --profile translator` qua CLI. Plan v4.0 chuyển sang **Antigravity Deck REST API** (localhost:3500) — đáng tin hơn, kiểm soát được model, poll status realtime.

### Flow v4.0
```
[App] bấm "🚀 Auto Translate"
   ↓
   exportInbox()                          ← có sẵn
   ↓
   shell.spawn('node deck-orchestrator.mjs')
   ↓
   Script:
     1. Ensure Deck running (localhost:3500)
     2. POST /api/settings { autoAccept: true }
     3. Distribute input.json → N station folders
     4. POST /api/workspaces/create-headless × N
     5. POST /api/cascade/submit × N (model: Flash)
     6. Poll GET /api/cascade/:id/status × N
     7. Collect output.json → merge
     8. DELETE /api/workspaces/headless/:pid × N
     9. Write done_*.json sentinel
   ↓
   App poll done_*.json                   ← có sẵn
   ↓
   App auto-import                        ← có sẵn
   ↓
   ✅ Toast: "Dịch xong X chương!"
```

---

## 2. Decisions Log

| # | Vấn đề | v3.0 | v4.0 (Deck) |
|---|--------|------|-------------|
| 1 | Spawn method | `antigravity chat --new-window` | `POST /api/workspaces/create-headless` |
| 2 | Send prompt | CLI args | `POST /api/cascade/submit` |
| 3 | Model select | `--profile translator` | `modelId: "MODEL_PLACEHOLDER_M18"` (Flash) |
| 4 | Poll status | Watch `output.json` file (10s interval) | `GET /api/cascade/:id/status` (realtime) |
| 5 | Kill station | OS process kill | `DELETE /api/workspaces/headless/:pid` |
| 6 | Prerequisite | antigravity CLI installed | Deck server running + 1 IDE mở |

**Giữ nguyên từ v3.0:**
- Station location: `scratch/dich-N/`
- Chapters/station: 3 (default)
- Max stations: 6 (32GB RAM cap)
- Dynamic count: `min(ceil(N/3), 6)`
- QA: Embedded in station (agent tự rà)
- GEMINI.md: Full rules (pronouns, blacklist, glossary, QA)
- Auto-collect + merge

---

## 3. Kiến Trúc Chi Tiết

### 3.1 Component Diagram

```
┌─────────────────────────────────────────────────────┐
│                    RAIDEN APP (Tauri)                │
│                                                     │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │ Bridge UI    │───▶│ exportInbox()             │   │
│  │ [Auto Trans] │    │ → inbox_*.json            │   │
│  └──────────────┘    └──────────┬───────────────┘   │
│                                 │                   │
│                                 ▼                   │
│  ┌──────────────────────────────────────────────┐   │
│  │ @tauri-apps/plugin-shell                     │   │
│  │ Command.create('node', [                     │   │
│  │   'deck-orchestrator.mjs',                   │   │
│  │   jobId, chapterCount                        │   │
│  │ ]) → spawn (non-blocking)                    │   │
│  └──────────────┬───────────────────────────────┘   │
│                 │                                   │
│  ┌──────────────▼───────────────────────────────┐   │
│  │ App continues:                               │   │
│  │ pollJobProgress(jobId) → "⏳ 5/15 ch..."     │   │
│  │ When isDone → importOutbox() → ✅            │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
           │ shell spawn
           ▼
┌─────────────────────────────────────────────────────┐
│            deck-orchestrator.mjs                    │
│            (Node.js — ~250 LOC)                     │
│                                                     │
│  Phase 0: PREFLIGHT                                 │
│  ├─ Check localhost:3500 reachable                  │
│  ├─ POST /api/settings { autoAccept: true }         │
│  └─ GET /api/models → verify Flash available        │
│                                                     │
│  Phase 1: PREPARE                                   │
│  ├─ Read inbox_*.json from bridge folder            │
│  ├─ Parse chapters + glossary                       │
│  ├─ stationCount = min(ceil(N/3), 6)                │
│  └─ Clean old output.json in all target stations    │
│                                                     │
│  Phase 2: DISTRIBUTE                                │
│  ├─ For each station:                               │
│  │   ├─ Create scratch/dich-N/ if not exists        │
│  │   ├─ Write input.json (chapter slice + glossary) │
│  │   └─ Write GEMINI.md (full translation rules)    │
│  └─ Log: "📦 N chapters → M stations"              │
│                                                     │
│  Phase 3: LAUNCH (Deck API)                         │
│  ├─ For each station:                               │
│  │   ├─ POST /api/workspaces/create-headless        │
│  │   │   { path: "C:/.../scratch/dich-N" }          │
│  │   │   → { pid, port, workspaceName }             │
│  │   ├─ POST /api/cascade/submit                    │
│  │   │   { message: "Dịch input.json...",           │
│  │   │     modelId: "MODEL_PLACEHOLDER_M18",        │
│  │   │     workspace: workspaceName }               │
│  │   │   → { cascadeId }                            │
│  │   └─ Store: { stationId, pid, cascadeId }        │
│  └─ Log: "🚀 Launched M stations via Deck"         │
│                                                     │
│  Phase 4: POLL                                      │
│  ├─ Every 5s: GET /api/cascade/:id/status           │
│  │   → status == CASCADE_RUN_STATUS_IDLE = done     │
│  ├─ Track: completed[] / pending[]                  │
│  ├─ Write progress to bridge/progress_*.json        │
│  │   (App reads this for UI progress bar)           │
│  └─ Timeout 15min → partial collect + warn          │
│                                                     │
│  Phase 5: COLLECT & CLEANUP                         │
│  ├─ For each completed station:                     │
│  │   ├─ Read output.json                            │
│  │   ├─ Validate: JSON.parse + chapter count        │
│  │   └─ DELETE /api/workspaces/headless/:pid        │
│  ├─ Merge all outputs → bridge/out_*.json           │
│  ├─ Write done_*.json sentinel                      │
│  └─ Log: "🎉 Done! X chapters collected"           │
└─────────────────────────────────────────────────────┘
           │ Deck API
           ▼
┌─────────────────────────────────────────────────────┐
│         ANTIGRAVITY DECK (localhost:3500)            │
│         (scratch/Antigravity-Deck)                   │
│                                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │ dich-1  │  │ dich-2  │  │ dich-3  │  ...        │
│  │ headless│  │ headless│  │ headless│             │
│  │ 3 ch    │  │ 3 ch    │  │ 3 ch    │             │
│  │ Agent:  │  │ Agent:  │  │ Agent:  │             │
│  │  Dịch   │  │  Dịch   │  │  Dịch   │             │
│  │  QA rà  │  │  QA rà  │  │  QA rà  │             │
│  │  output │  │  output │  │  output │             │
│  └─────────┘  └─────────┘  └─────────┘             │
└─────────────────────────────────────────────────────┘
```

### 3.2 Deck API Reference (đã validate)

```
# Spawn headless station
POST http://localhost:3500/api/workspaces/create-headless
Body: { "path": "C:/Users/Admin/.gemini/antigravity/scratch/dich-1" }
→ { created: true, workspace: { pid, port, workspaceName, headless: true } }

# Enable auto-accept (BẮT BUỘC cho headless)
POST http://localhost:3500/api/settings
Body: { "autoAccept": true }

# Submit translation prompt + chọn model
POST http://localhost:3500/api/cascade/submit
Body: {
  "message": "Đọc input.json, dịch theo GEMINI.md, ghi output.json. Không giải thích.",
  "modelId": "MODEL_PLACEHOLDER_M18",
  "workspace": "dich-1"
}
→ { cascadeId: "abc123" }

# Poll status
GET http://localhost:3500/api/cascade/{cascadeId}/status
→ { status: "CASCADE_RUN_STATUS_IDLE" }  ← = done

# List models + quota
GET http://localhost:3500/api/models
→ { models: [{ label, modelId, quota, resetTime }] }

# Kill station
DELETE http://localhost:3500/api/workspaces/headless/{pid}
```

### 3.3 Station Structure (giữ nguyên v3.0)

```
dich-N/
├── GEMINI.md                    # Rules đầy đủ
├── input.json                   # Chapters + glossary (từ distribute)
└── output.json                  # Kết quả (agent ghi)
```

### 3.4 GEMINI.md Template (giữ nguyên v3.0)

```markdown
# Dịch Station N — Translation Agent

## Vai trò
Dịch giả tiểu thuyết Trung → Việt. Đọc `input.json`, dịch, ghi `output.json`.

## Rules cứng — Ngôi xưng
- 我=Ta, 你=Ngươi (thoại/độc thoại), 他=hắn, 她=nàng (trần thuật)
- CẤM: tôi, bạn, anh, em, mình (trần thuật), của mình
- Tên nhân vật TỐI ĐA 1 lần/đoạn. Phân vân → ẨN chủ ngữ

## Rules cứng — Blacklist
CẤM các cụm sau (thay bằng tiếng Việt tự nhiên):
- hít hơi lạnh, vấn đề không lớn, dường như, tựa hồ
- bất giác, thanh âm vang lên, trong lòng nảy sinh
- công việc độ khó cao

## Rules cứng — Văn phong
- Thoát ý, thuần Việt
- Câu chiến đấu ngắn gọn (3-10 từ). CẤM câu >25 từ
- Viết thường đại từ trừ đầu câu
- Dấu phẩy CẤM sau từ nối đầu câu
- CẤM câu cụt không chủ ngữ mà đọc lên gượng
- CẤM cụm tâm lý literal kiểu Hán văn

## Glossary (ưu tiên CAO NHẤT)
Nằm trong input.json → field "glossary". PHẢI dùng đúng bản dịch trong glossary.
Glossary > mọi rules khác.

## QA — Tự rà trước khi ghi
SAU KHI dịch xong, TRƯỚC KHI ghi output.json:
1. Đọc lại toàn bộ bản dịch
2. Sửa: typo, câu gượng, convert smell, lặp từ, pronoun violations
3. Check glossary: original xuất hiện → translated PHẢI xuất hiện
4. Rồi mới ghi output.json

## Format output.json
[
  { "id": <giữ nguyên>, "order": <giữ nguyên>, "title": "...", "content": "..." }
]

## Lệnh
Đọc input.json → Dịch → QA rà lại → Ghi output.json. Không giải thích.
```

### 3.5 Station Count Logic (giữ nguyên v3.0)

```javascript
function getStationCount(chapterCount, maxStations = 6, chaptersPerStation = 3) {
  if (chapterCount <= 1) return 1;
  return Math.min(Math.ceil(chapterCount / chaptersPerStation), maxStations);
}
```

---

## 4. Implementation Phases

### Phase 1: Script Core ⭐ (ưu tiên cao nhất)
**File:** `scripts/deck-orchestrator.mjs` (~250 LOC)
**Scope:** Orchestrator hoàn chỉnh: preflight → distribute → launch → poll → collect
**Test:** `node scripts/deck-orchestrator.mjs --job test --chapters 9`
**Prerequisite:**
- Deck đang chạy (`npm run dev` trong `scratch/Antigravity-Deck`)
- 1 IDE mở (để headless LS mượn auth)

### Phase 2: CLI Verify
- [ ] Chạy orchestrator với 3 chapters → 1 station
- [ ] Chạy với 9 chapters → 3 stations song song
- [ ] Verify output.json format + quality
- [ ] Test timeout (kill station giữa chừng)
- [ ] Test Deck down (graceful error handling)

### Phase 3: App Integration
- `src-tauri/capabilities/default.json` — shell execute permission
- Bridge UI — nút "Auto Translate" + Command.create() handler
- Progress bar đọc `progress_*.json`

### Phase 4: Polish
- Sound notification khi xong
- Auto-retry failed stations
- Quota check trước khi launch (`GET /api/models`)
- `--per-station` và `--max-stations` CLI flags

---

## 5. Files To Create / Modify

### New files
| File | Mô tả | LOC |
|------|-------|-----|
| `scripts/deck-orchestrator.mjs` | Orchestrator script | ~250 |

### Modified files (Phase 3)
| File | Thay đổi |
|------|---------|
| `src-tauri/capabilities/default.json` | Thêm `shell:allow-execute` |
| Bridge UI component | Nút "Auto Translate" + handler |
| `package.json` | Script: `"bat": "node scripts/deck-orchestrator.mjs"` |

---

## 6. Edge Cases & Safety

| Risk | Impact | Mitigation |
|------|--------|------------|
| Deck server not running | 🔴 | Phase 0 preflight check, báo lỗi rõ |
| Không có IDE nào mở | 🔴 | Headless LS cần extension_server auth → check trước |
| Quota hết giữa chừng | 🟡 | Check `GET /api/models` trước launch |
| 1 station cascade fail | 🟡 | Partial collect + retry option |
| output.json ghi dở | 🟡 | Validate JSON.parse + chapter count |
| Station hang (cascade never idle) | 🟡 | Timeout 15 phút → kill + partial |
| Deck API thay đổi version | 🟢 | Pin Deck version, check response format |
| RAM overload (>6 stations) | 🟢 | Cap mặc định 6, ~300MB/station |

---

## 7. Giới Hạn Đã Biết

- **Cần 1 IDE mở** — headless LS mượn extension_server auth
- **Quota chung** — N stations ăn quota N lần nhanh hơn
- **RAM** — ~300MB/station, 6 stations ≈ 1.8GB thêm
- **Auto-accept** — chỉ approve file TRONG workspace (an toàn)
- **Deck phải chạy** — `npm run dev` trong scratch/Antigravity-Deck

---

## 8. Tóm Tắt

```
 v3.0 (CLI)                      v4.0 (Deck API)
┌────────────────┐            ┌────────────────┐
│ antigravity CLI │            │ Deck REST API  │
│ --profile flag  │  ──────▶  │ modelId param   │
│ Watch file poll │            │ cascade/status  │
│ OS process kill │            │ API DELETE      │
│ No validation   │            │ Quota check     │
└────────────────┘            └────────────────┘
```

**Next step khi sẵn sàng:** Chạy `/code` cho Phase 1 — viết `deck-orchestrator.mjs`.
