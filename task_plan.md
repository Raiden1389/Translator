# Task Plan: AI NER Consolidation & System Refinement

## Goal
Streamline the entity extraction process by merging the experimental Name Hunter into a robust, AI-powered extraction service that handles large text volumes efficiently.

---

## Phase 1: Context Offloading (Complete)
- [x] Create documentation files (`findings.md`, `progress.md`) for assistant memory.
- [x] Summarize core system logic.

## Phase 2: AI NER v3.0 & Review UI Refinement (Complete)
- [x] Scrapped separate `NameHunterDialog` (Too complex, redundant).
- [x] Unified AI extraction logic in `useAIExtraction` hook.
- [x] Implemented **AI NER v3.0**:
    - [x] Chunked scanning (supports 300+ chapters).
    - [x] AI-Generated Descriptions for entities (context-aware).
    - [x] Description preservation logic (no overrides).
    - [x] Hán Việt normalization for extracted names.
- [x] Refined **ReviewDialog UI**:
    - [x] Visual anchoring (Chinese Serif vs. Vietnamese Emerald).
    - [x] Compact layout with left selection indicators.
    - [x] Simplified reader header (removed old buttons).
- [x] **Production Readiness**:
    - [x] Bumped version to v1.5.0.
    - [x] Successful `npm run build`.
    - [x] Committed and Pushed to Git.
    - [x] Initiated `tauri build`.

---

## Phase 3: Research & Optimization
- [ ] Experiment with cheaper models (Gemini Flash 2.0) for high-frequency scanning.
- [ ] Implement "Suggest Translation" feature using RAG from project dictionary.

---

## Decisions & Meta-Knowledge
| Decision Date | Decision | Reason |
|---------------|----------|--------|
| 2026-01-28    | External Memory Pattern | Using disk files to manage assistant context window. |
| 2026-01-28    | Selective Glossary | Confirmed existing in app; focus now on assistant memory. |
