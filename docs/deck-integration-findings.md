# 🔗 Antigravity Deck — Multi-Station Translation Findings
> Ngày: 2026-03-13 | Status: Research Done, Ready for Implementation

## TL;DR
- **Antigravity Deck** (github.com/tysonnbt/Antigravity-Deck) = web dashboard điều khiển Antigravity IDE qua API
- Đã test thành công: spawn headless LS + gửi prompt + nhận output
- Có thể dùng Deck làm middleware cho multi-station dịch song song
- Model rẻ nhất: **Gemini 3 Flash** (`MODEL_PLACEHOLDER_M18`)

## Deck đã cài ở đâu
```
C:\Users\Admin\.gemini\antigravity\scratch\Antigravity-Deck
```
Chạy: `npm run dev` (dev) hoặc `npm run online` (Cloudflare tunnel)

## API Endpoints quan trọng

### Spawn station (headless, không cần mở IDE UI)
```
POST http://localhost:3500/api/workspaces/create-headless
Body: { "path": "C:/path/to/station-folder" }
→ { created: true, workspace: { pid, port, workspaceName, headless: true } }
```

### Gửi prompt + chọn model (1 lệnh gộp)
```
POST http://localhost:3500/api/cascade/submit
Body: {
  "message": "Dịch input.json theo GEMINI.md, ghi output.json",
  "modelId": "MODEL_PLACEHOLDER_M18",
  "workspace": "station-1"
}
→ { cascadeId: "abc123" }
```

### Poll trạng thái
```
GET http://localhost:3500/api/cascade/{cascadeId}/status
→ { status, stepCount, summary }
```

### Kill station
```
DELETE http://localhost:3500/api/workspaces/headless/{pid}
```

### List models + quota
```
GET http://localhost:3500/api/models
→ { models: [{ label, modelId, quota, resetTime }] }
```

### Bật auto-accept (BẮT BUỘC cho headless)
```
POST http://localhost:3500/api/settings
Body: { "autoAccept": true }
```

## Quyết định kiến trúc

**Dùng Deck làm middleware** (không reverse engineer):
- Deck xử lý hết phần khó: headless spawn, auto-accept, protobuf, process scan
- Raiden chỉ gọi REST API đơn giản
- Ông tysonnbt maintain + update theo Antigravity versions

## Flow tích hợp dự kiến

```
User: Mở Antigravity IDE (1 lần) → Mở Raiden
Raiden:
  1. Check localhost:3500 → nếu chưa chạy → spawn `node server.js`
  2. POST /api/settings { autoAccept: true }
  3. Spawn N stations (create-headless)
  4. Copy input.json + GEMINI.md vào mỗi station
  5. POST /api/cascade/submit cho từng station (model: Flash)
  6. Poll status → hiện progress bar
  7. Collect output.json → merge
  8. Kill stations
```

## Giới hạn
- **Cần 1 IDE mở** → headless LS mượn extension_server auth
- **Quota chung** → N stations ăn quota N lần nhanh hơn
- **RAM** → ~300MB/station, 6 stations ≈ 1.8GB thêm
- **Auto-accept** → chỉ approve file TRONG workspace (an toàn)

## Test results
- 2 headless stations spawned OK (dich-1, dich-2)
- Output.json produced correctly
- Model selection works (Gemini 3 Flash confirmed)
