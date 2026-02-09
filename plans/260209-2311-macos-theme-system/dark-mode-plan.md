# 🌙 Plan: macOS Dark Mode Chuẩn Hóa (v2 - Reviewed)

## Mục tiêu
Đảm bảo Dark Mode hoạt động chuẩn macOS, khi toggle không ảnh hưởng Light Mode.
Mọi component dùng semantic token → tự động đổi màu theo theme.

---

## Vấn đề hiện tại

### 1. `macos-overrides.css` chỉ hỗ trợ Light
- Hardcode toàn bộ màu sáng với `!important` → phá dark mode
- Chỉ target `.macos` class nhưng đã bỏ class này → **file vô dụng**

### 2. `isRaidenMode` còn sót 16 files
- Các component vẫn dùng `isRaidenMode` conditional styling → crash runtime

### 3. Hardcoded colors (~30 files)
- Dùng trực tiếp `text-slate-900`, `bg-white`, etc. → Dark mode unreadable

### 4. `toggleRaidenMode` còn sót trong hooks
- Hook vẫn gọi method đã xóa → crash

---

## Phase 0: Freeze Semantic Token Contract ✅ **VERIFIED**

> ⚠️ **Không có phase này = tech debt mới.**
> Mọi replacement trong Phase 1-3 PHẢI tuân theo contract này.

**Status:** ✅ **100% Verified**

### Verification Results:

**✅ All required tokens exist in `themes.css`:**
- Text: `--foreground`, `--muted-foreground`, `--primary`, `--accent`, `--destructive`
- Background: `--background`, `--card`, `--muted`, `--primary`, `--destructive`
- Border: `--border`, `--border-strong`, `--input`
- Foreground on colors: `--primary-foreground`, `--accent-foreground`, `--destructive-foreground`

**✅ Both themes defined:**
- `:root` (Light Mode) - macOS Light colors
- `.dark` (Dark Mode) - macOS Dark colors

**✅ Contract compliance:**
- All tokens follow semantic naming (not color-based)
- Both light and dark values defined for each token
- No hardcoded colors in token definitions

### Text Tokens
| Hardcoded (CẤM) | Semantic Token (DÙNG) | Khi nào |
|------------------|----------------------|---------|
| `text-slate-900`, `text-gray-900`, `text-black` | `text-foreground` | Text chính |
| `text-slate-500`, `text-gray-500`, `text-slate-400` | `text-muted-foreground` | Text phụ, hint |
| `text-blue-600`, `text-blue-500` | `text-primary` | Link, accent text |
| `text-purple-400`, `text-purple-500`, `text-indigo-*` | `text-accent` | Accent text |
| `text-white` (trên primary button) | `text-primary-foreground` | Text trên nền màu |
| `text-red-500`, `text-red-600` | `text-destructive` | Error, danger text |
| `text-slate-200`, `text-gray-200` | `text-foreground` | (dark auto handle) |

### Background Tokens
| Hardcoded (CẤM) | Semantic Token (DÙNG) | Khi nào |
|------------------|----------------------|---------|
| `bg-white`, `bg-slate-50` | `bg-background` | Nền page |
| `bg-white` (trong card) | `bg-card` | Nền card/panel |
| `bg-slate-100`, `bg-gray-100` | `bg-muted` | Nền nhạt, hover |
| `bg-purple-500/20`, `bg-blue-500/20` | `bg-accent/20` | Accent background |
| `bg-purple-500`, `bg-blue-500` | `bg-primary` | Button chính |
| `bg-red-500` | `bg-destructive` | Button nguy hiểm |

### Border Tokens
| Hardcoded (CẤM) | Semantic Token (DÙNG) | Khi nào |
|------------------|----------------------|---------|
| `border-slate-200`, `border-gray-200` | `border-border` | Border chuẩn |
| `border-slate-100` | `border-border/50` | Border nhạt |

### Ngoại lệ cho phép
- **Semantic colors CỐ ĐỊNH** (không đổi theo theme): `text-green-500` (success), `text-orange-500` (warning) → GIỮ NGUYÊN
- **Gradient decorative** trên button CTA → giữ nếu cả 2 mode đều đẹp
- **`text-white` trên badge/pill** có nền màu → giữ nguyên

---

## Architecture Decision: `.dark` class vs `prefers-color-scheme`

> **Source of truth: `.dark` class trên `<html>`**

```
┌─────────────────────────────────────────┐
│ Initial Load:                           │
│   1. Check localStorage("theme")        │
│   2. If null → check prefers-color-scheme│
│   3. Apply .dark class accordingly      │
│                                         │
│ Toggle:                                 │
│   1. Toggle .dark class                 │
│   2. Save to localStorage              │
│                                         │
│ CSS:                                    │
│   :root { /* light vars */ }            │
│   .dark { /* dark vars */ }             │
│   ❌ KHÔNG dùng @media prefers-color-scheme │
│      trong component styles             │
└─────────────────────────────────────────┘
```

---

## Phase 1: Dọn dẹp Raiden Mode ✅ **HOÀN THÀNH**
**Mục tiêu:** Xóa sạch `isRaidenMode` để app không crash

**Status:** ✅ **100% Complete (16/16 files)**

**Quy tắc thay thế:**
- `isRaidenMode ? "dark-color" : "light-color"` → semantic token từ Phase 0
- Xóa `import { useRaiden }` nếu không còn dùng `theme`/`setTheme`
- Xóa `toggleRaidenMode` từ hooks

| # | File | Status |
|---|------|--------|
| 1 | `UsageChart.tsx` | ✅ Xóa `isRaidenMode`, dùng CSS var |
| 2 | `WinnerCard.tsx` | ✅ Xóa conditional styling |
| 3 | `TestSampleCard.tsx` | ✅ Xóa conditional styling |
| 4 | `PromptCard.tsx` | ✅ Xóa conditional styling |
| 5 | `GoalsCard.tsx` | ✅ Xóa conditional styling |
| 6 | `ExportTab.tsx` | ✅ Xóa conditional styling |
| 7 | `CorrectionsView.tsx` | ✅ Xóa conditional styling |
| 8 | `DictionaryRow.tsx` | ✅ Xóa conditional styling |
| 9 | `DictionaryView.tsx` | ✅ Xóa conditional styling |
| 10 | `CharacterTab.tsx` | ✅ Xóa conditional styling |
| 11 | `ChapterSelectionDock.tsx` | ✅ Xóa conditional styling |
| 12 | `CharacterRow.tsx` | ✅ Xóa conditional styling |
| 13 | `CharacterToolbar.tsx` | ✅ Xóa conditional styling |
| 14 | `AISettingsTab.tsx` | ✅ Không có `isRaidenMode` |
| 15 | `ReaderContent.tsx` | ✅ Không có `isRaidenMode` |
| 16 | `ChapterList.tsx` | ✅ Xóa pass-through prop |

**Bonus Cleanup:**
- ✅ Fixed 11 lint errors (unused imports, variables, z-index syntax, setState in effect)
- ✅ Removed all unused `cn` and `useRaiden` imports
- ✅ 0 `isRaidenMode` references remaining in codebase

**Actual Time: ~25 mins** (including lint cleanup)

---

## Phase 2: Xoá `macos-overrides.css` ✅ **HOÀN THÀNH**
**Mục tiêu:** Loại bỏ file chỉ hỗ trợ light + bừa bãi `!important`

**Status:** ✅ **100% Complete**

| # | Hành động | Status |
|---|-----------|--------|
| 1 | Xóa file `app/styles/macos-overrides.css` | ✅ Deleted (199 lines) |
| 2 | Xóa `@import "./styles/macos-overrides.css"` trong `globals.css` | ✅ Removed |
| 3 | Chuyển frosted glass utilities (`macos-blur`, `macos-shadow-*`) sang `utilities.css` | ⏭️ Skipped (không có component nào dùng) |

**Impact:**
- **-199 lines** of dead CSS code
- **0 breaking changes** (verified no usage)
- **Cleaner codebase**

**Actual Time: ~3 mins**

---

## Phase 3: Thay hardcoded colors → Semantic Tokens ⏳ **ĐANG CHỜ**
**Mục tiêu:** Tất cả component tuân theo Phase 0 contract

**Files cần sửa (~20 files):**
```
AISettingsTab.tsx, ChapterCard.tsx, ChapterTable.tsx,
ChapterCardGrid.tsx, ChapterSelectionDock.tsx, ChapterListDialogs.tsx,
DictionaryRow.tsx, DictionaryToolbar.tsx, CharacterRow.tsx,
CharacterToolbar.tsx, ExportTab.tsx, ExportForm.tsx,
HeuristicHeader.tsx, HeuristicForensicDialog.tsx, HeuristicExportDialog.tsx,
PromptCard.tsx, GoalsCard.tsx, TestSampleCard.tsx,
ReaderContent.tsx, GeminiOAuthSettings.tsx, WorkspaceList.tsx
```

**Lưu ý:** Nhiều file đã được xử lý trong Phase 1, cần verify lại.

**Estimate: ~40-50 mins**

---

## Phase 4: Verify & Polish ⏳ **ĐANG CHỜ**
| # | Hành động |
|---|-----------|
| 1 | `pnpm run dev:fast` - 0 errors, 0 `isRaidenMode` |
| 2 | Toggle Light → Dark → Light, check sidebar, tabs |
| 3 | Check Reader modal trong dark mode |
| 4 | Check dialogs/popovers/tooltips trong dark mode |
| 5 | Scrollbar styling cho dark mode (utilities.css) |
| 6 | Check Translation Progress Overlay |
| 7 | Check Dictionary/Character tabs |

**Estimate: ~10 mins**

---

## Estimate Tổng

| Phase | Files | Estimate | Actual |
|-------|-------|----------|--------|
| Phase 0 | 0 (contract) | 0 mins | ✅ 0 mins |
| Phase 1 | 16 files | ~15 mins | ✅ ~25 mins |
| Phase 2 | 2 files | ~2 mins | ✅ ~3 mins |
| Phase 3 | ~20 files | ~40-50 mins | ⏳ TBD |
| Phase 4 | Verify | ~10 mins | ⏳ TBD |
| **TOTAL** | **~38 files** | **~70-80 mins** | **~28 mins (so far)** |

---

## Nguyên tắc bất di bất dịch

1. **KHÔNG bao giờ dùng hardcoded color** trong component TSX
2. **KHÔNG dùng `!important`** trừ override thư viện bên ngoài
3. **Mọi màu** phải đi qua CSS variable (Phase 0 contract)
4. **Light mode KHÔNG BAO GIỜ bị ảnh hưởng** khi sửa dark mode
5. **Test cả 2 mode** sau mỗi batch edit
6. **Source of truth** là `.dark` class, không phải `@media prefers-color-scheme`
7. **Semantic colors cố định** (green/orange/red cho status) được phép giữ
