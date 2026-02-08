---
title: Component Standards
createdAt: '2026-02-04T13:12:00.000Z'
updatedAt: '2026-02-04T13:12:00.000Z'
description: Anti-God Component Checklist - Production-Ready Standards
tags: [standards, components, best-practices, react]
---

# 🧠 Anti-God Component Checklist

> **Purpose:** Prevent bloated, unmaintainable components. Keep code clean, testable, and scalable.

---

## 1️⃣ Responsibility – Trách nhiệm

⛔ **Component chỉ làm 1 việc chính**
- Không vừa UI + business logic + fetch + state global

✅ **Tên component nói rõ nó làm gì**
- `ChapterRow` ✅ (rõ ràng)
- `Handler` ❌ (quá chung chung)

**Fail Example:**
```tsx
// ❌ ReaderHeader.tsx vừa render UI, vừa fetch chapter, vừa xử lý keybind
```

---

## 2️⃣ Size – Kích thước

⚠️ **> 200 LOC** → nghi ngờ  
❌ **> 300 LOC** → tách ngay

✅ **JSX dài** → tách sub-component  
✅ **Logic dài** → tách hook

**Rule ngầm:** "Mở file mà lăn chuột mệt là sai"

---

## 3️⃣ State Ownership – Quyền sở hữu state

⛔ **Không giữ state không dùng để render**
⛔ **Không giữ state chỉ để pass xuống 1 cấp**

✅ **UI state** → component  
✅ **Business / cross-component** → hook / store

---

## 4️⃣ Side Effects – useEffect

⛔ **useEffect > 3 cái** → xem lại kiến trúc  
⛔ **useEffect làm nhiều việc**

✅ **1 effect = 1 mục đích**  
✅ **Logic effect** → custom hook

**🚨 Red Flag:**
```tsx
useEffect(() => {
  fetch()
  setState()
  addEventListener()
}, [])
```

---

## 5️⃣ Props – Giao tiếp

⛔ **Props > 7 cái** → tách object / context  
⛔ **Props kiểu `any`**  
⛔ **Props chỉ để pass tiếp**

✅ **Props rõ nghĩa, có interface/type**

---

## 6️⃣ Logic vs View – Tách bạch

⛔ **Không `if` / `for` / `switch` phức tạp trong JSX**  
⛔ **Không nhét tính toán vào render**

✅ **View = dumb**  
✅ **Logic = hook**

**Rule:** JSX phải đọc như HTML, không như thuật toán

---

## 7️⃣ Reusability – Khả năng tái sử dụng

⛔ **Component dùng được 1 chỗ duy nhất vì dính context**  
⛔ **Hardcode text, key, config**

✅ **Inject bằng props**  
✅ **Có thể mock dễ**

---

## 8️⃣ Dependency – Phụ thuộc

⛔ **Import quá nhiều module không liên quan**  
⛔ **Import vòng (circular)**

✅ **Import có thứ tự:** lib → hook → ui → util

---

## 9️⃣ Performance – Hiệu năng

⛔ **Re-render vì state không liên quan**  
⛔ **Function inline trong JSX quá nhiều**

✅ **Memo khi cần** (useMemo, useCallback)  
❗ **Không memo mù**

---

## 🔟 Naming – Đặt tên

⛔ **Tên chung chung:** Handler, Utils, Stuff  
⛔ **Hook tên không bắt đầu bằng `use`**

✅ `useReaderProgress`  
✅ `ChapterNavigation`

---

## 1️⃣1️⃣ Testability – Test được

⛔ **Không mock được**  
⛔ **Logic dính chặt DOM**

✅ **Hook test riêng**  
✅ **Component render test được**

---

## 1️⃣2️⃣ Smell List – Ngửi mùi là tách ngay

❌ Comment kiểu: `// hack`, `// tạm`  
❌ Boolean flag chồng chéo  
❌ `if (mode === 'A' || mode === 'B' || mode === 'C')`  
❌ Component cần đọc lại 2 lần mới hiểu

---

## 1️⃣3️⃣ Hook Dependencies (Dependency Hell)

⛔ **useEffect với deps array dài > 5 items**  
⛔ **deps array có object/array** (gây re-render vô tận)

✅ **Dùng useCallback/useMemo cho object deps**  
✅ **Tách effect thành nhiều effect nhỏ hơn**

**🚨 Red Flag:**
```tsx
useEffect(() => {
  // ...
}, [a, b, c, d, e, f, g, h]) // 8 deps = nguy hiểm
```

---

## 1️⃣4️⃣ Event Handler Naming

⛔ `onClick={handleClick}` // quá chung chung  
⛔ `onClick={doStuff}` // không rõ ràng

✅ `onClick={handleChapterSelect}`  
✅ `onSubmit={handleTranslationSubmit}`

**Rule:** `handle + [Action] + [Subject]`

---

## 1️⃣5️⃣ Early Return Pattern

⛔ **Nested if quá sâu (> 3 levels)**

✅ **Dùng early return để flatten logic**

**Example:**
```tsx
// ❌ Bad
if (data) {
  if (data.chapters) {
    if (data.chapters.length > 0) {
      return <List />
    }
  }
}

// ✅ Good
if (!data) return null;
if (!data.chapters) return null;
if (data.chapters.length === 0) return <Empty />;
return <List />;
```

---

## 1️⃣6️⃣ Custom Hook Extraction

⛔ **Logic lặp lại ở nhiều component**  
⛔ **useEffect + useState luôn đi cùng nhau**

✅ **Tách thành custom hook**

**Examples:**
- `useAiQueueStatus`
- `useReaderSettings`
- `useTranslationQueue`

---

## 1️⃣7️⃣ Context Abuse

⛔ **Context cho mọi thứ** (theme, user, settings, data...)  
⛔ **Context re-render toàn bộ tree**

✅ **Tách context theo domain**  
✅ **Dùng Context cho global state, Props cho local state**

---

## 1️⃣8️⃣ Magic Numbers/Strings

⛔ `if (status === 'translated')` // hardcode  
⛔ `setTimeout(() => {}, 3000)` // 3000 là gì?

✅ `const STATUS = { TRANSLATED: 'translated' }`  
✅ `const DEBOUNCE_DELAY = 3000`

---

## 🛑 PHÁN QUYẾT CUỐI

**Vi phạm ≥ 3 mục** → TÁCH  
**Vi phạm ≥ 5 mục** → GOD COMPONENT  
**Vi phạm ≥ 7 mục** → ĐẬP XÂY LẠI

---

## 📊 Current Project Status

### 🟡 Cần Chú Ý:

**TranslationProvider.tsx** (~400 LOC)
- Vi phạm: Size (300+), State Ownership
- Đề xuất: Tách `useTranslationQueue`, `useProgressTracking`

**ReaderModal.tsx** (~500 LOC)
- Vi phạm: Size, Logic vs View
- Đề xuất: Tách `useReaderNavigation`, `ReaderToolbar`, `ReaderContent`

### 🟢 Đạt Chuẩn:

**ChapterRow.tsx** (~200 LOC)
- ✅ Size OK
- ✅ Props rõ ràng
- ✅ Logic gọn

---

## 🔗 Related Documents
- [Guidelines](./guidelines.md) - AI behavior rules
- [Troubleshooting](./troubleshooting.md) - Bug history
- [Overview](./overview.md) - Project overview
