import { db } from "../db";

/**
 * Fix ALL CAPS titles in existing translations
 * Converts "KHAI TIẾC" → "Khai Tiếc"
 */
export async function fixAllCapsTitles(workspaceId: string): Promise<number> {
  try {
    const chapters = await db.chapters
      .where('workspaceId')
      .equals(workspaceId)
      .filter(ch => !!ch.title_translated) // Only translated chapters
      .toArray();

    console.log(`[Title Case Fixer] Found ${chapters.length} translated chapters`);

    if (chapters.length === 0) {
      console.log(`[Title Case Fixer] No translated chapters found for workspace ${workspaceId}`);
      return 0;
    }

    let fixedCount = 0;

    for (const chapter of chapters) {
      const title = chapter.title_translated!;

      // Check if title is ALL CAPS
      // Vietnamese uppercase: A-Z, À-Ỹ (includes Ă, Â, Đ, Ê, Ô, Ơ, Ư and all tones)
      const letters = title.replace(/[^a-zA-ZÀ-ỹ]/g, ''); // Only letters
      const uppercaseLetters = title.match(/[A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ]/g) || [];
      const isAllCaps = letters.length > 0 && uppercaseLetters.length / letters.length > 0.5;

      console.log(`[Title Case Fixer] Chapter ${chapter.id}: "${title}" - Letters: ${letters.length}, Uppercase: ${uppercaseLetters.length}, isAllCaps: ${isAllCaps}`);

      if (isAllCaps) {
        // Convert to Sentence Case (Vietnamese standard)
        // "KHỔ CHỦ" → "Khổ chủ" (only first letter capitalized)
        const lowerTitle = title.toLowerCase();
        const fixedTitle = lowerTitle.charAt(0).toUpperCase() + lowerTitle.slice(1);

        await db.chapters.update(chapter.id!, {
          title_translated: fixedTitle
        });

        console.log(`✅ Fixed: "${title}" → "${fixedTitle}"`);
        fixedCount++;
      }
    }

    console.log(`[Title Case Fixer] Fixed ${fixedCount} titles`);
    return fixedCount;
  } catch (error) {
    console.error('[Title Case Fixer] Error:', error);
    throw error; // Re-throw to show in toast
  }
}
