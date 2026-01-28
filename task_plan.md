# Task Plan: AI NER Consolidation & System Refinement

## Goal
Streamline the entity extraction process by merging the experimental Name Hunter into a robust, AI-powered extraction service that handles large text volumes efficiently.

---

## Phase 1: Context Offloading (Complete)
- [x] Create documentation files (`findings.md`, `progress.md`) for assistant memory.
- [x] Summarize core system logic.

## Phase 2: Name Hunter Deprecation & AI NER Integration (Current)
- [x] Scrapped separate `NameHunterDialog` (Too complex, redundant).
- [x] Unified AI extraction logic in `useAIExtraction` hook.
- [x] Implemented **AI NER v3.0** in `AiExtractor.ts`:
    - [x] Chunked scanning (supports 300+ chapters).
    - [x] Robust JSON parsing with auto-recovery.
    - [x] Hán Việt normalization for extracted names.
- [x] Added `ScanConfigDialog`: Configuration for entity types (Person, Location, Skill...).
- [x] Implemented **Smart Filter**: Automatically hide terms already present in the dictionary.
- [ ] Add Custom Pattern Rules (Regex) to the unified UI.

## Phase 3: Research & Optimization
- [ ] Experiment with cheaper models (Gemini Flash 2.0) for high-frequency scanning.
- [ ] Implement "Suggest Translation" feature using RAG from project dictionary.

---

## Decisions & Meta-Knowledge
| Decision Date | Decision | Reason |
|---------------|----------|--------|
| 2026-01-28    | External Memory Pattern | Using disk files to manage assistant context window. |
| 2026-01-28    | Selective Glossary | Confirmed existing in app; focus now on assistant memory. |
