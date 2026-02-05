---
title: Overview
createdAt: '2026-02-03T11:52:05.543Z'
updatedAt: '2026-02-05T03:34:49.316Z'
description: Project Overview
---
# Raiden AI Translator Overview

## Project Info
- **Name:** Raiden AI Translator
- **Type:** Desktop Application (Tauri + Next.js)
- **Status:** Release v2.4.2 (Full Engine Cleanup & Production Ready)

## Tech Stack
- **Frontend:** Next.js 16.1.1 (React 19), Tailwind CSS 4, Lucide React, Dexie.js (IndexedDB)
- **Backend:** Tauri (Rust), Gemini 2.5 Flash (preview-09-2025)
- **State Management:** Custom hooks with `useTranslationQueue` and `useTranslationProgress` (v2).

## Core Features
1. **Multi-language Translation:** Chinese, English, Korean, Japanese -> Vietnamese.
2. **Token Optimization:** Dynamic adaptive tokens and chunking (~35% cost reduction achieved).
3. **Realtime Cost Tracking:** Live token (including thinking tokens) and USD spending tracking per workspace.
4. **Smart Title Fixer:** Automated repair for residual Chinese characters and title normalization.
5. **Heuristic Engine 2.2:** High-speed entity recognition with Double-Check Blacklist and Syllable Stripping.
6. **AI NER v3.0:** Intelligent entity extraction with description and Sino-Vietnamese sync.
7. **AI Correction Engine v2.0:** Case-preserving error correction.
8. **Raiden Mode:** Minimalist reading interface.
9. **TTS:** Multi-language text-to-speech with stability fixes.

## Architectural Decisions
- **Context Caching (Turbo Mode):** DROPPED. Removed for simplicity and cost-efficiency (the savings did not justify the maintenance overhead).
- **Translation Engine v2:** Fully migrated to a queue-based system with persistent progress tracking and 15s post-translation layout visibility.
