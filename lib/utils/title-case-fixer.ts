import { db } from "../db";

/**
 * Check if title uses Title Case (every word capitalized)
 * Example: "Một Lời Nói Dối Nhỏ" → true
 */
function isTitleCase(title: string): boolean {
  // Extract title part after "Chương XX:"
  const match = title.match(/^Chương \d+:\s*(.+)$/);
  if (!match) {
    // If no "Chương XX:" prefix, check the whole title
    const words = title.split(/\s+/);
    if (words.length < 2) return false;

    let capitalizedCount = 0;
    for (let i = 1; i < words.length; i++) {
      const firstChar = words[i][0];
      if (firstChar && /[A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ]/.test(firstChar)) {
        capitalizedCount++;
      }
    }

    // Title Case = 50%+ words capitalized (excluding first word)
    return capitalizedCount >= Math.max(1, Math.floor(words.length / 2));
  }

  const titlePart = match[1]; // "Một Lời Nói Dối Nhỏ"
  const words = titlePart.split(/\s+/);

  // Need at least 2 words to be Title Case
  if (words.length < 2) return false;

  // Check if 2+ words are capitalized (excluding first word which is always capitalized)
  let capitalizedCount = 0;
  for (let i = 1; i < words.length; i++) {
    const firstChar = words[i][0];
    if (firstChar && /[A-ZÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ]/.test(firstChar)) {
      capitalizedCount++;
    }
  }

  // Title Case = 2+ words capitalized (not counting first word)
  return capitalizedCount >= 2;
}

/**
 * Fix ALL CAPS and Title Case titles in existing translations
 * Converts "KHAI TIẾC" → "Khai tiếc"
 * Converts "Một Lời Nói Dối Nhỏ" → "Một lời nói dối nhỏ"
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
      const isTitleCaseFormat = isTitleCase(title);

      console.log(`[Title Case Fixer] Chapter ${chapter.id}: "${title}" - Letters: ${letters.length}, Uppercase: ${uppercaseLetters.length}, isAllCaps: ${isAllCaps}, isTitleCase: ${isTitleCaseFormat}`);

      if (isAllCaps || isTitleCaseFormat) {
        // Convert to Sentence Case (Vietnamese standard)
        // "KHỔ CHỦ" → "Khổ chủ" (only first letter capitalized)
        // "Một Lời Nói Dối Nhỏ" → "Một lời nói dối nhỏ"
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
