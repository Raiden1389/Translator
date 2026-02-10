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
 */
export function parsePlainTextChapter(rawText: string): TranslationResult {
    // 🛡️ BATCH REMOVAL: AI Scout logic removed
    // We no longer split by [METADATA] or look for entities in single chapter responses
    const contentPart = rawText.trim();

    const lines = contentPart
        .split('\n')
        .map(l => l.trimEnd())
        .filter(l => l.trim() !== "");

    let result: TranslationResult;

    // Case 1: Empty response
    if (lines.length === 0) {
        result = {
            translatedTitle: "Chương: (Tiêu đề chưa xác định)",
            translatedText: ""
        };
    } else if (lines.length === 1) {
        // Case 2: Only one line -> treat as title
        result = {
            translatedTitle: sanitizeTitle(lines[0]),
            translatedText: ""
        };
    } else {
        // Case 3: Standard - Line 1 is title, rest is content
        result = {
            translatedTitle: sanitizeTitle(lines[0]),
            translatedText: lines.slice(1).join('\n').trim()
        };
    }

    return result;
}

/**
 * Clean up title by removing common prefixes
 */
function sanitizeTitle(title: string): string {
    return title
        .replace(/^(tiêu đề|title|chapter|chương)\s*[:\-]\s*/i, "")
        .trim();
}
