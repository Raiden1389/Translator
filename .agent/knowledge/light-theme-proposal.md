# 🎨 RAIDEN AI TRANSLATOR - LIGHT THEME PROPOSAL

> **Mục tiêu:** Cải thiện Light Theme cho app đẹp hơn, professional hơn, chữ rõ ràng dễ đọc.

---

## 📌 VẤN ĐỀ HIỆN TẠI

### 1. **Màu nền quá trắng**
- `background: #FFFFFF` (pure white) gây chói mắt
- Không có độ sâu, mọi thứ nhìn phẳng

### 2. **Chữ mờ, thiếu contrast**
- Text color hiện tại: `#64748b` (slate-500) → quá nhạt
- Muted text: `#94a3b8` (slate-400) → gần như không đọc được

### 3. **Thiếu visual hierarchy**
- Không có sự phân biệt rõ ràng giữa các section
- Cards và containers blend với background

---

## 🎯 GIẢI PHÁP ĐỀ XUẤT

### **TYPOGRAPHY (Font Chữ)**

| Element | Font | Size | Weight | Lý do |
|---------|------|------|--------|-------|
| **App-wide Body** | `Inter` | 14px | 400 | Modern, rõ ràng, được thiết kế cho screen |
| **Headings (H1-H3)** | `Inter` | 24-18px | 600-700 | Đồng bộ, dễ đọc |
| **Chinese Text** | `Noto Sans SC` | 16px | 400 | Unicode support tốt nhất cho Hán tự |
| **Vietnamese Text** | `Inter` | 15px | 500 | Hỗ trợ dấu hoàn hảo |
| **Code/Monospace** | `JetBrains Mono` | 13px | 400 | Đẹp, dễ đọc |

**Font Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap');
```

---

### **COLOR PALETTE - LIGHT MODE**

#### **Background Colors**
| Token | Hiện tại | Đề xuất | Lý do |
|-------|----------|---------|-------|
| `--background` | `#FFFFFF` | `#FAFBFC` | Off-white, bớt chói mắt |
| `--card` | `#FFFFFF` | `#FFFFFF` | Giữ trắng để nổi bật |
| `--muted` | `#F1F5F9` | `#F3F4F6` | Subtle gray cho sections |
| `--sidebar` | `#F8FAFC` | `#F5F7FA` | Sidebar có độ sâu riêng |

#### **Text Colors**
| Token | Hiện tại | Đề xuất | Contrast Ratio |
|-------|----------|---------|----------------|
| `--foreground` | `#0F172A` | `#1F2937` | 12.6:1 ✅ |
| `--muted-foreground` | `#64748B` | `#4B5563` | 7.1:1 ✅ |
| `--placeholder` | `#94A3B8` | `#6B7280` | 4.6:1 ✅ |

#### **Accent Colors**
| Token | Màu | Hex | Dùng cho |
|-------|-----|-----|----------|
| `--primary` | Electric Blue | `#2563EB` | Buttons, links chính |
| `--primary-hover` | Blue 700 | `#1D4ED8` | Hover states |
| `--success` | Emerald | `#059669` | Dịch xong, success |
| `--warning` | Amber | `#D97706` | Cảnh báo |
| `--error` | Red | `#DC2626` | Lỗi |
| `--accent` | Indigo | `#4F46E5` | Highlight đặc biệt |

#### **Border Colors**
| Token | Hiện tại | Đề xuất |
|-------|----------|---------|
| `--border` | `#E2E8F0` | `#D1D5DB` | Rõ hơn, nhưng không harsh |
| `--ring` | `#3B82F6` | `#2563EB` | Focus ring |

---

### **SIZING SYSTEM**

#### **Font Sizes**
```css
--text-xs: 11px;    /* Labels, badges */
--text-sm: 13px;    /* Secondary text, captions */
--text-base: 14px;  /* Body text (DEFAULT) */
--text-lg: 16px;    /* Chinese characters, emphasis */
--text-xl: 18px;    /* Section headings */
--text-2xl: 24px;   /* Page titles */
```

#### **Spacing**
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
```

---

## 📑 ĐỀ XUẤT THEO TỪNG TAB

### **1. TAB CHƯƠNG (Chapters)**

| Element | Hiện tại | Đề xuất |
|---------|----------|---------|
| **Chapter List BG** | White | `#FAFBFC` (off-white) |
| **Chapter Card BG** | White | `#FFFFFF` với `border: 1px solid #E5E7EB` |
| **Chapter Title** | `text-foreground` | `text-gray-900 font-medium` |
| **Chapter Status** | Badge nhỏ | Badge với background rõ ràng hơn |
| **Hover State** | `bg-muted` | `bg-blue-50 border-l-4 border-primary` |
| **Selected State** | `bg-primary/10` | `bg-blue-100 border-l-4 border-primary` |

**Visual Example:**
```
┌────────────────────────────────────────┐
│ ☐  1  Chương 1: Đào viên kết nghĩa     │ ← hover: blue-50 bg
│      桃园三结义                          │
│      ● Đã dịch                          │
└────────────────────────────────────────┘
```

---

### **2. TAB TỪ ĐIỂN (Dictionary)**

| Element | Hiện tại | Đề xuất |
|---------|----------|---------|
| **Table Header** | Mờ | `bg-gray-100 text-gray-700 font-semibold` |
| **Row Zebra** | Không có | Alternate `bg-white` / `bg-gray-50` |
| **Original Text** | Normal | `font-serif text-gray-900` |
| **Translated Text** | Emerald nhạt | `text-emerald-600 font-medium` |
| **Type Badge** | Outline | `bg-{color}-100 text-{color}-700` |
| **Row Hover** | `bg-muted` | `bg-blue-50` |

---

### **3. TAB NHÂN VẬT (Characters)**

| Element | Hiện tại | Đề xuất |
|---------|----------|---------|
| **Character Name (Chinese)** | Normal | `font-serif text-lg text-gray-900` |
| **Character Name (Viet)** | Input mờ | `text-emerald-600 font-semibold` |
| **Role Badge** | Select | Badge với màu rõ ràng |
| **Description** | Popover | Tooltip với `bg-gray-900 text-white` |

**Màu cho Character Roles:**
- 🔴 **Chính**: `bg-red-100 text-red-700`
- 🟠 **Phụ**: `bg-orange-100 text-orange-700`
- 🔵 **Thường**: `bg-blue-100 text-blue-700`
- 🟢 **Tổ chức**: `bg-green-100 text-green-700`

---

### **4. TAB ĐỌC (Reader)**

| Element | Hiện tại | Đề xuất |
|---------|----------|---------|
| **Reading BG** | Trắng | `#FFFCF7` (warm cream) để dễ đọc lâu |
| **Body Text** | 14px | 16px, `line-height: 1.8` |
| **Paragraph Spacing** | Normal | `margin-bottom: 1.5em` |
| **Dialogue** | Normal | `text-indigo-700` hoặc quote styling |

---

### **5. TAB CẢI CHÍNH (AI Refine)**

| Element | Hiện tại | Đề xuất |
|---------|----------|---------|
| **Panel BG** | Trắng | `#FAFBFC` với card white |
| **Original Text Area** | Mờ | `bg-gray-50 border border-gray-200` |
| **Refined Text Area** | Mờ | `bg-emerald-50 border border-emerald-200` |
| **Diff Highlight (Added)** | None | `bg-green-100 text-green-800` |
| **Diff Highlight (Removed)** | None | `bg-red-100 text-red-800 line-through` |
| **Refine Button** | Primary | `bg-gradient-to-r from-indigo-500 to-purple-500` |
| **Loading State** | Spinner | Skeleton animation với shimmer |

**Visual Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  📝 Văn bản gốc                    🔄 Văn bản cải chính     │
│ ┌─────────────────────┐          ┌─────────────────────────┐│
│ │ (gray-50 bg)        │    →     │ (emerald-50 bg)         ││
│ │ Text to refine...   │          │ Refined text...         ││
│ └─────────────────────┘          └─────────────────────────┘│
│                    [ ✨ Cải Chính AI ]                       │
└─────────────────────────────────────────────────────────────┘
```

---

### **6. TAB PROMPT LAB**

| Element | Hiện tại | Đề xuất |
|---------|----------|---------|
| **Section BG** | White | `bg-white` với `shadow-sm border` |
| **Section Header** | Normal | `bg-gray-100 px-4 py-3 font-semibold text-gray-800` |
| **Textarea** | Basic | `bg-gray-50 focus:bg-white border-gray-200 font-mono` |
| **Variable Tags** | None | `bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded` |
| **Save Button** | Primary | `bg-primary hover:bg-primary-dark` |
| **Reset Button** | Ghost | `text-gray-600 hover:text-gray-900` |
| **Hint Text** | Muted | `text-sm text-gray-500 italic` |

**Màu cho Prompt Sections:**
| Section | Accent Color |
|---------|--------------|
| System Prompt | `border-l-4 border-blue-500` |
| Translation Prompt | `border-l-4 border-emerald-500` |
| Refinement Prompt | `border-l-4 border-purple-500` |
| Glossary Prompt | `border-l-4 border-orange-500` |

**Visual Layout:**
```
┌────────────────────────────────────────────┐
│ ▸ System Prompt                    [Reset] │ ← blue accent
│ ┌────────────────────────────────────────┐ │
│ │ You are a professional translator...  │ │
│ │ {glossary} {context}                   │ │ ← variable tags
│ └────────────────────────────────────────┘ │
├────────────────────────────────────────────┤
│ ▸ Translation Prompt               [Reset] │ ← emerald accent
│ ┌────────────────────────────────────────┐ │
│ │ Translate the following text...        │ │
│ └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

---

### **7. TAB CÀI ĐẶT (Settings)**

| Element | Hiện tại | Đề xuất |
|---------|----------|---------|
| **Settings Page BG** | White | `#FAFBFC` |
| **Settings Card** | Flat | `bg-white rounded-lg shadow-sm border border-gray-200` |
| **Section Title** | Normal | `text-lg font-semibold text-gray-900 mb-4` |
| **Label** | Muted | `text-sm font-medium text-gray-700` |
| **Input Fields** | Basic | `bg-white border-gray-300 focus:border-primary focus:ring-2` |
| **Select Dropdown** | Basic | `bg-white border-gray-300 text-gray-900` |
| **Toggle Switch** | Primary | `bg-gray-200 [checked]:bg-primary` |
| **Danger Zone** | None | `bg-red-50 border border-red-200 rounded-lg p-4` |

**Settings Sections:**
| Section | Icon | Accent |
|---------|------|--------|
| API Configuration | 🔑 | Gray |
| Model Selection | 🤖 | Blue |
| Translation Options | 🌐 | Emerald |
| Appearance | 🎨 | Purple |
| Advanced | ⚙️ | Gray |
| Danger Zone | ⚠️ | Red |

**Visual Layout:**
```
┌──────────────────────────────────────────────────────────┐
│ ⚙️ Cài Đặt                                                │
├──────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────┐ │
│ │ 🔑 API Configuration                                  │ │
│ │   API Key: [••••••••••••••••••] [Show] [Change]       │ │
│ │   Provider: [Google Gemini ▼]                        │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ 🤖 Model Selection                                    │ │
│ │   Translation: [gemini-2.0-flash ▼]                   │ │
│ │   Refinement:  [gemini-2.0-flash ▼]                   │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─────────── bg-red-50 border-red-200 ─────────────────┐ │
│ │ ⚠️ Danger Zone                                        │ │
│ │   [Delete All Chapters]  [Reset Settings]            │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

### **8. XUẤT FILE (Export)**

| Element | Hiện tại | Đề xuất |
|---------|----------|---------|
| **Export Dialog BG** | White | `bg-white rounded-xl shadow-2xl` |
| **Format Options** | Radio | Cards với icon, hover highlight |
| **Selected Format** | Primary bg | `bg-primary/10 border-2 border-primary` |
| **Unselected Format** | Gray | `bg-gray-50 border border-gray-200 hover:bg-gray-100` |
| **File Name Input** | Basic | `bg-white border-gray-300 focus:border-primary` |
| **Export Button** | Primary | `bg-primary hover:bg-primary-dark text-white` |
| **Preview Panel** | None | `bg-gray-50 p-4 rounded font-mono text-sm` |

**Format Cards:**
| Format | Icon | Color |
|--------|------|-------|
| TXT | 📄 | Gray |
| DOCX | 📝 | Blue |
| EPUB | 📚 | Purple |
| PDF | 📕 | Red |

**Visual Layout:**
```
┌────────────────────────────────────────────────────────┐
│ 📤 Xuất File                                     [X]   │
├────────────────────────────────────────────────────────┤
│ Chọn định dạng:                                        │
│                                                        │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│ │  📄 TXT │  │ 📝 DOCX │  │ 📚 EPUB │  │ 📕 PDF  │    │
│ │         │  │ ✓       │  │         │  │         │    │
│ └─────────┘  └─────────┘  └─────────┘  └─────────┘    │
│                 (selected)                             │
│                                                        │
│ Tên file: [tam-quoc-dich_______________]              │
│                                                        │
│ Nội dung xuất:                                        │
│ ○ Tất cả chương (120 chương)                          │
│ ● Chương đã chọn (5 chương)                           │
│ ○ Chương đã dịch (80 chương)                          │
│                                                        │
│                        [Hủy]  [📤 Xuất File]          │
└────────────────────────────────────────────────────────┘
```

---

### **9. SIDEBAR**

| Element | Hiện tại | Đề xuất |
|---------|----------|---------|
| **Sidebar BG** | White | `#F5F7FA` (subtle gray) |
| **Active Nav** | Primary bg | `bg-primary text-white` với rounded |
| **Inactive Nav** | Text only | `text-gray-600 hover:bg-gray-100` |
| **Dividers** | None | `border-t border-gray-200` |

---

## 🔧 IMPLEMENTATION PLAN

### **Phase 1: CSS Variables Update** (1h)
1. Update `globals.css` với color tokens mới
2. Thêm font imports
3. Test basic contrast

### **Phase 2: Component Updates** (2h)
1. Update Button variants cho light mode
2. Update Input/Select styling
3. Update Card/Badge components

### **Phase 3: Per-Tab Polish** (3h)
1. Chapter list styling
2. Dictionary table styling
3. Character tab styling
4. Reader view polish

### **Phase 4: QA & Refinement** (1h)
1. Test từng tab
2. Check contrast ratios
3. Fine-tune hover/active states

---

## ✅ CHECKLIST BEFORE DELIVERY

- [ ] Tất cả text có contrast ratio >= 4.5:1
- [ ] Hover states rõ ràng nhưng không jarring
- [ ] Cards có border/shadow để phân biệt với background
- [ ] Chinese characters đủ lớn và rõ
- [ ] Vietnamese text với dấu hiển thị đẹp
- [ ] Focus states visible cho keyboard navigation
- [ ] Consistent spacing và typography

---

## � ICONOGRAPHY (Hệ Thống Icon Đồng Bộ)

### **Đề xuất: Lucide React**

> **Lý do:** Lucide thanh mảnh, hiện đại, và cực hợp với font Inter. App hiện tại đã dùng Lucide, cần đảm bảo KHÔNG mix với các bộ icon khác.

**Quy tắc:**
| Rule | Do ✅ | Don't ❌ |
|------|------|---------|
| **Bộ icon** | Lucide React only | Mix Heroicons, FontAwesome, Material |
| **Size** | Consistent `h-4 w-4` hoặc `h-5 w-5` | Random sizes |
| **Stroke width** | Default 2px | Mix 1.5px và 2px |
| **Color** | Inherit từ parent | Hardcode màu |

**Icon Mapping theo Tab:**
| Tab | Primary Icons |
|-----|---------------|
| Chapters | `FileText`, `BookOpen`, `CheckCircle`, `Clock` |
| Dictionary | `Book`, `Languages`, `Search`, `Plus` |
| Characters | `Users`, `User`, `Sparkles`, `Star` |
| Reader | `Book`, `Eye`, `Settings2`, `ChevronLeft/Right` |
| AI Refine | `Wand2`, `RefreshCw`, `Check`, `X` |
| Prompt Lab | `Terminal`, `Code`, `Save`, `RotateCcw` |
| Settings | `Settings`, `Key`, `Palette`, `AlertTriangle` |
| Export | `Download`, `FileDown`, `File`, `FileType` |

---

## 🎨 ENHANCED CSS VARIABLES (Tối Ưu Cho Đọc Truyện)

```css
:root {
  /* Light Theme - Raiden Translator */
  
  /* Backgrounds */
  --background: 210 20% 98%; /* #FAFBFC */
  --foreground: 215 25% 27%; /* #1F2937 */
  --card: 0 0% 100%; /* #FFFFFF */
  --card-foreground: 215 25% 27%;
  --popover: 0 0% 100%;
  --popover-foreground: 215 25% 27%;
  --muted: 220 14% 96%; /* #F3F4F6 */
  --muted-foreground: 215 16% 47%; /* #4B5563 */
  
  /* Primary (Electric Blue) */
  --primary: 217 91% 60%; /* #2563EB */
  --primary-foreground: 0 0% 100%;
  
  /* Secondary */
  --secondary: 220 14% 96%;
  --secondary-foreground: 215 25% 27%;
  
  /* Accent (Indigo) */
  --accent: 239 84% 67%; /* #4F46E5 */
  --accent-foreground: 0 0% 100%;
  
  /* Functional */
  --destructive: 0 84% 60%; /* #DC2626 */
  --destructive-foreground: 0 0% 100%;
  
  /* Borders - STANDARDIZED */
  --border: 220 13% 91%; /* #E5E7EB - Default */
  --border-strong: 216 12% 84%; /* #D1D5DB - Dividers, emphasis */
  --input: 220 13% 91%;
  --ring: 217 91% 60%;
  
  /* Radius */
  --radius: 0.5rem;
  
  /* ═══════════════════════════════════════════════════════════ */
  /* 📖 READING SPECIFIC TOKENS (Tối ưu cho đọc truyện)          */
  /* ═══════════════════════════════════════════════════════════ */
  
  /* Reader Layout */
  --reader-max-width: 720px;
  --reader-font-size: 16px;
  --reader-line-height: 1.75;
  --reader-paragraph-spacing: 1.5rem;
  
  /* Chinese Text Enhancement - REFINED */
  /* 17px/400 cho Windows non-retina, gọn nét hơn */
  --chinese-text-shadow: 0 1px 1px rgba(0,0,0,0.05);
  --chinese-font-size: 17px;
  --chinese-font-weight: 400;
  
  /* Màu riêng cho Hội Thoại (Dialogue) */
  --dialogue-text: 221 83% 53%; /* Blue-600 */
  --dialogue-quote-border: 221 83% 53%;
  
  /* Reader Background Options */
  --reader-bg-white: 0 0% 100%;       /* Pure white */
  --reader-bg-cream: 40 33% 98%;      /* #FFFCF7 - warm cream */
  --reader-bg-sepia: 34 44% 94%;      /* #F5F0E6 - sepia */
  --reader-bg-gray: 220 14% 96%;      /* #F3F4F6 - cool gray */
}

/* Mobile / Tablet: Chinese text larger */
@media (max-width: 768px) {
  :root {
    --chinese-font-size: 18px;
    --chinese-font-weight: 500;
  }
}
```

---

## 📐 READER STYLING (Chi Tiết - REFINED)

### **Typography cho đọc lâu:**
```css
.reader-content {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: var(--reader-font-size);
  line-height: var(--reader-line-height);
  max-width: var(--reader-max-width);
  margin: 0 auto;
  padding: 2rem;
  
  /* Text alignment với fallback */
  text-align: left;
}

@supports (text-justify: inter-character) {
  .reader-content {
    text-align: justify;
    text-justify: inter-character;
  }
}

.reader-content p {
  margin-bottom: var(--reader-paragraph-spacing);
}

/* Chinese text enhancement */
.reader-content .chinese,
.reader-content [lang="zh"] {
  font-family: 'Noto Sans SC', 'PingFang SC', sans-serif;
  font-size: var(--chinese-font-size);
  font-weight: var(--chinese-font-weight);
  text-shadow: var(--chinese-text-shadow);
}

/* Dialogue styling - NO ITALIC (mệt mắt với Hán-Việt) */
.reader-content .dialogue,
.reader-content blockquote {
  color: hsl(var(--dialogue-text));
  border-left: 3px solid hsl(var(--dialogue-quote-border));
  padding-left: 1rem;
  font-style: normal; /* Không italic */
  opacity: 0.95;
}
```

---

## 🎯 ACCESSIBILITY & POLISH (THIẾU - ĐÃ BỔ SUNG)

### **1. Focus-visible Spec**
```css
:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}

/* Remove default outline when not keyboard-focused */
:focus:not(:focus-visible) {
  outline: none;
}
```

### **2. Scrollbar Styling (Reader + Sidebar)**
```css
/* Custom scrollbar cho đọc truyện */
.reader-content::-webkit-scrollbar,
.sidebar::-webkit-scrollbar {
  width: 8px;
}

.reader-content::-webkit-scrollbar-track,
.sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.reader-content::-webkit-scrollbar-thumb,
.sidebar::-webkit-scrollbar-thumb {
  background: hsl(var(--muted-foreground) / 0.4);
  border-radius: 4px;
}

.reader-content::-webkit-scrollbar-thumb:hover,
.sidebar::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.6);
}

/* Firefox */
.reader-content,
.sidebar {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted-foreground) / 0.4) transparent;
}
```

### **3. Reduced Motion Support**
```css
@media (prefers-reduced-motion: reduce) {
  .skeleton,
  .shimmer {
    animation: none !important;
  }
  
  * {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

---

## 🟡 CHỈNH SỬA QUAN TRỌNG (THEO FEEDBACK)

| Item | Trước | Sau | Lý do |
|------|-------|-----|-------|
| Chinese text | 18px / 500 | **17px / 400** | Gọn nét hơn trên Windows non-retina |
| Dialogue | italic | **normal + opacity 0.95** | Hán-Việt italic mệt mắt |
| AI Refine button | from-indigo-500 to-purple-500 | **from-blue-500 to-indigo-500** | Giữ hệ thống Electric Blue |
| Border default | Mix 2 màu | **#E5E7EB only** | Không rung mắt |
| Border strong | - | **#D1D5DB** | Cho dividers |
| Text justify | No fallback | **@supports fallback** | Safari/Chromium compat |

---

## 🔧 IMPLEMENTATION PLAN (BY IMPACT ORDER)

### **Phase 1: Tokens + Fonts** (1h) ← FOUNDATION
1. Update `globals.css` với color tokens mới
2. Thêm font imports (Inter, Noto Sans SC, JetBrains Mono)
3. Add focus-visible, scrollbar, reduced-motion rules
4. Test basic contrast

### **Phase 2: Reader Tab** (1.5h) ← HIGHEST IMPACT
1. Reader background cream
2. Typography với line-height 1.75
3. Chinese text 17px/400
4. Dialogue styling (no italic)
5. Scrollbar custom

### **Phase 3: Chapters + Dictionary** (1.5h)
1. Chapter list hover/selected states
2. Dictionary table zebra striping
3. Badge colors standardized

### **Phase 4: Character Tab** (1h)
1. Role badges colors
2. Input field styling
3. Popover descriptions

### **Phase 5: Prompt Lab** (1h)
1. Section headers với border-left accent
2. Textarea monospace styling
3. Variable tags

### **Phase 6: Settings + Export** (1h) ← LOWEST PRIORITY
1. Settings cards layout
2. Danger zone styling
3. Export dialog format cards

---

## ✅ FINAL CHECKLIST (UPDATED)

- [ ] Tất cả text có contrast ratio >= 4.5:1
- [ ] Hover states rõ ràng nhưng không jarring
- [ ] Cards có border/shadow để phân biệt với background
- [ ] **Chinese: 17px / 400 (desktop), 18px / 500 (mobile)**
- [ ] Vietnamese text với dấu hiển thị đẹp
- [ ] **Focus-visible: 2px solid ring, offset 2px**
- [ ] **Scrollbar: 8px width, muted-foreground/40%**
- [ ] **Reduced motion: animation none**
- [ ] Icons: Chỉ dùng Lucide React, không mix
- [ ] Reader: Line-height 1.75, max-width 720px
- [ ] **Dialogue: Màu blue-600, NO italic, opacity 0.95**
- [ ] **Border: #E5E7EB default, #D1D5DB strong only**

---

**PROPOSAL HOÀN CHỈNH! Anh confirm là em implement theo thứ tự impact!** 🔥⚔️
