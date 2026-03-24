/**
 * Term Audit — Phase 1: Extraction
 *
 * Anchor-first extraction of candidate terms from content_translated.
 * Pure read-only — zero DB writes, safe to run at any time.
 *
 * Strategy:
 *   1. Find anchor/wrapper tokens in each paragraph
 *   2. Expand ±2-3 tokens around anchor to build candidate
 *   3. Strip generic heads before forming rootHint
 *   4. Soft wrappers: valid only if tail matches term-like pattern
 *      OR has ≥2 content tokens after stopword strip
 *   5. Keep only candidates with frequency ≥ minFrequency
 */

import type { TermOccurrence, TermChapterRef } from './term-audit.types';
import type { Chapter } from '@/lib/db';

// ---------------------------------------------------------------------------
// Anchor definitions
// ---------------------------------------------------------------------------

/** Hard anchors — sufficient alone to form a candidate */
const HARD_ANCHOR_SUFFIXES = new Set([
  'giả', 'nhân', 'sư', 'giáo', 'môn', 'phái', 'hội', 'viện',
  'điện', 'cung', 'thuật', 'pháp', 'trận', 'ấn', 'đan', 'kiếm',
  'thức', 'tông', 'đạo',
]);

/** Soft wrappers — valid only with a strong tail */
const SOFT_WRAPPERS = new Set([
  'người', 'kẻ', 'vị', 'gã', 'tên',
]);

/** Phrase-level wrappers that trigger 3-4 token extraction */
const PHRASE_WRAPPERS = [
  'nghi thức', 'nghi lễ', 'con đường', 'hệ thống',
  'danh sách', 'bậc thang', 'người canh', 'kẻ săn', 'người tuần',
];

// ---------------------------------------------------------------------------
// Stopwords / stoplist
// ---------------------------------------------------------------------------

/** Generic Vietnamese words that disqualify a phrase */
const STOPLIST = new Set([
  // Generic person combos
  'người đàn ông', 'người phụ nữ', 'người lớn', 'người già',
  'kẻ lạ', 'kẻ nọ', 'gã nọ', 'gã kia', 'tên nọ', 'tên kia',
  // Generic time
  'lúc này', 'khi đó', 'sau đó', 'lúc ấy', 'lúc đó',
  // Generic space/feeling
  'căn phòng', 'không khí', 'ánh mắt', 'trong lòng', 'trên mặt',
  // Generic action/strength
  'sức mạnh', 'lực lượng', 'bước tiến', 'tiến lên',
  // Dialogue markers
  'nói rằng', 'hỏi rằng', 'trả lời rằng', 'thì thầm rằng',
  // Very generic adjectives
  'mạnh mẽ', 'lạnh lùng', 'bình tĩnh', 'yên lặng',
]);

/** Stopwords used for content-token counting (soft wrapper validation) */
const CONTENT_STOPWORDS = new Set([
  'là', 'của', 'và', 'với', 'cho', 'trong', 'trên', 'dưới',
  'một', 'cái', 'vị', 'gã', 'tên', 'kia', 'này', 'nọ', 'đó',
  'đã', 'sẽ', 'đang', 'rất', 'cũng', 'vẫn', 'thì', 'mà', 'nhưng',
  'không', 'chưa', 'chẳng', 'đều', 'lại', 'đây', 'khi', 'nếu',
]);

// ---------------------------------------------------------------------------
// Tokenisation helpers
// ---------------------------------------------------------------------------

/** Split Vietnamese text into tokens (whitespace-based, cleaned) */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[""''«»「」『』…—–]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);
}

/** Count content tokens after removing stopwords */
function countContentTokens(tokens: string[]): number {
  return tokens.filter(t => !CONTENT_STOPWORDS.has(t) && t.length > 1).length;
}

// ---------------------------------------------------------------------------
// Candidate cleanup
// ---------------------------------------------------------------------------

/** Leading quantifiers/classifiers to strip from candidates */
const LEADING_QUANTIFIERS = [
  'một số', 'một vài', 'một', 'các', 'những', 'mấy', 'vài', 'nhiều',
  'mỗi', 'từng', 'toàn bộ', 'tất cả',
];

/** Trailing demonstratives/fillers to strip from candidates */
const TRAILING_DEMONSTRATIVES = [
  'kia', 'này', 'đó', 'ấy', 'nọ', 'đây', 'đấy',
];

/**
 * Clean a candidate by stripping grammatical noise:
 * - Leading quantifiers: "một thanh đoản kiếm" → "thanh đoản kiếm"
 * - Trailing demonstratives: "vị tiền bối kia" → "vị tiền bối"
 */
function cleanCandidate(candidate: string): string {
  let result = candidate.trim();
  const lower = result.toLowerCase();

  // Strip leading quantifiers (longest first to handle "một số" before "một")
  for (const q of LEADING_QUANTIFIERS) {
    if (lower.startsWith(q + ' ')) {
      result = result.slice(q.length).trim();
      break;
    }
  }

  // Strip trailing demonstratives
  const resultLower = result.toLowerCase();
  for (const d of TRAILING_DEMONSTRATIVES) {
    if (resultLower.endsWith(' ' + d)) {
      result = result.slice(0, -(d.length + 1)).trim();
      break;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Context extraction
// ---------------------------------------------------------------------------

/** Extract ±8 tokens of context around a term occurrence */
function extractContext(paragraph: string, term: string): string {
  const lower = paragraph.toLowerCase();
  const idx = lower.indexOf(term.toLowerCase());
  if (idx === -1) return paragraph.slice(0, 120);

  const tokens = paragraph.split(/\s+/);
  // Find token index
  let charCount = 0;
  let tokenIdx = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (charCount >= idx) { tokenIdx = i; break; }
    charCount += tokens[i].length + 1;
  }

  const window = 8;
  const start = Math.max(0, tokenIdx - window);
  const end = Math.min(tokens.length, tokenIdx + window + 1);
  const snippet = tokens.slice(start, end).join(' ');
  return (start > 0 ? '…' : '') + snippet + (end < tokens.length ? '…' : '');
}

// ---------------------------------------------------------------------------
// Soft wrapper validation
// ---------------------------------------------------------------------------

/**
 * Validate a soft-wrapper candidate.
 * Valid if tail matches a hard anchor suffix OR has ≥2 content tokens.
 */
function isSoftWrapperValid(tail: string): boolean {
  const tailTokens = tokenize(tail);
  if (tailTokens.length === 0) return false;

  // Check if last token is a hard anchor suffix
  const lastToken = tailTokens[tailTokens.length - 1];
  if (HARD_ANCHOR_SUFFIXES.has(lastToken)) return true;

  // Check content token count
  return countContentTokens(tailTokens) >= 2;
}

// ---------------------------------------------------------------------------
// Candidate extraction from a single paragraph
// ---------------------------------------------------------------------------

/**
 * Extract term candidates from one paragraph.
 * Returns raw (non-deduplicated) candidate strings.
 */
function extractFromParagraph(paragraph: string): string[] {
  const candidates: string[] = [];
  const tokens = paragraph.split(/\s+/).filter(t => t.length > 0);

  for (let i = 0; i < tokens.length; i++) {
    const tokenLower = tokens[i].toLowerCase().replace(/[^\p{L}]/gu, '');

    // ---------- Hard anchor suffix ----------
    if (HARD_ANCHOR_SUFFIXES.has(tokenLower)) {
      // Extract up to 3 tokens before the anchor + the anchor itself
      for (let lookback = 1; lookback <= 3; lookback++) {
        if (i - lookback < 0) break;
        const candidate = tokens.slice(i - lookback, i + 1).join(' ');
        const cleaned = candidate
          .replace(/^["'(「『]+|["')」』]+$/g, '')
          .replace(/[,;.!?。、！？]+$/g, '')  // strip trailing punctuation
          .trim();
        if (cleaned.length > 0 && !STOPLIST.has(cleaned.toLowerCase())) {
          candidates.push(cleaned);
        }
      }
    }

    // ---------- Soft wrapper ----------
    if (SOFT_WRAPPERS.has(tokenLower)) {
      // Extract 1-3 tokens after the wrapper
      for (let lookahead = 1; lookahead <= 3; lookahead++) {
        if (i + lookahead >= tokens.length) break;
        const tail = tokens.slice(i + 1, i + 1 + lookahead).join(' ');
        const full = tokens.slice(i, i + 1 + lookahead).join(' ');
        const cleanedFull = full
          .replace(/^["'(「『]+|["')」』]+$/g, '')
          .replace(/[,;.!?。、！？]+$/g, '')  // strip trailing punctuation
          .trim();

        if (!STOPLIST.has(cleanedFull.toLowerCase()) && isSoftWrapperValid(tail)) {
          candidates.push(cleanedFull);
        }
      }
    }

    // ---------- Phrase wrappers ----------
    for (const phraseWrapper of PHRASE_WRAPPERS) {
      const wrapTokens = phraseWrapper.split(' ');
      const slice = tokens.slice(i, i + wrapTokens.length).join(' ').toLowerCase();
      if (slice === phraseWrapper) {
        // Extract phrase wrapper + up to 2 tokens after
        for (let ext = 1; ext <= 2; ext++) {
          const endIdx = i + wrapTokens.length + ext;
          if (endIdx > tokens.length) break;
          const candidate = tokens.slice(i, endIdx).join(' ');
          const cleaned = candidate
            .replace(/^["'(「『]+|["')」』]+$/g, '')
            .replace(/[,;.!?。、！？]+$/g, '')  // strip trailing punctuation
            .trim();
          if (!STOPLIST.has(cleaned.toLowerCase())) {
            candidates.push(cleaned);
          }
        }
        break;
      }
    }
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Main extraction function
// ---------------------------------------------------------------------------

export interface ExtractionInput {
  chapters: Chapter[];
  fromChapter?: number;
  toChapter?: number;
  minFrequency?: number;
}

/**
 * Extract term candidates from all translated chapters.
 *
 * @returns Map<normalizedTerm, TermOccurrence>
 */
export function extractTermCandidates(input: ExtractionInput): TermOccurrence[] {
  const { chapters, fromChapter, toChapter, minFrequency = 2 } = input;

  // Filter chapters by range and translation status
  const targetChapters = chapters.filter(c => {
    if (!c.content_translated || c.content_translated.trim() === '') return false;
    if (fromChapter !== undefined && c.order < fromChapter) return false;
    if (toChapter !== undefined && c.order > toChapter) return false;
    return true;
  });

  // Accumulate: normalizedTerm → occurrence data
  const accumulator = new Map<string, {
    raw: string;
    count: number;
    chapters: Set<number>;
    contexts: string[];
    chapterRefs: TermChapterRef[];
  }>();

  for (const chapter of targetChapters) {
    const paragraphs = chapter.content_translated!
      .split(/\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    paragraphs.forEach((paragraph, paragraphIndex) => {
      const candidates = extractFromParagraph(paragraph);

      for (let raw of candidates) {
        // Clean: strip quantifiers + demonstratives
        raw = cleanCandidate(raw);
        const key = raw.toLowerCase().trim();
        if (key.length < 3) continue; // too short

        if (!accumulator.has(key)) {
          accumulator.set(key, {
            raw,
            count: 0,
            chapters: new Set(),
            contexts: [],
            chapterRefs: [],
          });
        }

        const entry = accumulator.get(key)!;
        entry.count++;
        entry.chapters.add(chapter.order);

        // Keep up to 3 context samples
        if (entry.contexts.length < 3) {
          entry.contexts.push(extractContext(paragraph, raw));
          entry.chapterRefs.push({
            chapterId: chapter.id,
            chapterOrder: chapter.order,
            paragraphIndex,
            paragraph: paragraph.slice(0, 300),
          });
        }
      }
    });
  }

  // Apply frequency threshold and return
  const results: TermOccurrence[] = [];

  for (const [, entry] of accumulator) {
    if (entry.count < minFrequency) continue;

    results.push({
      term: entry.raw,
      count: entry.count,
      chapters: Array.from(entry.chapters).sort((a, b) => a - b),
      contexts: entry.contexts,
      chapterRefs: entry.chapterRefs,
    });
  }

  // Sort by frequency desc for easier inspection
  results.sort((a, b) => b.count - a.count);

  return results;
}
