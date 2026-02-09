# Phase 01: CSS Variables & Tokens Setup
Status: 🟡 In Progress
Dependencies: None

## Objective
Establish the technical foundation for the theme system by defining core and semantic variables for both Light and Dark modes.

## Implementation Steps
1. [ ] Create `app/styles/themes.css` with `:root` and `.dark` blocks.
2. [ ] Define Core Color Tokens (Backgrounds, Texts, Borders).
3. [ ] Define Semantic Tokens (App-level, Panel, Sidebar).
4. [ ] Define Utility Tokens (Radius, Motion, Shadows).
5. [ ] Integrate `themes.css` into the global CSS entry point.

## Files to Create/Modify
- `app/styles/themes.css` - New design tokens file.
- `app/globals.css` - Import the new tokens.

## Test Criteria
- [ ] Inspect element shows variables are loaded.
- [ ] Switching `.dark` class on `html` tag changes variable values.
- [ ] No hardcoded hex values in `themes.css`.
