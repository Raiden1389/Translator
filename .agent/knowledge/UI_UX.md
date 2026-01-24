# UI/UX & Design Language: "Max Ping" Standards

Guidelines for maintaining a premium, responsive, and efficient interface for solo power-users.

## 1. Action Hub Pattern (Grid 2x2)
Utility actions (Export, Import, Cache) should be grouped in a compact 2x2 grid in headers.
- **Dimensions:** Buttons should be `h-7 w-7` or `h-8 w-8`.
- **Transitions:** Use `transition-all` with subtle hover scaling (`hover:scale-105`).

## 2. Visual Feedback (The "Glow" standard)
Destructive or high-impact actions MUST provide clear visual feedback.
- **Standard:** Use `hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]` for delete actions.
- **Color Palettes:** High-contrast variants of emerald (success), amber (warning), and red (danger).

## 3. State Continuity (Sticky Context)
Solo users should never lose their workflow context.
- **Standard:** Use `usePersistedState` for filter types, view modes (Grid vs Table), and items-per-page.

## 4. Typography
- **Primary:** `Inter` or `Geist` for UI controls.
- **Reading:** `Lora` (Serif) with `leading-loose` for translation text to reduce eye strain.
