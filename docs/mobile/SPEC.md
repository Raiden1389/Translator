# 🦅 RAIDEN MOBILE COMPANION — SPEC v1.0

## 1. Overview
PWA tối ưu cho Android, tập trung vào **ĐỌC** + **CẢI CHÍNH** + **ĐỒNG BỘ** với Raiden Desktop.

## 2. Architecture
- **Tech**: Vite + React + Tailwind CSS v4 + Dexie.js
- **Hosting**: Embedded trong Tauri binary (Desktop phục vụ luôn static files qua `tiny_http`)
- **Flow**: Sếp bấm "Start Sync" trên PC → Scan QR trên điện thoại → Trình duyệt mở → Vừa tải App vừa Sync data

## 3. Screens
### 3.1 Library
- Grid view hiển thị bìa truyện + tiến trình đọc
- Sync Status Badge: 🟢 Synced | 🟡 Có sửa chưa push | 🔴 Chưa sync
- FAB "Sync" button

### 3.2 Reader (Core)
- **Infinite Scrolling** (Intersection Observer, windowed 3 chapters in DOM)
- **Chapter Preloading** (N+1, N+2 prefetch)
- **Chapter Divider** (gradient + tên chương + haptic Android)
- **Smart Navbar** (ẩn khi cuộn xuống, hiện khi cuộn lên)
- **Progress Bar** (2px top, % chương hiện tại)
- **Reading Position Sync** (lưu chapterId + scrollPercent + paragraphIndex)
- **Tap Zones** (20-60-20: TOC drawer | Toggle toolbar | Reserved)

### 3.3 Settings (trong toolbar)
- **Theme Toggle**: Huyền Vũ (#000) → Cổ Thư (Sepia) → Thanh Thiên (White)
- **Font Picker**: Literata, Lora, Inter, Noto Serif
- **Text Size Slider**: 14px → 28px (continuous)
- **Line Height Slider**: 1.4 → 2.2 (continuous)
- **CSS Dimmer**: Vuốt cạnh trái chỉnh overlay opacity
- **Storage Usage**: `navigator.storage.estimate()`

### 3.4 Quick Edit (Cải chính)
- Bôi đen text → Floating bubble → Bấm "Sửa"
- Dialog: `[Old text readonly]` + `[New text input]` + `[Scope: Chương này | Tất cả]`
- Save → `replaceAll` trên chapters từ hiện tại trở đi trong IndexedDB
- Tự động thêm vào Dictionary cục bộ
- Đánh dấu dirty để sync về PC

## 4. Sync Protocol
### 4.1 PC → Mobile (Download)
- `GET /manifest` → `{ chapters: [{ id, order, updatedAt }], totalCount }`
- `GET /chapters?offset=0&limit=50` → Chunked pagination
- Delta sync: Mobile gửi `lastSyncAt`, Server trả chapters mới hơn

### 4.2 Mobile → PC (Push back)
- Strategy: **"Mobile Always Wins"**
- Mobile gửi `POST /update` với danh sách chapters đã sửa
- PC nhận → ghi DB → `syncFullStory()` → cập nhật .txt + .json

### 4.3 Security
- One-time token trong QR code
- Server tự tắt sau 5 phút idle
- CORS headers cho mobile browser

## 5. Phasing
| Phase | Scope | Features |
|-------|-------|----------|
| 0 | Skeleton | Vite project, routing, DB schema, shared types |
| 1 | Sync + Library | LAN sync, Library UI, Reading Position |
| 2 | Reader | Infinite Scroll, Themes, Fonts, Settings |
| 3 | Quick Edit | Cải chính flow, Sync back, CSS Dimmer |
| 4 | PWA | Service Worker, Offline, Install prompt |
| 5 | Polish | Drop Cap, Bookmarks, Animations |

## 6. Deferred (v2+)
- Bookmark system
- Volume Key Navigation (needs TWA)
- System Brightness control (needs TWA)
- Multi-device conflict resolution (Operation Log)

---
*Approved by Tông môn Đại hội — 2026-02-11*
