# Overlay Update Plan - Add Notification Badge

**Goal:** Add notification badge to TranslationProgressOverlay matching mockup design

---

## 📋 Changes Needed

### 1. **Add Notification Badge Component** (Above main card)

**Location:** Between wrapper div and main card  
**Design:** Pill-shaped badge with:
- Icon (🚀/⚡/🎉/❌)
- Message text
- Auto-dismiss progress bar (5s)
- Color-coded by type

**Code:**
```tsx
{latestNotification && (
  <div className="mb-3 animate-in slide-in-from-top-2 fade-in">
    <div className={cn(
      "px-4 py-2.5 rounded-full border backdrop-blur-xl shadow-lg",
      "flex items-center gap-2 relative overflow-hidden",
      notificationColor[latestNotification.type]
    )}>
      <span>{notificationIcon[latestNotification.type]}</span>
      <span className="text-sm font-medium">{latestNotification.message}</span>
      {/* Auto-dismiss bar */}
      <div className="absolute bottom-0 left-0 h-0.5 bg-current/30 w-full animate-shrink-5s" />
    </div>
  </div>
)}
```

### 2. **Update useTranslationProgress Hook**

Add notification tracking:
```typescript
export interface SystemNotification {
  id: string;
  message: string;
  type: 'init' | 'turbo' | 'success' | 'error';
  timestamp: number;
}

// Add to hook return
notifications: SystemNotification[];
addNotification: (notification: Omit<SystemNotification, 'id' | 'timestamp'>) => void;
```

### 3. **Update TranslationProvider.v2**

Replace toast calls with notifications:
```typescript
// Init
progress.addNotification({ 
  message: "🚀 Đang khởi tạo hệ thống...", 
  type: 'init' 
});

// Turbo
progress.addNotification({ 
  message: `⚡ Turbo Mode: Đã kích hoạt [${parallelCount} luồng]`, 
  type: 'turbo' 
});

// Success
progress.addNotification({ 
  message: `🎉 Hoàn thành ${stats.completedChapters}/${stats.totalChapters} chương`, 
  type: 'success' 
});
```

### 4. **CSS Animation** (Add to globals.css)

```css
@keyframes shrink {
  from { width: 100%; }
  to { width: 0%; }
}

.animate-shrink-5s {
  animation: shrink 5s linear forwards;
}
```

---

## 🎨 Visual Design (Matching Mockup)

**Notification Badge:**
- Position: Above main card, margin-bottom: 12px
- Shape: Rounded-full pill
- Background: Semi-transparent color (type-based)
- Border: Subtle border matching background
- Backdrop: Blur effect
- Shadow: Soft shadow
- Animation: Slide in from top + fade in

**Colors:**
- Init (🚀): Blue - `bg-blue-500/20 border-blue-500/30 text-blue-300`
- Turbo (⚡): Purple - `bg-purple-500/20 border-purple-500/30 text-purple-300`
- Success (🎉): Green - `bg-emerald-500/20 border-emerald-500/30 text-emerald-300`
- Error (❌): Red - `bg-red-500/20 border-red-500/30 text-red-300`

---

## 📊 Implementation Steps

1. ✅ Add `SystemNotification` interface (DONE)
2. ✅ Add `notifications` prop to overlay (DONE)
3. ✅ Add auto-dismiss logic (DONE)
4. ⏳ Add notification badge UI
5. ⏳ Update `useTranslationProgress` with `addNotification()`
6. ⏳ Update `TranslationProvider.v2` to use notifications
7. ⏳ Add CSS animation
8. ⏳ Test notification flow

---

## 🔄 Next Action

**Sếp approve → Em sẽ:**
1. Complete overlay UI update
2. Add `addNotification()` to progress hook
3. Wire up notifications in Provider
4. Test full flow

**Estimated time:** 15-20 minutes
