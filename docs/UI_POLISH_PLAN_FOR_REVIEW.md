# 🎯 UI POLISH IMPLEMENTATION PLAN - FOR TECHNICAL REVIEW

> **Project:** Raiden AI Translator v2.6.0 → v2.7.0  
> **Prepared by:** Antigravity Agent (Gemini)  
> **Date:** 2026-02-08  
> **For:** GPT Technical Review & Collaboration  
> **Context:** Solo user app, production-ready codebase, zero tolerance for breaking changes

---

## 📋 EXECUTIVE SUMMARY

**Objective:** Add UI polish features to improve solo user productivity while maintaining 100% backward compatibility with existing v2.6.0 codebase.

**Core Philosophy:**
- **Flow Preservation** > Everything else (no interruptions to user workflow)
- **Incremental & Safe** - Each phase is independent and rollback-able
- **Solo User Optimized** - No onboarding, no hand-holding, power user features only

**Key Constraints:**
- ✅ Must NOT break existing code
- ✅ Must NOT require data migration (backward compatible)
- ✅ Must be disable-able via feature flags
- ✅ Must maintain 58-60 FPS performance

---

## 🏗️ CURRENT ARCHITECTURE (v2.6.0)

### **Tech Stack:**
- **Frontend:** Next.js 16.1.1 (App Router) + React 19.2.3
- **Desktop:** Tauri 2.2.7
- **Styling:** TailwindCSS v4 + Radix UI
- **Database:** Dexie 4.2.1 (IndexedDB)
- **AI:** Google Generative AI (Gemini 2.0/2.5 Flash)
- **Build:** Turbopack

### **Database Schema (Version 104):**
```typescript
// 12 existing tables
workspaces, chapters, dictionary, settings, blacklist, 
corrections, prompts, ttsCache, apiUsage, history, 
heuristicTerms, consistencyLogs
```

### **Existing Keyboard Handling:**
```typescript
// components/workspace/hooks/useReaderKeybinds.ts
// Only handles Reader-specific shortcuts:
// - Escape: Close reader
// - Arrow Left/Right: Prev/Next chapter
// - Arrow Up/Down: Scroll

// ⚠️ NO GLOBAL SHORTCUTS SYSTEM
```

### **Existing Settings System:**
```typescript
// lib/repositories/settings.ts
// Only stores AI configuration:
// - apiKeyPrimary
// - apiKeyPool
// - aiModel

// ⚠️ NO UI PREFERENCES STORAGE
```

### **Existing Dialog System:**
- 19 Dialog components using Radix UI
- Each manages own state independently
- No centralized command system

---

## 🎯 PROPOSED FEATURES (Priority Order)

### **1️⃣ Command Palette (Highest Priority)**
**Why:** Solo user needs fast, keyboard-first access to all actions

**Features:**
- Context-aware commands (changes based on current view)
- Fuzzy search with aliases
- Remember last command (Enter to repeat)
- Keyboard-first (Ctrl+K to open)

**Technical Approach:**
- New component: `components/CommandPalette/CommandPalette.tsx`
- Does NOT modify existing dialogs
- Renders at root level (app/layout.tsx)

---

### **2️⃣ Global Keyboard Shortcuts**
**Why:** Solo user = power user, needs efficiency

**Features:**
- Customizable shortcuts for all major actions
- Conflict detection with existing Reader shortcuts
- Cheatsheet (Ctrl+?)

**Technical Approach:**
- New hook: `lib/hooks/useGlobalKeyboardShortcuts.ts`
- Checks `isReaderOpen` to avoid conflict with `useReaderKeybinds.ts`
- Does NOT modify existing keyboard handling

---

### **3️⃣ Workflow Presets + Pipeline Memory**
**Why:** Solo user has repetitive workflows, needs automation

**Features:**
- Save workflow presets (e.g., "Translate + Fix Titles + Export")
- Remember last pipeline, one-click repeat
- Smart suggestions based on usage patterns

**Technical Approach:**
- New DB table: `workflowPresets` (version 105)
- New component: `components/workflow/PresetManager.tsx`
- Hook into existing actions via event listeners (non-invasive)

---

### **4️⃣ Reader Comfort Enhancements**
**Why:** Solo user reads for hours, needs eye comfort

**Features:**
- Font size/line height controls
- Focus mode (hide sidebar)
- Scroll position preservation on font change

**Technical Approach:**
- CSS variables for smooth transitions
- New component: `components/reader/ReaderSettings.tsx`
- Minimal modification to existing `ReaderModal.tsx` (1 line addition)

---

### **5️⃣ Zero-Confirm + Undo System**
**Why:** Solo user hates confirmation dialogs, prefers undo

**Features:**
- Safe actions → no confirm (translate, export, fix titles)
- Destructive actions → undo toast (delete chapters)
- Trash system (10s undo window)

**Technical Approach:**
- New utility: `lib/utils/confirmationRules.ts`
- Modify action handlers to check rules
- Integrate with existing toast system (Sonner)

---

### **6️⃣ Minimal Strategic Animations**
**Why:** Reduce perceived loading time, provide feedback

**Features:**
- Skeleton screens (replace spinners)
- Button press feedback (CSS only)
- Toast slide-in (existing Sonner)
- Progress bar smoothing (CSS transition)

**Technical Approach:**
- New component: `components/ui/skeleton.tsx`
- CSS-only animations (no Framer Motion)
- Replace loading states in existing components

---

## 📊 IMPLEMENTATION PHASES

### **PHASE 1: Foundation (Week 1)**

#### **Day 1: UI Preferences Table**
```typescript
// lib/db.ts - Version 105
db.version(105).stores({
  uiPreferences: 'key' // NEW TABLE
});

export interface UIPreference {
  key: string;
  value: unknown;
  updatedAt: Date;
}
```

**Risk:** 🟡 Medium (DB migration)  
**Mitigation:** Dexie auto-migration tested, rollback plan ready

---

#### **Day 2-3: Global Keyboard Shortcuts**
```typescript
// lib/hooks/useGlobalKeyboardShortcuts.ts - NEW FILE
export function useGlobalKeyboardShortcuts() {
  const isReaderOpen = useReaderState();
  
  useEffect(() => {
    if (isReaderOpen) return; // Avoid conflict with useReaderKeybinds
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        openCommandPalette();
      }
      // ... more shortcuts
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReaderOpen]);
}
```

**Risk:** 🟢 Low (new file, isolated)  
**Conflict Prevention:** Check `isReaderOpen` before handling

---

#### **Day 4-5: Command Palette Component**
```typescript
// components/CommandPalette/CommandPalette.tsx - NEW FILE
export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!isOpen) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <CommandPaletteContent />
    </Dialog>
  );
}

// app/layout.tsx - MINIMAL MODIFICATION
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <CommandPalette /> {/* NEW - 1 line addition */}
      </body>
    </html>
  );
}
```

**Risk:** 🟢 Low (new component, isolated)  
**Integration:** Single line addition to layout

---

### **PHASE 2: Workflow Automation (Week 2)**

#### **Day 1: Workflow Presets Table**
```typescript
// lib/db.ts - Version 106
db.version(106).stores({
  workflowPresets: '++id, name, workspaceId'
});

export interface WorkflowPreset {
  id?: number;
  name: string;
  workspaceId?: string; // null = global
  steps: WorkflowStep[];
  createdAt: Date;
}

interface WorkflowStep {
  action: string; // 'translate', 'export', 'fix-titles'
  params: Record<string, unknown>;
}
```

**Risk:** 🟡 Medium (DB migration)  
**Backward Compatibility:** New table, doesn't affect existing data

---

#### **Day 2-4: Preset Manager UI**
```typescript
// components/workflow/PresetManager.tsx - NEW FILE
// Standalone component, no modifications to existing UI
```

**Risk:** 🟢 Low (new component)

---

#### **Day 5: Integration with Existing Actions**
```typescript
// lib/hooks/useWorkflowRecorder.ts - NEW FILE
export function useWorkflowRecorder() {
  // Listen to existing action events
  // Record steps without modifying action handlers
  
  useEffect(() => {
    const unsubscribe = eventBus.on('action:translate', (params) => {
      recordStep({ action: 'translate', params });
    });
    
    return unsubscribe;
  }, []);
}
```

**Risk:** 🟢 Low (event-based, non-invasive)  
**Approach:** Hook into existing events, don't modify handlers

---

### **PHASE 3: Reader Comfort (Week 3)**

#### **Day 1-2: Reader Settings**
```typescript
// components/reader/ReaderSettings.tsx - NEW FILE
export function ReaderSettings() {
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.8);
  
  useEffect(() => {
    document.documentElement.style.setProperty('--reader-font-size', `${fontSize}px`);
    document.documentElement.style.setProperty('--reader-line-height', `${lineHeight}`);
  }, [fontSize, lineHeight]);
  
  return (
    <div className="reader-settings">
      {/* Font size slider */}
      {/* Line height slider */}
    </div>
  );
}

// components/reader/ReaderModal.tsx - MINIMAL MODIFICATION
// Add 1 line:
<ReaderSettings />
```

**Risk:** 🟢 Low (CSS variables, minimal code change)  
**Modification:** 1 line addition to ReaderModal

---

#### **Day 3: Focus Mode**
```typescript
// lib/hooks/useFocusMode.ts - NEW FILE
export function useFocusMode() {
  const [isFocusMode, setIsFocusMode] = useState(false);
  
  useEffect(() => {
    document.body.classList.toggle('focus-mode', isFocusMode);
  }, [isFocusMode]);
  
  return { isFocusMode, toggleFocusMode: () => setIsFocusMode(!isFocusMode) };
}

// globals.css - ADD CSS
.focus-mode .sidebar { display: none; }
.focus-mode .header { opacity: 0.3; }
```

**Risk:** 🟢 Low (CSS class toggle)  
**Rollback:** Remove CSS class, no code changes needed

---

#### **Day 4-5: Skeleton Screens**
```typescript
// components/ui/skeleton.tsx - NEW FILE
export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

// components/workspace/ChapterList.tsx - MODIFY
// Replace:
{isLoading && <Spinner />}
// With:
{isLoading && <ChapterListSkeleton />}
```

**Risk:** 🟢 Low (UI only, no logic change)  
**Modification:** Replace loading component

---

### **PHASE 4: Zero-Confirm System (Week 3 - end)**

#### **Implementation:**
```typescript
// lib/utils/confirmationRules.ts - NEW FILE
export function shouldConfirm(action: Action): boolean {
  // Safe actions → no confirm
  if (['translate', 'export', 'fix-titles'].includes(action.type)) {
    return false;
  }
  
  // Destructive → confirm if count > threshold
  if (action.type === 'delete' && action.count > 10) {
    return true;
  }
  
  // Undoable → no confirm, show undo toast
  if (action.undoable) {
    return false;
  }
  
  return true;
}

// Modify action handlers to use rules
function deleteChapters(ids: number[]) {
  if (shouldConfirm({ type: 'delete', count: ids.length })) {
    showConfirmDialog(() => performDelete(ids));
  } else {
    performDelete(ids);
    showUndoToast(() => restoreChapters(ids));
  }
}
```

**Risk:** 🟡 Medium (modifies action handlers)  
**Mitigation:** Centralized rules, easy to disable

---

## 🛡️ SAFETY MEASURES

### **Before Each Phase:**
1. ✅ Git commit with clear message
2. ✅ Backup database (export all workspaces)
3. ✅ Test on separate branch
4. ✅ Verify v2.6.0 data loads correctly

### **After Each Phase:**
1. ✅ Test all existing features
2. ✅ Check console for errors
3. ✅ Verify performance (FPS, bundle size)
4. ✅ Update documentation

### **Rollback Plan:**
```bash
# If phase fails:
git revert <commit-hash>
# Database auto-migrates, but can force downgrade if needed
# Clear new tables: await db.uiPreferences.clear()
npm run build
```

---

## 📊 RISK ASSESSMENT

| Phase | Risk | Mitigation | Rollback Time |
|-------|------|------------|---------------|
| 1.1 (DB) | 🟡 Medium | Dexie auto-migration | 5 min |
| 1.2 (Shortcuts) | 🟢 Low | Isolated hook | 2 min |
| 1.3 (Palette) | 🟢 Low | New component | 2 min |
| 2 (Presets) | 🟡 Medium | Feature flag | 5 min |
| 3 (Reader) | 🟢 Low | CSS only | 2 min |
| 4 (Zero-confirm) | 🟡 Medium | Centralized rules | 10 min |

---

## 🎯 SUCCESS CRITERIA

### **Phase 1:**
- ✅ Ctrl+K opens Command Palette
- ✅ Global shortcuts work
- ✅ Reader shortcuts still work (no conflict)
- ✅ No console errors
- ✅ v2.6.0 data loads correctly

### **Phase 2:**
- ✅ Can save workflow preset
- ✅ Can repeat last workflow
- ✅ Existing workflows unaffected

### **Phase 3:**
- ✅ Font size changes smoothly
- ✅ Focus mode toggles instantly
- ✅ Scroll position preserved

### **Phase 4:**
- ✅ Safe actions execute without confirm
- ✅ Undo toast appears for destructive actions
- ✅ Can undo within 10s window

---

## 🤝 QUESTIONS FOR GPT REVIEW

### **1. Architecture Concerns:**
- Is the global keyboard shortcuts approach safe? (checking `isReaderOpen`)
- Better way to avoid conflicts with existing `useReaderKeybinds`?
- Should we use event bus for workflow recording, or direct function wrapping?

### **2. Database Migration:**
- Is adding new tables (version 105, 106) safe for backward compatibility?
- Should we add migration tests?
- How to handle users who rollback to v2.6.0 after using v2.7.0?

### **3. Performance:**
- Will CSS variables for reader settings cause layout thrashing?
- Better approach for scroll position preservation on font change?
- Should we debounce font size changes?

### **4. Zero-Confirm System:**
- Is centralized `shouldConfirm()` rules better than per-action logic?
- How to handle edge cases (e.g., network failure during undo window)?
- Should undo toast be persistent or auto-dismiss?

### **5. Alternative Approaches:**
- Should we use Zustand/Jotai for global state instead of React Context?
- Better pattern for Command Palette state management?
- Should workflow presets be stored in DB or localStorage?

---

## 📝 ADDITIONAL CONTEXT

### **User Profile:**
- Solo developer using app daily
- Power user, knows all features
- Hates interruptions to workflow
- Reads for hours (eye comfort critical)
- Translates 50-100 chapters per session

### **Current Pain Points:**
- No keyboard shortcuts for common actions
- Repetitive workflows (select → translate → fix → export)
- Confirmation dialogs interrupt flow
- Spinners don't show progress context

### **Non-Goals:**
- ❌ Onboarding for new users (solo user only)
- ❌ Multi-user features
- ❌ Decorative animations
- ❌ Heavy UI redesign

---

## 🔗 REFERENCES

**Codebase:**
- Database: `lib/db.ts` (version 104)
- Keyboard: `components/workspace/hooks/useReaderKeybinds.ts`
- Settings: `lib/repositories/settings.ts`
- Dialogs: 19 components using Radix UI

**Documentation:**
- Feature Catalog: `.knowns/reference/raiden-feature-catalog.md`
- Enhancement Ideas: `.knowns/brainstorm/raiden-enhancement-ideas.md`
- Current Plan: `.knowns/plans/ui-polish-implementation-plan-safe-incremental.md`

---

**Ready for technical review and collaboration. Please provide feedback on architecture, risks, and alternative approaches.** 🚀
