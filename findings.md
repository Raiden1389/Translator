# Findings: Raiden AI Translator - Compressed Knowledge

This file serves as the "Long-term Memory" for Antigravity to avoid redundant codebase scanning.

## Tech Stack Summary
- **Core:** Next.js 16 (React 19), Tauri (Rust), Tailwind CSS 4.
- **Database:** IndexedDB (Dexie.js wrapper).
- **AI:** Gemini API (`@google/genai`), Google Flash/Pro models.

## Key Logic Modules

### 1. Translation Pipeline (`lib/gemini/translate.ts`)
- **Selective Glossary:** Filters dictionary entries to only those present in the source text (limit 30) before sending to AI.
- **Smart Capitalization (v2.0):** Post-translation `finalSweep` that enforces Vietnamese grammar for pronouns (Ta, Hắn, v.v.) using both system rules and user dictionary.
- **Chunking:** Handles token limits by splitting chapters.

### 2. AI NER & Entity Extraction (`lib/services/name-hunter/ai-extractor.ts`)
- **Unified Engine:** Replaced the heuristic Name Hunter with a pure AI NER engine.
- **Robustness:** Custom JSON parser that recovers from truncated AI responses.
- **Chunking:** Automatically splits large document volumes (Chapter range) into optimal chunks for AI scanning.
- **Hán Việt Normalization:** Automatically converts Chinese character results to Hán Việt for the Vietnamese UI.
- **Selective Review:** Displays only NEW entries to the user by filtering against the existing dictionary.

### 3. Database Schema (`.brain/brain.json`)
- **Tables:** `workspaces`, `chapters`, `dictionary`, `blacklist`, `corrections`, `settings`.
- **Live Updates:** Uses Dexie `useLiveQuery` for reactive UI.

## Critical Files Map
- `lib/gemini/translate.ts`: Core translation logic.
- `lib/gemini/helpers.ts`: Post-processing, correction application.
- `lib/gemini/constants.ts`: System prompts and rules.
- `docs/architecture/system_overview.md`: High-level design.

---
*Last Updated: 2026-01-28*
