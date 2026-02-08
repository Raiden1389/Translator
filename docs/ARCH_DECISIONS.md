# Architecture Decisions & Project Knowns

This file tracks the core architectural decisions and rules for the Raiden AI Translator project.

---

## 📅 [2026-02-05] Decision: Absolute Removal of Context Caching
- **Context**: The project previously used Turbo Mode (Context Caching) to save costs.
- **Decision**: Completely removed all cache-related logic, files, and UI elements.
- **Why**: The cost savings were marginal compared to the high maintenance overhead and the complexity it added to debugging.
- **Rejected Alternatives**: 
    - Keeping cache only for manual translations (Rejected: too much logic splitting).
    - Optimizing cache TTL (Rejected: cost still didn't justify it).
- **Hard Rule**: DO NOT re-implement caching without a complete cost/benefit audit approved by the user.

---

## 📅 [2026-02-05] Decision: Migration to Translation Engine v2
- **Context**: Needed better queue management and UI feedback.
- **Decision**: Transitioned to `TranslationProvider.v2` and queue-based logic.
- **Status**: V1 files moved to trash/deleted.
- **Rule**: All new translation features must integrate with the `useTranslationQueue` and `useTranslationProgress` hooks.

---

## 📅 [2026-02-05] Non-Tech Safety Protocol (Implementation)
- **Context**: Working with Gemini Flash as a non-tech user.
- **Decision**: Implemented mandatory "Salami Slicing" and "Impact Reports" in `GEMINI.md`.
- **Why**: To prevent AI from deleting or hallucinating code when working with a user who doesn't read code.
