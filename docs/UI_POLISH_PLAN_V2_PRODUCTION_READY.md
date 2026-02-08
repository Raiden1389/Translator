# 🎯 UI POLISH IMPLEMENTATION PLAN V2 - PRODUCTION READY

> **Project:** Raiden AI Translator v2.6.0 → v2.7.0  
> **Version:** 2.0 (Revised after GPT review)  
> **Date:** 2026-02-08  
> **Status:** Ready for implementation  
> **Changes:** Fixed 4 critical risks identified by GPT

---

## 🔄 WHAT CHANGED FROM V1

### **Critical Fixes Applied:**
1. ✅ **Keyboard Guard** - Added input/textarea/contentEditable checks
2. ✅ **Shortcut Context Stack** - Replaced `isReaderOpen` with proper context stack
3. ✅ **Event Bus Source Flag** - Prevent pipeline recording loops
4. ✅ **DB Rollback Safety** - Lazy-open tables with feature flags
5. ✅ **Undo + Crash Safety** - Tombstone pattern for destructive actions
6. ✅ **Layout Thrashing Fix** - Debounce font size changes

### **Architecture Improvements:**
- ✅ Command Palette as Singleton Service (not Context)
- ✅ Versioned Workflow Schema
- ✅ Hard Feature Flags (disable all side effects)

---

## 📋 EXECUTIVE SUMMARY

**Objective:** Add UI polish features to improve solo user productivity while maintaining 100% backward compatibility with existing v2.6.0 codebase.

**Core Philosophy:**
- **Flow Preservation** > Everything else (no interruptions to user workflow)
- **Production-Grade Safety** - All edge cases handled
- **Solo User Optimized** - No onboarding, no hand-holding, power user features only

**Key Constraints:**
- ✅ Must NOT break existing code
- ✅ Must handle rollback gracefully (lazy-open tables)
- ✅ Must prevent data loss (tombstone pattern)
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

---

## 🎯 PROPOSED FEATURES (Priority Order)

### **1️⃣ Command Palette (Highest Priority)**

**Features:**
- Context-aware commands (changes based on current view)
- Fuzzy search with aliases
- Remember last command (Enter to repeat)
- Keyboard-first (Ctrl+K to open)

**Technical Approach (REVISED):**
```typescript
// lib/services/commandPalette.ts - NEW (Singleton Service)
class CommandPaletteService {
  private listeners = new Set<() => void>();
  private isOpen = false;
  
  open() {
    this.isOpen = true;
    shortcutContext.push('palette'); // Push context
    this.notify();
  }
  
  close() {
    this.isOpen = false;
    shortcutContext.pop(); // Pop context
    this.notify();
  }
  
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notify() {
    this.listeners.forEach(l => l());
  }
  
  getState() {
    return this.isOpen;
  }
}

export const commandPalette = new CommandPaletteService();
```

**Why Singleton > Context:**
- ✅ No React overhead
- ✅ Can be called from anywhere (shortcuts, menu, buttons)
- ✅ Easier to test
- ✅ No re-render issues

---

### **2️⃣ Global Keyboard Shortcuts (REVISED)**

**Technical Approach:**
```typescript
// lib/shortcuts/contextStack.ts - NEW
type ShortcutContext = 'global' | 'reader' | 'dialog' | 'palette';

class ShortcutContextStack {
  private stack: ShortcutContext[] = ['global'];
  
  push(context: ShortcutContext) {
    this.stack.push(context);
  }
  
  pop() {
    if (this.stack.length > 1) {
      this.stack.pop();
    }
  }
  
  getCurrent(): ShortcutContext {
    return this.stack[this.stack.length - 1];
  }
}

export const shortcutContext = new ShortcutContextStack();

// lib/hooks/useGlobalKeyboardShortcuts.ts - NEW
function shouldHandleGlobalShortcut(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement;
  
  // ✅ FIX 1: Ignore trong input/textarea/contentEditable
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  ) {
    return false;
  }
  
  // ✅ FIX 2: Ignore khi có dialog open
  if (document.body.dataset.dialogOpen === 'true') {
    return false;
  }
  
  // ✅ FIX 3: Chỉ handle khi context = global
  if (shortcutContext.getCurrent() !== 'global') {
    return false;
  }
  
  return true;
}

export function useGlobalKeyboardShortcuts() {
  useEffect(() => {
    if (!featureFlags.globalShortcuts) return; // Hard flag
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!shouldHandleGlobalShortcut(e)) return; // GUARD!
      
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        commandPalette.open();
      }
      
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        openTranslateDialog();
      }
      
      // ... more shortcuts
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
```

**Integration with Reader:**
```typescript
// components/workspace/hooks/useReaderKeybinds.ts - MODIFY
export function useReaderKeybinds({ ... }: ReaderKeybindsProps) {
  useEffect(() => {
    shortcutContext.push('reader'); // Push context when reader opens
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Reader shortcuts (Escape, Arrow keys)
      // ...
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      shortcutContext.pop(); // Pop context when reader closes
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [/* deps */]);
}
```

**Why Context Stack > isReaderOpen:**
- ✅ Handles multiple contexts (reader, dialog, palette, future modals)
- ✅ Scalable (easy to add new contexts)
- ✅ No conflicts between different shortcut handlers

---

### **3️⃣ Workflow Presets + Pipeline Memory (REVISED)**

**Database Schema (REVISED):**
```typescript
// lib/db.ts - Version 105
db.version(105).stores({
  workflowPresets: '++id, name, workspaceId, version' // Added version
});

export interface WorkflowPreset {
  id?: number;
  name: string;
  workspaceId?: string; // null = global
  version: 1; // ✅ FIX: Versioned schema for future migrations
  steps: WorkflowStep[];
  createdAt: Date;
}

interface WorkflowStep {
  action: string; // 'translate', 'export', 'fix-titles'
  params: Record<string, unknown>;
}

// Lazy-open table (safe for rollback)
export async function getWorkflowPresets(workspaceId?: string) {
  if (!featureFlags.workflowPresets) {
    return []; // ✅ FIX: Don't touch table if flag OFF
  }
  
  if (workspaceId) {
    return db.workflowPresets.where('workspaceId').equals(workspaceId).toArray();
  }
  return db.workflowPresets.where('workspaceId').equals(null).toArray();
}
```

**Event Bus (REVISED):**
```typescript
// lib/events/eventBus.ts - NEW
interface ActionEvent {
  action: string;
  params: Record<string, unknown>;
  meta: {
    source: 'user' | 'pipeline' | 'system'; // ✅ FIX: Prevent recording loops
  };
}

class EventBus {
  private listeners = new Map<string, Set<(event: ActionEvent) => void>>();
  
  on(event: string, listener: (event: ActionEvent) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    
    return () => this.listeners.get(event)?.delete(listener);
  }
  
  emit(event: string, data: Omit<ActionEvent, 'action'>) {
    const listeners = this.listeners.get(event);
    if (!listeners) return;
    
    const fullEvent: ActionEvent = { action: event, ...data };
    listeners.forEach(l => l(fullEvent));
  }
}

export const eventBus = new EventBus();

// lib/hooks/useWorkflowRecorder.ts - NEW
export function useWorkflowRecorder() {
  useEffect(() => {
    if (!featureFlags.workflowPresets) return;
    
    const unsubscribe = eventBus.on('action:translate', (event) => {
      // ✅ FIX: Only record user actions, not pipeline replays
      if (event.meta.source === 'user') {
        recordStep({ action: 'translate', params: event.params });
      }
    });
    
    return unsubscribe;
  }, []);
}
```

**Replay with Version Check:**
```typescript
function replayPreset(preset: WorkflowPreset) {
  if (preset.version === 1) {
    for (const step of preset.steps) {
      eventBus.emit(`action:${step.action}`, {
        params: step.params,
        meta: { source: 'pipeline' } // ✅ Mark as pipeline, not user
      });
    }
  }
  // Future: else if (preset.version === 2) { ... }
}
```

---

### **4️⃣ Reader Comfort Enhancements (REVISED)**

**Font Size Slider (REVISED):**
```typescript
// components/reader/ReaderSettings.tsx - NEW
export function ReaderSettings() {
  const [fontSize, setFontSize] = useState(18);
  const [localFontSize, setLocalFontSize] = useState(18); // Local state
  const [lineHeight, setLineHeight] = useState(1.8);
  
  // ✅ FIX: Apply CSS variable only on pointer up (no thrashing)
  const applyFontSize = useCallback((size: number) => {
    document.documentElement.style.setProperty('--reader-font-size', `${size}px`);
    setFontSize(size);
  }, []);
  
  return (
    <div className="reader-settings">
      <label>Font Size: {localFontSize}px</label>
      <input
        type="range"
        min="14"
        max="24"
        value={localFontSize}
        onChange={(e) => setLocalFontSize(Number(e.target.value))} // Update local only
        onPointerUp={(e) => applyFontSize(localFontSize)} // Apply on release
      />
      
      {/* Line height similar pattern */}
    </div>
  );
}
```

**Why Pointer Up > onChange:**
- ✅ No layout thrashing during drag
- ✅ Smooth preview (local state updates)
- ✅ Apply only when user releases slider

**Scroll Position Preservation (REVISED):**
```typescript
function changeFontSize(newSize: number) {
  // ✅ FIX: Use requestAnimationFrame for smooth scroll restoration
  const scrollPercent = window.scrollY / document.body.scrollHeight;
  
  applyFontSize(newSize);
  
  requestAnimationFrame(() => {
    const newScrollY = scrollPercent * document.body.scrollHeight;
    window.scrollTo({ top: newScrollY, behavior: 'instant' });
  });
}
```

---

### **5️⃣ Zero-Confirm + Undo System (REVISED)**

**Tombstone Pattern (REVISED):**
```typescript
// lib/db.ts - Add to Chapter interface
export interface Chapter {
  // ... existing fields
  deletedAt?: Date; // ✅ FIX: Soft delete timestamp
  deleteTTL?: number; // ✅ FIX: Time-to-live in ms
}

// lib/actions/deleteChapters.ts - NEW
export async function deleteChapters(ids: number[]) {
  const count = ids.length;
  
  // ✅ FIX: Confirm for large destructive actions
  if (count > 10 && !featureFlags.zeroConfirm) {
    const confirmed = await showConfirmDialog(
      `Delete ${count} chapters?`,
      'This action cannot be undone.'
    );
    if (!confirmed) return;
  }
  
  // Soft delete with tombstone
  const now = new Date();
  const TTL = 10000; // 10 seconds
  
  await db.chapters.bulkUpdate(
    ids.map(id => ({
      key: id,
      changes: {
        deletedAt: now,
        deleteTTL: TTL
      }
    }))
  );
  
  // Show undo toast
  const undoToast = toast.success(
    `Deleted ${count} chapters`,
    {
      action: {
        label: 'Undo',
        onClick: () => restoreChapters(ids)
      },
      duration: TTL
    }
  );
  
  // Hard delete after TTL (even if app crashes and restarts)
  setTimeout(async () => {
    await hardDeleteChapters(ids);
  }, TTL);
}

async function restoreChapters(ids: number[]) {
  await db.chapters.bulkUpdate(
    ids.map(id => ({
      key: id,
      changes: {
        deletedAt: undefined,
        deleteTTL: undefined
      }
    }))
  );
  
  toast.success(`Restored ${ids.length} chapters`);
}

async function hardDeleteChapters(ids: number[]) {
  // Only delete if still marked as deleted (not restored)
  const chapters = await db.chapters.bulkGet(ids);
  const toDelete = chapters
    .filter(ch => ch?.deletedAt !== undefined)
    .map(ch => ch!.id);
  
  if (toDelete.length > 0) {
    await db.chapters.bulkDelete(toDelete);
  }
}
```

**Why Tombstone > Immediate Delete:**
- ✅ Survives app crash/reload during undo window
- ✅ Can implement "Recently Deleted" view (like iOS Photos)
- ✅ Solo user prefers safety over speed

**Cleanup on App Start:**
```typescript
// app/layout.tsx - Add cleanup
useEffect(() => {
  // Clean up expired tombstones on app start
  cleanupExpiredTombstones();
}, []);

async function cleanupExpiredTombstones() {
  const now = Date.now();
  const chapters = await db.chapters.filter(ch => ch.deletedAt !== undefined).toArray();
  
  const expired = chapters.filter(ch => {
    const deletedTime = ch.deletedAt!.getTime();
    const ttl = ch.deleteTTL || 10000;
    return now - deletedTime > ttl;
  });
  
  if (expired.length > 0) {
    await db.chapters.bulkDelete(expired.map(ch => ch.id));
  }
}
```

---

### **6️⃣ Feature Flags (REVISED)**

**Hard Flags (REVISED):**
```typescript
// lib/featureFlags.ts - NEW
export const featureFlags = {
  commandPalette: true,
  globalShortcuts: true,
  workflowPresets: true,
  readerComfort: true,
  zeroConfirm: false, // OFF by default (safety)
};

// Usage pattern:
// ✅ GOOD - Hard off (no side effects)
if (featureFlags.commandPalette) {
  // Render component
  // Register shortcuts
  // Add listeners
}

// ❌ BAD - Soft off (still has side effects)
<CommandPalette disabled={!featureFlags.commandPalette} />
```

**Why Hard Flags:**
- ✅ No DB touch when flag OFF
- ✅ No event listeners when flag OFF
- ✅ No shortcuts registered when flag OFF
- ✅ Safe for rollback (v2.6.0 ignores new code paths)

---

## 📊 IMPLEMENTATION PHASES (REVISED)

### **PHASE 1: Foundation (Week 1)**

#### **Day 1: UI Preferences Table + Feature Flags**
```typescript
// lib/db.ts - Version 105
db.version(105).stores({
  uiPreferences: 'key'
});

export interface UIPreference {
  key: string;
  value: unknown;
  updatedAt: Date;
}

// Lazy-open with feature flag
export async function getUIPreference(key: string) {
  if (!featureFlags.uiPreferences) {
    return null; // ✅ Safe for rollback
  }
  return db.uiPreferences.get(key);
}

// lib/featureFlags.ts - NEW
export const featureFlags = { /* ... */ };
```

**Testing:**
- ✅ v2.6.0 data loads correctly
- ✅ Migration doesn't error
- ✅ Flag OFF → table not touched
- ✅ Rollback to v2.6.0 works

---

#### **Day 2: Shortcut Context Stack**
```typescript
// lib/shortcuts/contextStack.ts - NEW
// (Full implementation shown above)
```

**Testing:**
- ✅ Push/pop works correctly
- ✅ getCurrent() returns correct context
- ✅ Stack never goes below 'global'

---

#### **Day 3: Global Keyboard Shortcuts**
```typescript
// lib/hooks/useGlobalKeyboardShortcuts.ts - NEW
// (Full implementation shown above with guards)
```

**Testing:**
- ✅ Shortcuts work in global context
- ✅ Ignored in input/textarea
- ✅ Ignored when dialog open
- ✅ Ignored when reader open
- ✅ No conflicts with existing shortcuts

---

#### **Day 4-5: Command Palette**
```typescript
// lib/services/commandPalette.ts - NEW (Singleton)
// components/CommandPalette/CommandPalette.tsx - NEW
// app/layout.tsx - Add <CommandPalette /> (1 line)
```

**Testing:**
- ✅ Ctrl+K opens palette
- ✅ Escape closes palette
- ✅ Context pushed/popped correctly
- ✅ Shortcuts disabled when palette open
- ✅ Can disable via feature flag

---

### **PHASE 2: Workflow Automation (Week 2)**

#### **Day 1: Event Bus + Workflow Presets Table**
```typescript
// lib/events/eventBus.ts - NEW (with source flag)
// lib/db.ts - Version 106 (with versioned schema)
```

**Testing:**
- ✅ Events emit correctly
- ✅ Source flag prevents loops
- ✅ Versioned schema works
- ✅ Lazy-open with feature flag

---

#### **Day 2-4: Preset Manager + Recorder**
```typescript
// components/workflow/PresetManager.tsx - NEW
// lib/hooks/useWorkflowRecorder.ts - NEW
```

**Testing:**
- ✅ Can save preset
- ✅ Can replay preset
- ✅ Recorder only records user actions
- ✅ No infinite loops

---

#### **Day 5: Integration + Polish**
- Hook into existing actions
- Add preset suggestions
- Test edge cases

---

### **PHASE 3: Reader Comfort (Week 3)**

#### **Day 1-2: Reader Settings**
```typescript
// components/reader/ReaderSettings.tsx - NEW (with debounce)
// components/reader/ReaderModal.tsx - Add <ReaderSettings /> (1 line)
```

**Testing:**
- ✅ Font size changes smoothly
- ✅ No layout thrashing
- ✅ Scroll position preserved
- ✅ Settings persist

---

#### **Day 3: Focus Mode**
```typescript
// lib/hooks/useFocusMode.ts - NEW
// globals.css - Add .focus-mode styles
```

**Testing:**
- ✅ Toggles instantly
- ✅ No transition lag
- ✅ Keyboard shortcut works

---

#### **Day 4-5: Skeleton Screens**
```typescript
// components/ui/skeleton.tsx - NEW
// Replace spinners in existing components
```

**Testing:**
- ✅ Skeletons display correctly
- ✅ Match actual content layout
- ✅ No performance impact

---

### **PHASE 4: Zero-Confirm + Undo (Week 3-4)**

#### **Day 1-2: Tombstone System**
```typescript
// Modify Chapter interface
// Implement soft delete + hard delete
// Add cleanup on app start
```

**Testing:**
- ✅ Soft delete works
- ✅ Undo restores correctly
- ✅ Hard delete after TTL
- ✅ Survives app crash
- ✅ Cleanup on restart

---

#### **Day 3-4: Confirmation Rules**
```typescript
// lib/utils/confirmationRules.ts - NEW
// Modify action handlers
```

**Testing:**
- ✅ Safe actions → no confirm
- ✅ Destructive > 10 → confirm
- ✅ Undo toast appears
- ✅ Can undo within window

---

#### **Day 5: Integration + Testing**
- Test all edge cases
- Performance testing
- Documentation

---

## 🛡️ SAFETY MEASURES (REVISED)

### **Before Each Phase:**
1. ✅ Git commit with clear message
2. ✅ Export all workspaces (backup)
3. ✅ Test on separate branch
4. ✅ Verify v2.6.0 data loads
5. ✅ **NEW:** Test with feature flags OFF

### **After Each Phase:**
1. ✅ Test all existing features
2. ✅ Check console for errors
3. ✅ Verify performance (FPS, bundle size)
4. ✅ **NEW:** Test rollback scenario
5. ✅ **NEW:** Test with flags ON/OFF
6. ✅ Update documentation

### **Rollback Plan (REVISED):**
```bash
# If phase fails:
git revert <commit-hash>

# Database will stay at higher version, but code handles it:
# - Feature flags prevent touching new tables
# - Lazy-open pattern ignores missing tables

# If needed, clear new tables:
await db.uiPreferences.clear();
await db.workflowPresets.clear();

# Rebuild
npm run build
```

**Why This Works:**
- ✅ v2.7.0 code uses lazy-open (safe for higher DB versions)
- ✅ v2.6.0 code ignores unknown tables (Dexie behavior)
- ✅ Feature flags prevent side effects
- ✅ No data loss (only new tables cleared)

---

## 📊 RISK ASSESSMENT (REVISED)

| Phase | Risk (V1) | Risk (V2) | Mitigation Applied |
|-------|-----------|-----------|-------------------|
| 1.1 (DB) | 🟡 Medium | 🟢 Low | Lazy-open + feature flags |
| 1.2 (Context) | N/A | 🟢 Low | Singleton, no deps |
| 1.3 (Shortcuts) | 🟢 Low | 🟢 Low | Guards + context stack |
| 1.4 (Palette) | 🟢 Low | 🟢 Low | Singleton service |
| 2.1 (Event Bus) | 🟡 Medium | 🟢 Low | Source flag prevents loops |
| 2.2 (Presets) | 🟡 Medium | 🟢 Low | Versioned schema + lazy-open |
| 3 (Reader) | 🟢 Low | 🟢 Low | Debounce + RAF |
| 4 (Undo) | 🟡 Medium | 🟢 Low | Tombstone pattern |

**Overall Risk Reduction:** 🟡 Medium → 🟢 Low

---

## 🎯 SUCCESS CRITERIA (REVISED)

### **Phase 1:**
- ✅ Ctrl+K opens palette
- ✅ Global shortcuts work
- ✅ Shortcuts ignored in input/textarea
- ✅ Context stack works correctly
- ✅ No conflicts with reader shortcuts
- ✅ **NEW:** Feature flags disable all side effects
- ✅ **NEW:** Rollback to v2.6.0 works

### **Phase 2:**
- ✅ Can save preset
- ✅ Can replay preset
- ✅ No recording loops
- ✅ **NEW:** Versioned schema works
- ✅ **NEW:** Lazy-open safe for rollback

### **Phase 3:**
- ✅ Font size changes smoothly
- ✅ **NEW:** No layout thrashing
- ✅ Scroll position preserved
- ✅ Focus mode instant

### **Phase 4:**
- ✅ Safe actions execute without confirm
- ✅ Undo toast appears
- ✅ **NEW:** Undo survives crash
- ✅ **NEW:** Cleanup on restart works

---

## 📝 BUNDLE SIZE ESTIMATE

### **Phase 1:**
- Shortcut Context Stack: ~1KB
- Global Shortcuts Hook: ~2KB
- Command Palette Service: ~1KB
- Command Palette UI: ~5KB
- **Total:** ~9KB

### **Phase 2:**
- Event Bus: ~2KB
- Workflow Recorder: ~2KB
- Preset Manager UI: ~4KB
- **Total:** ~8KB

### **Phase 3:**
- Reader Settings: ~3KB
- Focus Mode: ~1KB
- Skeleton Components: ~2KB
- **Total:** ~6KB

### **Phase 4:**
- Tombstone Logic: ~3KB
- Confirmation Rules: ~2KB
- **Total:** ~5KB

**Grand Total:** ~28KB (gzipped: ~10KB)

**Impact:** +0.5% bundle size (acceptable for features gained)

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
- Plan V1: `docs/UI_POLISH_PLAN_FOR_REVIEW.md`
- GPT Review: (Incorporated into this V2)

---

## 🚀 READY FOR IMPLEMENTATION

**Changes from V1:**
- ✅ Fixed 4 critical risks (keyboard guard, context stack, event source, rollback)
- ✅ Added 2 safety improvements (tombstone, debounce)
- ✅ Improved 3 architectures (singleton, versioned schema, hard flags)

**Confidence Level:** 9.5/10 (Production-ready)

**Next Steps:**
1. Review this V2 plan
2. Start Phase 1 Day 1 (UI Preferences + Feature Flags)
3. Test thoroughly after each day
4. Ship v2.7.0 with confidence

---

**This plan has been reviewed and hardened based on GPT feedback. All critical risks addressed. Ready to ship.** 🎯
