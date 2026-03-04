/**
 * Post-Translation Cleanup Module
 * 
 * Pure functions to fix common AI translation artifacts,
 * especially from non-thinking mode (faster but rougher output).
 */

/**
 * Detect leftover Chinese characters in translated body text.
 * Returns the ratio of Chinese chars vs total chars (0.0 - 1.0).
 * 
 * Non-thinking mode often leaves entire sentences untranslated.
 */
export function detectChineseLeftover(text: string): { ratio: number; count: number; hasChinese: boolean } {
  if (!text) return { ratio: 0, count: 0, hasChinese: false };

  const chineseChars = text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g);
  const count = chineseChars?.length ?? 0;
  const totalChars = text.replace(/\s/g, '').length;
  const ratio = totalChars > 0 ? count / totalChars : 0;

  return { ratio, count, hasChinese: count > 0 };
}

/**
 * Remove consecutive duplicate paragraphs (AI stuttering).
 * 
 * Non-thinking mode sometimes repeats the same paragraph 2-3 times.
 * Only removes EXACT consecutive duplicates — different paragraphs are kept.
 */
export function deduplicateConsecutiveParagraphs(text: string): string {
  if (!text) return "";

  const paragraphs = text.split('\n');
  const result: string[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const trimmed = paragraphs[i].trim();
    const prevTrimmed = result.length > 0 ? result[result.length - 1].trim() : null;

    // Skip if this is an exact duplicate of the previous non-empty paragraph
    if (trimmed && prevTrimmed && trimmed === prevTrimmed) {
      continue;
    }

    result.push(paragraphs[i]);
  }

  return result.join('\n');
}

/**
 * Normalize all quote styles to Vietnamese standard curly quotes.
 * 
 * AI mixes: "...", "...", 「...」, 『...』, «...»
 * Normalize to: \u201C...\u201D (left/right double curly quotes)
 */
export function normalizeQuoteStyles(text: string): string {
  if (!text) return "";

  return text
    // Chinese corner brackets → curly quotes
    .replace(/「/g, '\u201C')
    .replace(/」/g, '\u201D')
    .replace(/『/g, '\u201C')
    .replace(/』/g, '\u201D')
    // French guillemets → curly quotes
    .replace(/«\s*/g, '\u201C')
    .replace(/\s*»/g, '\u201D')
    // Straight quotes → smart quotes (paired matching)
    .replace(/"([^"]*?)"/g, '\u201C$1\u201D');
}

/**
 * Remove Vietnamese AI meta-talk from translated output.
 * 
 * Non-thinking mode often adds preambles/postscripts in Vietnamese:
 * - "Dưới đây là bản dịch:"
 * - "Lưu ý: ..."
 * - "Tôi đã dịch như sau:"
 */
export function scrubVietnameseAIChatter(text: string): string {
  if (!text) return "";

  return text
    // Preambles (at start of text)
    .replace(/^(Dưới đây là|Đây là|Tôi đã dịch|Bản dịch|Sau đây là)[^.\n]*[:\.]?\s*/i, "")
    // Postscripts (only at end of text, after newline — NOT mid-text)
    .replace(/\n\s*(Lưu ý|Chú thích|Nếu bạn cần|Hy vọng|Mong rằng)[:\s][^\n]*$/i, "")
    // AI self-reference (replace with single space to avoid word merging)
    .replace(/\s*\(Người dịch[^)]*\)\s*/g, " ")
    .replace(/\s*\[Ghi chú[^\]]*\]\s*/g, " ")
    // Clean up any resulting double spaces
    .replace(/  +/g, ' ')
    .trim();
}
