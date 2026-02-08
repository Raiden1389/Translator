---
title: Raiden Feature Catalog
createdAt: '2026-02-08T09:58:42.326Z'
updatedAt: '2026-02-08T09:58:42.326Z'
description: >-
  Danh sách đầy đủ tất cả features của Raiden AI Translator - Reference nhanh
  cho brainstorming và planning
tags:
  - features
  - catalog
  - reference
  - raiden
---
# 📋 RAIDEN AI TRANSLATOR - FEATURE CATALOG

> **Version:** 2.6.0  
> **Last Updated:** 2026-02-08  
> **Tech Stack:** Next.js 16 + Tauri 2 + Gemini AI + Dexie (IndexedDB)  
> **Purpose:** Dịch truyện Trung → Việt bằng AI (solo app, không bán)

---

## 🎯 CORE FEATURES (Tính năng chính)

### 1. 📚 WORKSPACE MANAGEMENT (Quản lý Bộ truyện)
- ✅ Tạo/Xóa/Chỉnh sửa workspace (bộ truyện)
- ✅ Import JSON/EPUB/TXT
- ✅ Export JSON/EPUB/TXT (hỗ trợ cả Tauri và Browser)
- ✅ Theo dõi tiến độ đọc (last read chapter)
- ✅ Thống kê tổng quan (số chương, đã dịch, chi phí)

### 2. 🤖 AI TRANSLATION ENGINE (Động cơ dịch)
- ✅ **Gemini 2.0/2.5 Flash** integration
- ✅ **Adaptive Token Management** - Tự động tính toán maxOutputTokens (giảm 20-25% chi phí)
- ✅ **Optimal Chunking** - Chia văn bản ~800 ký tự để giảm thinking tokens
- ✅ **Batch Translation** - Dịch nhiều chương cùng lúc
- ✅ **Sequential Batching** - Dịch tuần tự để tránh lỗi
- ✅ **Real-time Progress Overlay** - Hiển thị tiến độ dịch với stats chi tiết
- ✅ **Cost Tracking** - Theo dõi token usage và chi phí USD real-time
- ✅ **Translation Quality Rules** (v2.2):
  - IDIOM_RULE - Xử lý thành ngữ 4 chữ
  - TOP_BLACKLIST - Chặn cụm từ "mùi convert"
  - BATTLE_RULE - Cải thiện cảnh chiến đấu
  - EMOTION_RULE - Thể hiện cảm xúc tự nhiên
  - DIALOGUE_RULE - Hội thoại tự nhiên

### 3. ✨ SMART TITLE FIXER (Sparkles)
- ✅ Tự động quét tiêu đề còn chữ Hán
- ✅ Dịch lại chỉ tiêu đề (cực rẻ: $0.000005/chapter)
- ✅ Self-correction logic - Retry nếu vẫn còn Hán
- ✅ Sentence Case normalization (KHỔ CHỦ → Khổ chủ)

### 4. 🧠 RAIDEN INTELLIGENCE HUB (Trung tâm AI)
Giao diện sidebar tập trung quản lý 5 modules:

#### 4.1. Discovery Module (Heuristic Scanner v2.2)
- ✅ **Quét tự động** tìm tên nhân vật, kỹ năng, địa danh
- ✅ **Strict Opt-in** - Mặc định coi là rác, chỉ giữ thực thể xác thực
- ✅ **RankContextClassifier** - Phân loại 4 tầng (Generic, Statement, Object, Descriptive)
- ✅ **Double-Check Blacklist** - Kiểm tra blacklist 2 lần
- ✅ **Syllable Stripping** - Tuốt vỏ rác Hán Việt
- ✅ **Smart Delta Caching** - Chỉ quét thuật ngữ mới
- ✅ **Auto-Clean Scanner** - Xóa pending terms trước khi quét lại
- ✅ **Forensic Mode** - Phân tích chi tiết từng term
- ✅ **Export/Import** - Xuất danh sách thuật ngữ

#### 4.2. Glossary (Từ điển)
- ✅ Quản lý từ điển Hán Việt
- ✅ Workspace-scoped (mỗi bộ truyện có từ điển riêng)
- ✅ Tích hợp vào translation engine
- ✅ Dictionary Usage Tracking - Hiển thị số lượng terms/characters được dùng

#### 4.3. Persona (Nhân vật)
- ✅ Quản lý hồ sơ nhân vật
- ✅ Character-specific translation rules
- ✅ Workspace-scoped

#### 4.4. Tuning (Điều chỉnh)
- ✅ Quản lý quy tắc sửa lỗi văn bản
- ✅ Corrections table trong DB

#### 4.5. Sanitizer (Blacklist)
- ✅ Quản lý danh sách đen (lọc rác)
- ✅ Workspace-scoped
- ✅ Tích hợp với Heuristic Scanner

### 5. 🔍 AI NER (Named Entity Recognition)
- ✅ Trích xuất thực thể bằng AI (gemini-2.0-flash)
- ✅ Batch processing
- ✅ Review dialog trước khi lưu
- ✅ Deduplication - Lọc trùng với dictionary/blacklist/approved terms
- ✅ Zod validation để chống AI hallucination

### 6. 📖 READER MODAL (Đọc truyện)
- ✅ Giao diện đọc cao cấp
- ✅ **TTS (Text-to-Speech)** - Edge TTS tiếng Việt
- ✅ **Inline Title Editing** - Sửa tiêu đề nhanh với icon ✏️
- ✅ Context menu (copy, translate, edit)
- ✅ Navigation (prev/next chapter)
- ✅ Reader history tracking

### 7. 📊 CHAPTER LIST (Danh sách chương)
- ✅ **Virtualization** - Render 1000+ chương mượt mà (60 FPS)
- ✅ **Set-based Selection** - O(1) operations cho checkbox
- ✅ **Native Checkbox** - 0ms instant feedback
- ✅ **Comprehensive Memoization** - 16 className + 9 event handlers
- ✅ **Search & Filter** - Tìm kiếm theo title/content
- ✅ **Pagination** - Phân trang
- ✅ **View Modes** - Table view / Card grid view
- ✅ **Batch Actions**:
  - Translate selected chapters
  - Delete selected chapters
  - Export selected chapters
  - Fix titles (Sparkles)
- ✅ **Selection Dock** - Toolbar floating khi chọn chapters

### 8. 💰 COST TRACKING & ANALYTICS
- ✅ Real-time token counter (Input/Output/Thinking)
- ✅ Cost breakdown tooltip (USD)
- ✅ Model-aware pricing
- ✅ API Usage table trong DB
- ✅ Usage Chart visualization

### 9. ⚙️ AI SETTINGS
- ✅ Chọn model (Gemini 2.0/2.5 Flash, 1.5 Flash...)
- ✅ API Key management
- ✅ Temperature, Top-P, Top-K tuning
- ✅ Max tokens configuration
- ✅ Parallel translation toggle

### 10. 🎨 PROMPT LAB (Thử nghiệm prompt)
- ✅ A/B Testing prompts
- ✅ Test sample input
- ✅ Goals extraction (Spirit DNA)
- ✅ Winner selection
- ✅ Save to library
- ✅ Component đã refactor (392 LOC → 180 LOC)

### 11. 📦 EXPORT/IMPORT SYSTEM
- ✅ **JSON Import/Export** - Versioned backup (v1 schema)
- ✅ **EPUB Export** - Tạo file EPUB để đọc trên máy đọc sách
- ✅ **TXT Export** - Plain text
- ✅ **Auto-select Translated** - Tự động chọn chapters đã dịch
- ✅ **Range Selection** - Chọn từ chapter X đến Y
- ✅ **Zod Validation** - Validate JSON import để tránh crash

---

## 🔧 TECHNICAL FEATURES (Tính năng kỹ thuật)

### 1. 🗄️ DATABASE (Dexie/IndexedDB)
8 tables:
- `workspaces` - Thông tin bộ truyện
- `chapters` - Nội dung gốc/dịch
- `dictionary` - Từ điển thủ công
- `heuristicTerms` - Thuật ngữ AI phát hiện
- `apiUsage` - Theo dõi chi phí
- `corrections` - Quy tắc sửa lỗi
- `blacklist` - Bộ lọc rác
- `settings` - Cấu hình global

### 2. 🚀 TAURI BACKEND (Rust)
- ✅ **Jieba Segmentation** - Phân tách từ tiếng Trung
- ✅ **Edge TTS** - Text-to-Speech
- ✅ **Native HTTP** - Vượt CORS để gọi Gemini API
- ✅ **File System** - Save/Load files
- ✅ **Dialog** - Native file picker

### 3. 🎯 TYPE SAFETY (Zod v2.6.0)
- ✅ **JSON Import Schema** - Validate user uploads
- ✅ **Gemini Response Schema** - Validate API responses
- ✅ **AI Services Schema** - Validate AI outputs
- ✅ **Versioned Backup Schema** - Future-proof migrations
- ✅ **Lenient Schemas** - Flexible validation cho AI hallucination

### 4. ⚡ PERFORMANCE OPTIMIZATIONS
- ✅ **React.memo** - Prevent cascade re-renders
- ✅ **useMemo** - Memoize expensive calculations
- ✅ **useCallback** - Memoize event handlers
- ✅ **Virtualization** - @tanstack/react-virtual
- ✅ **Set-based operations** - O(1) lookups
- ✅ **Turbopack** - Fast builds (5.3s)

### 5. 🛡️ ERROR HANDLING
- ✅ **Error Boundary** - Catch React errors
- ✅ **Toast notifications** - User-friendly errors
- ✅ **Retry logic** - Auto-retry failed translations
- ✅ **Graceful degradation** - Fallback to browser APIs

---

## 📱 UI/UX FEATURES

### 1. 🎨 MODERN UI
- ✅ **TailwindCSS v4** - Modern styling
- ✅ **Radix UI** - Accessible components
- ✅ **Glassmorphism** - Intelligence Hub
- ✅ **Smooth animations** - Slide-in, fade-in
- ✅ **Dark mode ready** - (chưa implement toggle)

### 2. 📊 PROGRESS TRACKING
- ✅ **Translation Progress Overlay**:
  - Real-time stats (speed, tokens, cost)
  - Dictionary usage drill-down
  - Adaptive auto-close timing
  - Manual pin button
  - Expandable stats panel
  - Toast-style logs (last 5 visible)

### 3. 🔔 NOTIFICATIONS
- ✅ **Sonner** - Toast notifications
- ✅ Success/Error/Info toasts
- ✅ Progress toasts

---

## 🧪 DEVELOPER FEATURES

### 1. 📚 DOCUMENTATION
- ✅ **CHANGELOG.md** - 657 dòng, chi tiết từ v2.0.0
- ✅ **SYSTEM_REPORT.md** - Tổng quan hệ thống
- ✅ **PROJECT_REVIEW.md** - Health check report
- ✅ **ZOD_AUDIT_REPORT.md** - Type safety audit
- ✅ **.brain/** - Session context (brain.json, session.json)

### 2. 🔨 BUILD TOOLS
- ✅ **build-ultra-fast.mjs** - Fast build script (`npm run f9`)
- ✅ **lint-any.ps1** - Custom lint script
- ✅ **.agignore** - Optimize RAM usage

### 3. 🧠 KNOWLEDGE ITEMS (KIs)
10 KIs trong `.gemini/antigravity/knowledge/`:
- Cross-Platform Service Abstraction
- Tauri Build Artifacts
- AI Token Management
- Translation Quality
- Dictionary Architecture
- Troubleshooting Log
- Application Structure
- Intelligence Module
- Agent Workflows
- Frontend Standards

---

## 🎯 ARCHITECTURE OVERVIEW

### File Structure
```
ai-translator/
├── app/                    # Next.js App Router
├── components/
│   ├── workspace/          # Core workspace (147 files)
│   │   ├── chapter-list/   # Chapter management
│   │   ├── intelligence/   # AI modules
│   │   ├── dictionary/     # Dictionary UI
│   │   ├── reader/         # Reader modal
│   │   └── hooks/          # Business logic
│   └── ui/                 # Reusable components (21 files)
├── lib/
│   ├── gemini/             # AI translation engine
│   ├── services/           # Service layer (10 files)
│   ├── repositories/       # Data access
│   ├── schemas/            # Zod schemas
│   └── utils/              # Utilities
└── src-tauri/              # Rust backend
```

### Key Services
- `backup.service.ts` - Export/Import JSON
- `export.service.ts` - EPUB/TXT export
- `ai-ner.service.ts` - AI entity extraction
- `chapter-list.service.ts` - Chapter operations
- `workspace.service.ts` - Workspace management

---

## 📊 PERFORMANCE METRICS

- **Build time:** 5.3s (Turbopack)
- **Translation cost:** ~$0.0001-$0.0005/chapter
- **Translation speed:** 20-30 chapters/min
- **Chapter list:** 60 FPS với 1000+ chapters
- **Title fixer precision:** 98% không còn chữ Hán

---

## 🎯 SUMMARY

**Raiden có TẤT CẢ những gì cần cho việc dịch truyện:**

✅ **Dịch AI** - Gemini với adaptive tokens, optimal chunking  
✅ **Quản lý từ điển** - Glossary, Persona, Blacklist  
✅ **Tìm thuật ngữ** - Heuristic Scanner + AI NER  
✅ **Sửa tiêu đề** - Smart Title Fixer (Sparkles)  
✅ **Đọc truyện** - Reader Modal + TTS  
✅ **Export** - JSON/EPUB/TXT  
✅ **Theo dõi chi phí** - Real-time token tracking  
✅ **Performance** - 60 FPS với 1000+ chapters  
✅ **Type Safety** - Zod validation  
✅ **Desktop App** - Tauri executable  

---

## 📝 NOTES

- App này để dùng solo, không bán
- Version hiện tại: 2.6.0
- Tech stack: Next.js 16 + Tauri 2 + Gemini AI
- Tổng số files: ~350+ files, ~50,000+ LOC
- Build command: `npm run f9` (ultra-fast build)
- Executable location: `/scratch/Exe/Raiden-v2.6.0.exe`

---

**Generated:** 2026-02-08  
**Purpose:** Quick reference cho brainstorming và planning  
**Usage:** Khi cần nhớ lại features của Raiden, đọc doc này
