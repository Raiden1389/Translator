/**
 * Translation Parser Module
 * Handles parsing of AI Plain Text responses into structured format
 */

import { TranslationResult } from "../types";

/**
 * Parse Plain Text chapter response from AI
 * 
 * Format expected:
 * Line 1: Translated Title
 * Line 2+: Translated Content
 * 
 * Philosophy: Don't force AI to be perfect, parser should handle "dirty" output
 * 
 * Cases handled:
 * 1. Empty response → Return default title + empty content
 * 2. Single line → Treat as title only
 * 3. Multiple lines → First line = title, rest = content
 */
export function parsePlainTextChapter(rawText: string): TranslationResult {
    const lines = rawText
        .split('\n')
        .map(l => l.trimEnd())
        .filter(l => l.trim() !== "");

    // Case 1: Không có gì
    if (lines.length === 0) {
        return {
            translatedTitle: "Chương: (Tiêu đề chưa xác định)",
            translatedText: ""
        };
    }

    // Case 2: Chỉ có 1 dòng → coi là title
    if (lines.length === 1) {
        return {
            translatedTitle: sanitizeTitle(lines[0]),
            translatedText: ""
        };
    }

    // Case 3: Chuẩn – dòng 1 title, còn lại là content
    return {
        translatedTitle: sanitizeTitle(lines[0]),
        translatedText: lines.slice(1).join('\n').trim()
    };
}

/**
 * Clean up title by removing common prefixes
 * Examples:
 * - "Tiêu đề: Chương 1" → "Chương 1"
 * - "Chapter: The Beginning" → "The Beginning"
 */
function sanitizeTitle(title: string): string {
    return title
        .replace(/^(tiêu đề|title|chapter|chương)\s*[:\-]\s*/i, "")
        .trim();
}
