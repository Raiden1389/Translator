/**
 * Prepare Chapter Payload
 * 
 * Prepares the text content to send to AI for translation.
 * Handles: HTML cleanup + prepending original title to prevent hallucination.
 */

import type { Chapter } from "@/lib/db";
import { cleanHtmlContent } from "@/lib/utils/text-sanitizer";

/**
 * Prepare chapter content for AI translation.
 * 
 * 1. Clean HTML tags from original content
 * 2. Prepend original title (e.g., "第3607章 怪鱼") if not already in content
 *    → This prevents AI from hallucinating wrong chapter numbers/titles
 * 
 * @returns Clean text ready to send to AI
 */
export function prepareChapterPayload(chapter: Chapter): string {
  let content = cleanHtmlContent(chapter.content_original || "");

  // Prepend original title so AI knows the actual chapter number/title
  // Without this, AI hallucinates titles (e.g., "Chương 1373" instead of "Chương 3607")
  const title = (chapter.title || "").trim();
  if (title && !content.startsWith(title)) {
    content = `${title}\n\n${content}`;
  }

  return content;
}
