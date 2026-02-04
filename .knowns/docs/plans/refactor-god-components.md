---
title: Refactor Plan - God Component Elimination
createdAt: '2026-02-04T13:14:00.000Z'
updatedAt: '2026-02-04T13:14:00.000Z'
description: Detailed refactoring plan for TranslationProvider and ReaderModal
tags: [refactor, plan, architecture]
---

# 🏗️ Refactor Plan: God Component Elimination

> **Goal:** Break down 2 god components (TranslationProvider, ReaderModal) into maintainable pieces.
> **Timeline:** 3 phases, ~4-6 hours total
> **Risk:** Medium (touching core features)

---

## 📊 Current State Analysis

### 🔴 TranslationProvider.tsx (400 LOC)
**Violations:**
- ❌ Size: 400 LOC (threshold: 300)
- ❌ State Ownership: 15+ state variables
- ❌ Side Effects: 8 useEffect hooks
- ❌ Responsibility: UI + queue management + progress tracking + cost calculation

**Severity:** 4/12 violations → **MUST REFACTOR**

### 🔴 ReaderModal.tsx (500 LOC)
**Violations:**
- ❌ Size: 500 LOC (threshold: 300)
- ❌ Logic vs View: Complex logic in JSX
- ❌ Side Effects: 6 useEffect hooks
- ❌ Props: 12 props (threshold: 7)
- ❌ Responsibility: UI + navigation + settings + keybinds + TTS

**Severity:** 5/12 violations → **GOD COMPONENT**

---

## 🎯 Phase 1: TranslationProvider Refactor

### Step 1.1: Extract Queue Management Hook
**File:** `components/workspace/hooks/useTranslationQueue.ts`

**Responsibilities:**
- Manage translation queue state
- Add/remove items from queue
- Track queue status (running/queued/done)
- Handle queue errors

**Interface:**
```typescript
interface UseTranslationQueueReturn {
  queue: TranslationQueueItem[];
  addToQueue: (chapterId: number) => void;
  removeFromQueue: (chapterId: number) => void;
  clearQueue: () => void;
  queueStatus: Map<number, QueueStatus>;
}

export function useTranslationQueue(workspaceId: number): UseTranslationQueueReturn
```

**Extracted State:**
- `translationQueue`
- `queueStatus`
- `isTranslating`

**Extracted Effects:**
- Queue processing loop
- Queue status updates

---

### Step 1.2: Extract Progress Tracking Hook
**File:** `components/workspace/hooks/useTranslationProgress.ts`

**Responsibilities:**
- Track translation progress per chapter
- Calculate aggregate stats (total tokens, cost)
- Parse log messages for progress updates
- Emit progress events

**Interface:**
```typescript
interface UseTranslationProgressReturn {
  progress: Map<number, TranslationProgress>;
  aggregateStats: AggregateStats;
  updateProgress: (chapterId: number, data: Partial<TranslationProgress>) => void;
  resetProgress: (chapterId: number) => void;
}

export function useTranslationProgress(): UseTranslationProgressReturn
```

**Extracted State:**
- `translationProgress`
- `aggregateStats`
- `currentChapterProgress`

**Extracted Effects:**
- Progress calculation
- Stats aggregation

---

### Step 1.3: Slim Down TranslationProvider
**Result:** ~150 LOC (down from 400)

**Remaining Responsibilities:**
- Provide context to children
- Orchestrate hooks (useTranslationQueue + useTranslationProgress)
- Render TranslationProgressOverlay

**New Structure:**
```typescript
export function TranslationProvider({ children, workspaceId }) {
  const queue = useTranslationQueue(workspaceId);
  const progress = useTranslationProgress();
  
  const value = {
    ...queue,
    ...progress,
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
      <TranslationProgressOverlay />
    </TranslationContext.Provider>
  );
}
```

---

## 🎯 Phase 2: ReaderModal Refactor

### Step 2.1: Extract Navigation Hook
**File:** `components/workspace/hooks/useReaderNavigation.ts`

**Responsibilities:**
- Handle prev/next chapter navigation
- Track current chapter index
- Handle keyboard shortcuts (arrow keys)
- Scroll to top on chapter change

**Interface:**
```typescript
interface UseReaderNavigationReturn {
  currentIndex: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  goToPrev: () => void;
  goToNext: () => void;
  goToChapter: (id: number) => void;
}

export function useReaderNavigation(
  chapters: Chapter[],
  currentChapterId: number,
  onNavigate: (id: number) => void
): UseReaderNavigationReturn
```

**Extracted State:**
- `currentIndex`
- Navigation flags

**Extracted Effects:**
- Keyboard event listeners
- Scroll to top on change

---

### Step 2.2: Extract TTS Hook
**File:** `components/workspace/hooks/useReaderTTS.ts`

**Responsibilities:**
- Manage TTS playback state
- Handle play/pause/stop
- Track current sentence
- Handle TTS errors

**Interface:**
```typescript
interface UseReaderTTSReturn {
  isPlaying: boolean;
  currentSentence: number;
  play: () => void;
  pause: () => void;
  stop: () => void;
  skipToSentence: (index: number) => void;
}

export function useReaderTTS(content: string): UseReaderTTSReturn
```

**Extracted State:**
- `isTTSPlaying`
- `currentSentence`
- `ttsError`

**Extracted Effects:**
- TTS playback management
- Sentence tracking

---

### Step 2.3: Extract Toolbar Component
**File:** `components/workspace/ReaderToolbar.tsx`

**Responsibilities:**
- Render toolbar buttons (close, prev, next, settings, TTS)
- Handle toolbar actions
- Show keyboard shortcuts

**Props:**
```typescript
interface ReaderToolbarProps {
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleSettings: () => void;
  onToggleTTS: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  isTTSPlaying: boolean;
}
```

**Size:** ~80 LOC

---

### Step 2.4: Extract Content Component
**File:** `components/workspace/ReaderContent.tsx`

**Responsibilities:**
- Render chapter content
- Apply reader settings (font, spacing, etc.)
- Highlight current TTS sentence
- Handle text selection

**Props:**
```typescript
interface ReaderContentProps {
  content: string;
  settings: ReaderSettings;
  currentSentence?: number;
  onTextSelect?: (text: string) => void;
}
```

**Size:** ~120 LOC

---

### Step 2.5: Slim Down ReaderModal
**Result:** ~180 LOC (down from 500)

**Remaining Responsibilities:**
- Orchestrate hooks (navigation, TTS, settings)
- Render layout (toolbar + content + settings panel)
- Handle modal open/close

**New Structure:**
```typescript
export function ReaderModal({ isOpen, chapterId, onClose }) {
  const navigation = useReaderNavigation(chapters, chapterId, handleNavigate);
  const tts = useReaderTTS(content);
  const settings = useReaderSettings();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <ReaderToolbar
        onClose={onClose}
        onPrev={navigation.goToPrev}
        onNext={navigation.goToNext}
        canGoPrev={navigation.canGoPrev}
        canGoNext={navigation.canGoNext}
        isTTSPlaying={tts.isPlaying}
        onToggleTTS={tts.isPlaying ? tts.pause : tts.play}
      />
      <ReaderContent
        content={content}
        settings={settings.current}
        currentSentence={tts.currentSentence}
      />
      {settings.isOpen && <ReaderSettingsPanel {...settings} />}
    </Dialog>
  );
}
```

---

## 🎯 Phase 3: Testing & Validation

### Step 3.1: Unit Tests
**Files to Test:**
- `useTranslationQueue.test.ts`
- `useTranslationProgress.test.ts`
- `useReaderNavigation.test.ts`
- `useReaderTTS.test.ts`

**Test Coverage:**
- Hook state management
- Edge cases (empty queue, last chapter, etc.)
- Error handling

---

### Step 3.2: Integration Tests
**Scenarios:**
1. **Translation Flow:**
   - Add chapters to queue
   - Process queue
   - Track progress
   - Verify final state

2. **Reader Navigation:**
   - Navigate prev/next
   - Keyboard shortcuts
   - Edge cases (first/last chapter)

3. **TTS Playback:**
   - Play/pause/stop
   - Sentence tracking
   - Error recovery

---

### Step 3.3: Manual Testing Checklist
- [ ] Batch translation works (5+ chapters)
- [ ] Progress overlay shows correct stats
- [ ] Reader navigation smooth
- [ ] Keyboard shortcuts work
- [ ] TTS plays correctly
- [ ] Settings persist
- [ ] No console errors
- [ ] No performance regression

---

## 📋 Implementation Order

### Week 1: TranslationProvider
**Day 1-2:**
- [ ] Create `useTranslationQueue` hook
- [ ] Write unit tests
- [ ] Integrate into TranslationProvider

**Day 3-4:**
- [ ] Create `useTranslationProgress` hook
- [ ] Write unit tests
- [ ] Integrate into TranslationProvider

**Day 5:**
- [ ] Slim down TranslationProvider
- [ ] Integration testing
- [ ] Manual testing

---

### Week 2: ReaderModal
**Day 1-2:**
- [ ] Create `useReaderNavigation` hook
- [ ] Create `useReaderTTS` hook
- [ ] Write unit tests

**Day 3:**
- [ ] Extract `ReaderToolbar` component
- [ ] Extract `ReaderContent` component

**Day 4:**
- [ ] Slim down ReaderModal
- [ ] Integration testing

**Day 5:**
- [ ] Manual testing
- [ ] Performance profiling
- [ ] Documentation update

---

## 🚨 Risk Mitigation

### High Risk Areas:
1. **Translation Queue Logic** - Core feature, must not break
2. **Reader Keyboard Shortcuts** - Users rely on this heavily
3. **TTS State Management** - Complex async logic

### Mitigation Strategy:
1. **Feature Flags** - Add toggle to switch between old/new implementation
2. **Incremental Rollout** - Test each hook independently before integration
3. **Rollback Plan** - Keep old code in git history, easy to revert
4. **User Testing** - Get feedback before final commit

---

## 📊 Success Metrics

### Code Quality:
- [ ] All components < 300 LOC
- [ ] All hooks < 150 LOC
- [ ] No component violates > 2 rules
- [ ] Test coverage > 80%

### Performance:
- [ ] No increase in re-renders
- [ ] Translation speed unchanged
- [ ] Reader load time < 500ms

### User Experience:
- [ ] No regressions in functionality
- [ ] No new bugs introduced
- [ ] Positive user feedback

---

## 🔗 Related Documents
- [Component Standards](./component-standards.md) - Quality checklist
- [Guidelines](./guidelines.md) - AI behavior rules
- [Troubleshooting](./troubleshooting.md) - Bug history
