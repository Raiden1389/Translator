import { db } from "../db";

/**
 * Fix ALL CAPS titles in existing translations
 * Converts "KHAI TIẾC" → "Khai Tiếc"
 */
export async function fixAllCapsTitles(workspaceId: string): Promise<number> {
  const chapters = await db.chapters
    .where('workspace_id')
    .equals(workspaceId)
    .filter(ch => !!ch.title_translated) // Only translated chapters
    .toArray();

  let fixedCount = 0;

  for (const chapter of chapters) {
    const title = chapter.title_translated!;

    // Check if title is ALL CAPS
    const letters = title.replace(/[^a-zA-ZÀ-ỹ]/g, ''); // Only letters
    const uppercaseCount = (title.match(/[A-ZÀ-Ý]/g) || []).length;
    const isAllCaps = letters.length > 0 && uppercaseCount / letters.length > 0.5;

    if (isAllCaps) {
      // Convert to Title Case
      const fixedTitle = title
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      await db.chapters.update(chapter.id!, {
        title_translated: fixedTitle
      });

      console.log(`✅ Fixed: "${title}" → "${fixedTitle}"`);
      fixedCount++;
    }
  }

  return fixedCount;
}
