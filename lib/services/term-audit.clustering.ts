/**
 * Term Audit — Phase 3: Clustering
 *
 * Groups term variants that likely refer to the same concept.
 *
 * Algorithm:
 *   1. Normalize all candidates (normalizeTerm)
 *   2. Bucket by rootHint (exact group)
 *   3. Cross-bucket pass: rootHint near-match (lev ≤ 2) + tokenOverlap > 0.5
 *      → merge buckets into a super-bucket
 *   4. Within each bucket: compute pair scores, greedy merge (highest score first)
 *   5. Guard: new member must be close enough to current canonical (avg score ≥ threshold×0.8)
 *      to prevent single-linkage chain merges
 *
 * Scoring formula:
 *   score = 0.40 * rootMatch   (3-tier: 1.0 / 0.5 / 0.0)
 *         + 0.25 * tokenOverlap  (Jaccard on token sets)
 *         + 0.20 * contextSim    (Jaccard bag-of-words, ±8 token contexts)
 *         + 0.10 * chapterOverlap (IoU of chapter sets)
 *         + 0.05 * freqBalance   (min/max count)
 */

import { normalizeTerm, levenshtein, tokenizeNormalized } from './term-audit.normalization';
import type {
  TermOccurrence, TermVariant, TermCluster, ClusterReason,
  TermAuditScanOptions,
} from './term-audit.types';

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

/** Jaccard similarity between two token sets */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const t of a) { if (b.has(t)) intersection++; }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Build a bag-of-words token set from context snippets */
function contextTokenSet(contexts: string[]): Set<string> {
  const tokens = new Set<string>();
  for (const ctx of contexts) {
    ctx.toLowerCase()
      .split(/\s+/)
      .filter(t => t.length > 2)
      .forEach(t => tokens.add(t));
  }
  return tokens;
}

/** rootMatch: 1.0 same, 0.5 near-match (lev ≤ 2), 0.0 different */
function rootMatch(hintA: string, hintB: string): number {
  if (hintA === hintB) return 1.0;
  if (levenshtein(hintA, hintB) <= 2) return 0.5;
  return 0.0;
}

/** Chapter IoU (Intersection over Union) */
function chapterIoU(chaptersA: number[], chaptersB: number[]): number {
  const setA = new Set(chaptersA);
  const setB = new Set(chaptersB);
  let intersect = 0;
  for (const c of setA) { if (setB.has(c)) intersect++; }
  const union = setA.size + setB.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

interface ScoredPair {
  idxA: number;
  idxB: number;
  score: number;
  reasons: ClusterReason[];
}

function scorePair(
  a: TermOccurrence,
  b: TermOccurrence,
  normA: ReturnType<typeof normalizeTerm>,
  normB: ReturnType<typeof normalizeTerm>,
): ScoredPair & { idxA: -1; idxB: -1 } {
  const reasons: ClusterReason[] = [];

  const rm = rootMatch(normA.rootHint, normB.rootHint);
  const tokenA = tokenizeNormalized(normA.normalized);
  const tokenB = tokenizeNormalized(normB.normalized);
  const to = jaccard(tokenA, tokenB);
  const cs = jaccard(contextTokenSet(a.contexts), contextTokenSet(b.contexts));
  const co = chapterIoU(a.chapters, b.chapters);
  const fb = a.count > 0 && b.count > 0
    ? Math.min(a.count, b.count) / Math.max(a.count, b.count)
    : 0;

  const score =
    0.40 * rm +
    0.25 * to +
    0.20 * cs +
    0.10 * co +
    0.05 * fb;

  if (rm > 0) reasons.push({ signal: 'rootMatch', score: rm, detail: `root '${normA.rootHint}' matched (score ${rm})` });
  if (to > 0) reasons.push({ signal: 'tokenOverlap', score: to, detail: `tokenOverlap ${to.toFixed(2)}` });
  if (cs > 0) reasons.push({ signal: 'contextSim', score: cs, detail: `contextSimilarity ${cs.toFixed(2)}` });
  if (co > 0) reasons.push({ signal: 'chapterOverlap', score: co, detail: `chapterOverlap ${co.toFixed(2)}` });
  if (fb > 0.1) reasons.push({ signal: 'freqBalance', score: fb, detail: `freqBalance ${fb.toFixed(2)}` });

  return { idxA: -1, idxB: -1, score, reasons };
}

// ---------------------------------------------------------------------------
// Cluster ID
// ---------------------------------------------------------------------------

/** Stable hash: djb2 variant */
function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  return h.toString(36);
}

function makeClusterId(rootHint: string, topVariant: string, chapterSpread: number[]): string {
  const key = `${rootHint}|${topVariant}|${chapterSpread.sort().join(',')}`;
  return `term-${hashString(key)}`;
}

// ---------------------------------------------------------------------------
// Canonical selection
// ---------------------------------------------------------------------------

/**
 * Choose the canonical variant:
 *   1. Highest frequency
 *   2. If tied: shorter term
 *   3. If same length: prefer capitalized (title-case) form
 */
function pickCanonical(variants: TermVariant[]): string {
  const sorted = [...variants].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (a.term.length !== b.term.length) return a.term.length - b.term.length;
    // Prefer capitalized form
    const aIsCapital = /^[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖÙÚÛÜÝÞ]/u.test(a.term);
    const bIsCapital = /^[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖÙÚÛÜÝÞ]/u.test(b.term);
    if (aIsCapital !== bIsCapital) return aIsCapital ? -1 : 1;
    return a.term.localeCompare(b.term, 'vi');
  });
  return sorted[0].term;
}

// ---------------------------------------------------------------------------
// Confidence tier
// ---------------------------------------------------------------------------

/** @public — used by UI layer for badge display */
export function confidenceTier(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.85) return 'high';
  if (score >= 0.72) return 'medium';
  return 'low';
}

// ---------------------------------------------------------------------------
// Main clustering function
// ---------------------------------------------------------------------------

export interface ClusteringInput {
  occurrences: TermOccurrence[];
  options: Pick<TermAuditScanOptions, 'mergeThreshold' | 'reviewZoneThreshold'>;
  scanRunId: string;
}

export function clusterTerms(input: ClusteringInput): TermCluster[] {
  const { occurrences, scanRunId } = input;
  const mergeThreshold = input.options.mergeThreshold ?? 0.72;
  const reviewZoneThreshold = input.options.reviewZoneThreshold ?? 0.60;

  if (occurrences.length === 0) return [];

  // Step 1: Normalize all
  const normalized = occurrences.map(o => normalizeTerm(o.term));

  // Step 2: Bucket by rootHint
  const buckets = new Map<string, number[]>(); // rootHint → indices
  normalized.forEach((n, i) => {
    const bucket = buckets.get(n.rootHint) ?? [];
    bucket.push(i);
    buckets.set(n.rootHint, bucket);
  });

  // Step 3: Cross-bucket merge for near-match rootHints + strong tokenOverlap
  const rootHints = Array.from(buckets.keys());
  const mergedBuckets = new Map<string, Set<number>>(); // representative rootHint → indices set

  const assigned = new Set<string>();
  for (let i = 0; i < rootHints.length; i++) {
    if (assigned.has(rootHints[i])) continue;

    const superBucket = new Set(buckets.get(rootHints[i])!);
    assigned.add(rootHints[i]);

    for (let j = i + 1; j < rootHints.length; j++) {
      if (assigned.has(rootHints[j])) continue;

      const hintA = rootHints[i];
      const hintB = rootHints[j];
      const levDist = levenshtein(hintA, hintB);

      // Near-match: lev ≤ 2 OR one is a prefix of the other (handles "suy dien" ↔ "suy dien gia")
      const isNearMatch = levDist <= 2;
      const isPrefixMatch =
        hintA.length > 3 && hintB.length > 3 && (
          hintB.startsWith(hintA + ' ') || hintA.startsWith(hintB + ' ')
        );

      if (!isNearMatch && !isPrefixMatch) continue;

      // Check token overlap between the two root hints
      const tokA = tokenizeNormalized(hintA);
      const tokB = tokenizeNormalized(hintB);
      if (jaccard(tokA, tokB) > 0.4) {  // lowered from 0.5 for prefix matches
        buckets.get(hintB)!.forEach(idx => superBucket.add(idx));
        assigned.add(hintB);
      }
    }

    mergedBuckets.set(rootHints[i], superBucket);
  }

  // Step 4: Within each super-bucket, compute all pair scores + greedy merge
  const clusters: TermCluster[] = [];
  const globallyMerged = new Set<number>(); // track which occurrences are in a cluster

  for (const [representativeRoot, idxSet] of mergedBuckets) {
    const indices = Array.from(idxSet).filter(i => !globallyMerged.has(i));
    if (indices.length === 0) continue;

    // Compute all pair scores
    const pairs: (ScoredPair & { idxA: number; idxB: number })[] = [];
    for (let a = 0; a < indices.length; a++) {
      for (let b = a + 1; b < indices.length; b++) {
        const ia = indices[a];
        const ib = indices[b];
        const { score, reasons } = scorePair(
          occurrences[ia], occurrences[ib],
          normalized[ia], normalized[ib],
        );
        if (score >= reviewZoneThreshold) {
          pairs.push({ idxA: ia, idxB: ib, score, reasons });
        }
      }
    }

    // Sort descending by score
    pairs.sort((a, b) => b.score - a.score);

    // Greedy merge with canonical guard
    const clusterGroups: { indices: Set<number>; reasons: ClusterReason[]; score: number }[] = [];

    for (const pair of pairs) {
      const { idxA, idxB, score, reasons } = pair;

      const groupA = clusterGroups.find(g => g.indices.has(idxA));
      const groupB = clusterGroups.find(g => g.indices.has(idxB));

      if (!groupA && !groupB) {
        // Only auto-merge if score >= mergeThreshold
        if (score >= mergeThreshold) {
          clusterGroups.push({ indices: new Set([idxA, idxB]), reasons, score });
        }
        // Review zone: don't merge yet, handled as separate single-variant "cluster" below
      } else if (groupA && !groupB) {
        // Guard: new member must score >= mergeThreshold against canonical
        if (score >= mergeThreshold) {
          groupA.indices.add(idxB);
          groupA.reasons.push(...reasons);
        }
      } else if (!groupA && groupB) {
        if (score >= mergeThreshold) {
          groupB.indices.add(idxA);
          groupB.reasons.push(...reasons);
        }
      }
      // Both already in same or different groups: skip (prevent cross-group chains)
    }

    // Emit clusters for merged groups
    for (const group of clusterGroups) {
      const variants: TermVariant[] = Array.from(group.indices).map(i => occurrences[i]);
      group.indices.forEach(i => globallyMerged.add(i));

      const canonical = pickCanonical(variants);
      const allChapters = [...new Set(variants.flatMap(v => v.chapters))];
      const clusterId = makeClusterId(representativeRoot, canonical, allChapters);
      const totalOccurrences = variants.reduce((s, v) => s + v.count, 0);
      const dedupeReasons = deduplicateReasons(group.reasons);

      clusters.push({
        id: clusterId,
        rootHint: representativeRoot,
        scanRunId,
        variants,
        suggestedCanonical: canonical,
        totalOccurrences,
        isInconsistent: variants.length >= 2,
        confidence: group.score,
        clusterMode: 'auto',
        confirmed: false,
        reasons: dedupeReasons,
      });
    }

    // Emit review-zone candidates (score 0.60-0.71, not yet merged)
    for (const pair of pairs) {
      if (pair.score >= mergeThreshold) continue;   // already handled
      if (pair.score < reviewZoneThreshold) continue;

      const { idxA, idxB } = pair;
      if (globallyMerged.has(idxA) || globallyMerged.has(idxB)) continue;

      // Create review-zone cluster (both variants, not merged officially)
      const variants: TermVariant[] = [occurrences[idxA], occurrences[idxB]];
      const canonical = pickCanonical(variants);
      const allChapters = [...new Set(variants.flatMap(v => v.chapters))];
      const clusterId = makeClusterId(representativeRoot + '_review', canonical, allChapters);
      const totalOccurrences = variants.reduce((s, v) => s + v.count, 0);

      // Only emit if neither term is already in an auto cluster
      clusters.push({
        id: clusterId,
        rootHint: representativeRoot,
        scanRunId,
        variants,
        suggestedCanonical: canonical,
        totalOccurrences,
        isInconsistent: true,
        confidence: pair.score,
        clusterMode: 'review',
        confirmed: false,
        reasons: pair.reasons,
      });
    }
  }

  // Sort: inconsistent auto first, then review, sorted by totalOccurrences desc
  clusters.sort((a, b) => {
    const modeOrder = { auto: 0, review: 1, 'protected-related': 2 };
    const modeA = modeOrder[a.clusterMode];
    const modeB = modeOrder[b.clusterMode];
    if (modeA !== modeB) return modeA - modeB;
    return b.totalOccurrences - a.totalOccurrences;
  });

  return clusters;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deduplicateReasons(reasons: ClusterReason[]): ClusterReason[] {
  const seen = new Map<string, ClusterReason>();
  for (const r of reasons) {
    const existing = seen.get(r.signal);
    if (!existing || r.score > existing.score) {
      seen.set(r.signal, r);
    }
  }
  return Array.from(seen.values());
}
