/**
 * Title Normalization - Enforce Sentence Case
 * 
 * Fixes:
 * - ALL CAPS titles
 * - Title Case titles (multiple capitalized words after colon)
 * - Preserves proper nouns by only normalizing body after colon
 */

/**
 * Normalize title to sentence case
 * Example: "CHƯƠNG 15: PHẢN HƯỚNG TRẢ GIÁ" -> "Chương 15: Phản hướng trả giá"
 * Example: "Chương 12: Chính Là Người Game Thẻ Bài" -> "Chương 12: Chính là người game thẻ bài"
 */
export function normalizeTitleCase(title: string): string {
  if (!title?.trim()) return title;

  // Detect ALL CAPS in body (after "Chương X:")
  const hasAllCaps =
    /^Chương\s+\d+:\s+[A-ZĐÁÀẢÃẠÊẾỀỂỄỆÔỐỒỔỖỘƠỚỜỞỠỢƯỨỪỬỮỰ\s!,.]+$/.test(title);

  // Detect Title Case: multiple capitalized words AFTER colon
  // This avoids false positives on valid sentence case like "Chương 12: Chính là người..."
  const hasTitleCase =
    /:\s*(?:[A-ZĐÁÀẢÃẠÊẾỀỂỄỆÔỐỒỔỖỘƠỚỜỞỠỢƯỨỪỬỮỰ][a-zđáàảãạêếềểễệôốồổỗộơớờởỡợưứừửữự]+\s+){2,}/
      .test(title);

  if (!hasAllCaps && !hasTitleCase) return title;

  // Normalize: only lowercase body after colon, preserve prefix
  return title.replace(
    /^([^:]+:\s*)(.+)$/,
    (_, prefix, body) =>
      prefix +
      body
        .toLowerCase()
        .replace(/^\S/, (c: string) => c.toUpperCase())
  );
}

/**
 * Detect if title has improper capitalization
 */
export function hasTitleCaseIssue(title: string): boolean {
  if (!title?.trim()) return false;

  const hasAllCaps =
    /^Chương\s+\d+:\s+[A-ZĐÁÀẢÃẠÊẾỀỂỄỆÔỐỒỔỖỘƠỚỜỞỠỢƯỨỪỬỮỰ\s!,.]+$/.test(title);

  const hasTitleCase =
    /:\s*(?:[A-ZĐÁÀẢÃẠÊẾỀỂỄỆÔỐỒỔỖỘƠỚỜỞỠỢƯỨỪỬỮỰ][a-zđáàảãạêếềểễệôốồổỗộơớờởỡợưứừửữự]+\s+){2,}/
      .test(title);

  return hasAllCaps || hasTitleCase;
}
