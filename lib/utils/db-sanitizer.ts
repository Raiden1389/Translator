/**
 * Database Sanitization Script
 * 
 * Clean HTML tags from existing translated chapters in the database
 * Run this ONCE to fix old data that contains HTML artifacts
 */

import { db } from "@/lib/db";
import { sanitizeTranslatedContent } from "@/lib/utils/text-sanitizer";

export async function sanitizeExistingTranslations(workspaceId: string): Promise<number> {
  console.log(`🧹 [SANITIZER] Starting database cleanup for workspace: ${workspaceId}`);

  // Get all translated chapters
  const chapters = await db.chapters
    .where('workspaceId')
    .equals(workspaceId)
    .filter(c => !!(c.content_translated && c.content_translated.trim() !== ''))
    .toArray();

  console.log(`📊 [SANITIZER] Found ${chapters.length} translated chapters`);

  let cleanedCount = 0;

  for (const chapter of chapters) {
    const originalContent = chapter.content_translated || '';
    const originalTitle = chapter.title_translated || '';

    // Check if content contains HTML tags
    const hasHtmlInContent = /<[^>]+>/g.test(originalContent);
    const hasHtmlInTitle = /<[^>]+>/g.test(originalTitle);

    if (hasHtmlInContent || hasHtmlInTitle) {
      const cleanContent = sanitizeTranslatedContent(originalContent);
      const cleanTitle = sanitizeTranslatedContent(originalTitle);

      await db.chapters.update(chapter.id!, {
        content_translated: cleanContent,
        title_translated: cleanTitle,
        wordCountTranslated: cleanContent.trim().split(/\s+/).length,
      });

      cleanedCount++;
      console.log(`✅ [SANITIZER] Cleaned Chapter ${chapter.order}: ${chapter.title}`);
    }
  }

  console.log(`🎉 [SANITIZER] Cleanup complete! Cleaned ${cleanedCount}/${chapters.length} chapters`);

  return cleanedCount;
}

/**
 * Sanitize ALL workspaces in the database
 */
export async function sanitizeAllWorkspaces(): Promise<void> {
  const workspaces = await db.workspaces.toArray();

  console.log(`🌐 [SANITIZER] Starting global cleanup for ${workspaces.length} workspaces`);

  for (const workspace of workspaces) {
    await sanitizeExistingTranslations(workspace.id);
  }

  console.log(`✨ [SANITIZER] Global cleanup complete!`);
}
