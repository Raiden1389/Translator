/**
 * Term Audit — Phase 2: Normalization
 *
 * Produces a stable `normalized` key and a `rootHint` for each candidate.
 * rootHint is used as the primary bucket key in Phase 3 clustering.
 *
 * Steps:
 *   1. NFC normalize
 *   2. Lowercase + trim
 *   3. Collapse whitespace
 *   4. Strip leading generic heads (người/kẻ/vị/gã/tên)
 *   5. Strip filler particles (một/cái/gã/kia/này)
 *   6. rootHint = ascii-fold the result (remove diacritics)
 */

// ---------------------------------------------------------------------------
// Generic heads to strip before computing rootHint
// ---------------------------------------------------------------------------

/** Strip these prefixes when computing the core semantic phrase */
const GENERIC_HEADS = ['người', 'kẻ', 'vị', 'gã', 'tên'];

/** Strip these filler particles (exact token match only) */
const FILLER_PARTICLES = new Set(['một', 'cái', 'gã', 'kia', 'này', 'nọ', 'đó', 'ấy']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Remove Vietnamese diacritics → ASCII representation */
function removeDiacritics(str: string): string {
  return str.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

/**
 * Strip a leading generic head from a normalized term.
 * Only removes ONE head (greedy: longest match first).
 *
 * e.g. "người suy diễn" → "suy diễn"
 *      "kẻ săn mồi"    → "săn mồi"
 *      "suy diễn giả"  → "suy diễn giả"  (no head to strip)
 */
function stripGenericHead(term: string): string {
  // Sort by length desc so longer heads match first
  const sorted = [...GENERIC_HEADS].sort((a, b) => b.length - a.length);
  for (const head of sorted) {
    if (term.startsWith(head + ' ')) {
      return term.slice(head.length + 1).trim();
    }
  }
  return term;
}

/** Remove filler particle tokens */
function stripFillerParticles(term: string): string {
  return term
    .split(' ')
    .filter(t => !FILLER_PARTICLES.has(t))
    .join(' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface NormalizedTerm {
  /** Original raw term as extracted */
  raw: string;
  /** Lowercased, trimmed, whitespace-collapsed */
  normalized: string;
  /** ASCII-folded core phrase for bucket grouping */
  rootHint: string;
}

/**
 * Normalize a raw term candidate.
 *
 * @param raw - term string from extraction phase
 * @returns NormalizedTerm with stable normalized + rootHint
 */
export function normalizeTerm(raw: string): NormalizedTerm {
  // Step 1: NFC + lowercase + trim
  let normalized = raw.normalize('NFC').toLowerCase().trim();

  // Step 2: collapse whitespace
  normalized = normalized.replace(/\s+/g, ' ');

  // Step 3: strip leading punctuation artifacts
  normalized = normalized.replace(/^["'(「『]+|["')」』]+$/g, '').trim();

  // Step 4–5: strip filler + generic head for rootHint
  let core = stripFillerParticles(normalized);
  core = stripGenericHead(core);
  core = stripFillerParticles(core); // second pass after head strip

  // Step 6: ascii-fold
  const rootHint = removeDiacritics(core)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  return { raw, normalized, rootHint };
}

/**
 * Compute Levenshtein distance between two strings.
 * Used for near-match rootHint detection in clustering.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[a.length][b.length];
}

/**
 * Tokenize a normalized term into individual tokens.
 * Used by clustering for Jaccard overlap computation.
 */
export function tokenizeNormalized(normalized: string): Set<string> {
  return new Set(
    normalized
      .split(' ')
      .map(t => t.trim())
      .filter(t => t.length > 1)
  );
}
