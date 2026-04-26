/**
 * Title Normalization - Enforce Sentence Case
 * 
 * Fixes:
 * - ALL CAPS titles
 * - Title Case titles (multiple capitalized words after colon)
 * - Preserves proper nouns by only normalizing body after colon
 */

// Complete Vietnamese uppercase & lowercase character classes
const VN_UPPER = 'A-ZĐÁÀẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ';
const VN_LOWER = 'a-zđáàảãạăằắẳẵặâầấẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ';

// Pre-compiled regexes using complete Vietnamese char classes
const ALL_CAPS_RE = new RegExp(`^Chương\\s+\\d+:\\s+[${VN_UPPER}\\s!,.]+$`);
const TITLE_CASE_RE = new RegExp(`:\\s*(?:[${VN_UPPER}][${VN_LOWER}]+\\s+){4,}`);

/**
 * Normalize title to sentence case
 * Example: "CHƯƠNG 15: PHẢN HƯỚNG TRẢ GIÁ" -> "Chương 15: Phản hướng trả giá"
 * Example: "Chương 12: Chính Là Người Game Thẻ Bài" -> "Chương 12: Chính là người game thẻ bài"
 */
export function normalizeTitleCase(title: string): string {
  if (!title?.trim()) return title;

  const hasAllCaps = ALL_CAPS_RE.test(title);
  const hasTitleCase = TITLE_CASE_RE.test(title);

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

  return ALL_CAPS_RE.test(title) || TITLE_CASE_RE.test(title);
}
