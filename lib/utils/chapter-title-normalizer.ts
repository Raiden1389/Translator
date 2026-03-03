/**
 * Chapter Title Normalizer V2
 * 
 * Single source of truth for normalizing AI-translated chapter titles.
 * Handles: AI tag cleanup, chapter prefix correction, case normalization.
 * 
 * Previously duplicated in TranslationProvider.v2.tsx (batch + single mode).
 */

import { normalizeTitleCase } from "./title-normalizer";

/**
 * Normalize a translated chapter title against the original.
 * 
 * Flow:
 * 1. Clean AI markers ([TIÊU ĐỀ], Title:, #, *, etc.)
 * 2. Extract chapter number from original title (第X章, Chapter X, etc.)
 * 3. Strip ANY "Chương \d+" prefix from AI title (prevents hallucination duplicates)
 * 4. Prepend correct "Chương {num}:" prefix
 * 5. Normalize title case (fix ALL CAPS / Title Case)
 */
export function normalizeChapterTitle(
  aiTitle: string,
  originalTitle: string
): string {
  // 1. Clean AI tags and markers
  let title = aiTitle
    .replace(/^\[?TIÊU ĐỀ\]?:?\s*/i, "")
    .replace(/^Tiêu đề:?\s*/i, "")
    .replace(/^Title:?\s*/i, "")
    .replace(/[#*]/g, "")
    .trim();

  // 2. Extract chapter number from original title
  const chapterMatch = originalTitle.match(
    /(?:第|Chapter|Chương|Episode|Tiết|Quyển)\s*(\d+)/i
  );

  if (chapterMatch) {
    const chapterNum = chapterMatch[1];
    const chapterPrefix = `Chương ${chapterNum}`;

    // 3. Strip ANY chapter prefix (not just the correct number)
    // This prevents double-prefix when AI hallucinates a wrong chapter number
    const cleanTitleBody = title
      .replace(/^Chương\s*\d+[:\s-]*/i, "")
      .replace(/^Chapter\s*\d+[:\s-]*/i, "")
      .replace(/^第\s*\d+\s*章[:\s-]*/i, "")
      .trim();

    // 4. Prepend correct prefix
    title = cleanTitleBody
      ? `${chapterPrefix}: ${cleanTitleBody.charAt(0).toUpperCase() + cleanTitleBody.slice(1)}`
      : chapterPrefix;
  } else if (!title) {
    // Fallback: use original title if AI returned empty
    title = originalTitle;
  }

  // 5. Normalize title case (fix ALL CAPS / Title Case from AI)
  title = normalizeTitleCase(title);

  return title;
}
