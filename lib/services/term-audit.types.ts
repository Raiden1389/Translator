/**
 * Term Audit — Type Definitions
 *
 * Post-translation consistency checker for Vietnamese terms.
 * Detects variant spellings of the same concept and clusters them
 * for human review → canonical selection → Corrections apply.
 *
 * Feature flag: featureFlags.termAudit
 * Default: OFF — zero DB writes, zero side effects when disabled.
 */

// ---------------------------------------------------------------------------
// Occurrence & Variant
// ---------------------------------------------------------------------------

export interface TermChapterRef {
  chapterId?: number;
  chapterOrder: number;
  paragraphIndex: number;
  paragraph: string;
}

/**
 * A single candidate term extracted from content_translated,
 * along with all its occurrences.
 */
export interface TermOccurrence {
  term: string;
  count: number;
  chapters: number[];     // chapter orders (for display)
  contexts: string[];     // short context snippets (±8 tokens)
  chapterRefs: TermChapterRef[];
}

/** Alias used inside a cluster for type clarity */
export type TermVariant = TermOccurrence;

// ---------------------------------------------------------------------------
// Cluster
// ---------------------------------------------------------------------------

/**
 * Individual scoring signal that contributed to a cluster merge.
 * Stored for display in UI reason trace.
 */
export interface ClusterReason {
  signal: 'rootMatch' | 'tokenOverlap' | 'chapterOverlap' | 'contextSim' | 'freqBalance';
  score: number;
  detail: string; // e.g. "root 'suy dien' matched", "tokenOverlap 0.75"
}

/**
 * Cluster mode controls UI display and apply eligibility.
 *
 * - 'auto'             : score >= 0.72, safe to show as merged
 * - 'review'           : score 0.60-0.71, show as "candidate" — NOT merged
 * - 'protected-related': exact match in Glossary/Corrections — collapsed by default
 */
export type ClusterMode = 'auto' | 'review' | 'protected-related';

/**
 * A cluster of term variants that may refer to the same concept.
 *
 * IMPORTANT:
 * - `confirmed` MUST be true before apply is allowed
 * - `confirmed` is reset whenever `scanRunId` changes (i.e. after rescan)
 * - `variants.length >= 2` is required for apply (1-variant cluster = nothing to fix)
 */
export interface TermCluster {
  /** Stable hash: hash(rootHint + topVariant + chapterSpread) */
  id: string;

  /** Normalised root hint shared by variants in this cluster */
  rootHint?: string;

  /** Scan run that produced this cluster — used to invalidate stale confirms */
  scanRunId: string;

  variants: TermVariant[];
  suggestedCanonical: string;
  totalOccurrences: number;
  isInconsistent: boolean;   // true when variants.length >= 2
  confidence: number;        // 0..1

  clusterMode: ClusterMode;

  /** User has explicitly confirmed this cluster and chosen canonical */
  confirmed: boolean;
  /** Timestamp of confirmation — invalid if scanRunId changed */
  confirmedAt?: number;

  /** Scoring signals used to form this cluster */
  reasons: ClusterReason[];

  /** Exact-match Correction rule already in DB, if any */
  relatedCorrection?: string;
  /** Exact-match Glossary entry already in DB, if any */
  relatedGlossary?: string;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export interface TermAuditReport {
  clusters: TermCluster[];
  inconsistentCount: number;
  consistentCount: number;
  totalTermsFound: number;
  totalChaptersScanned: number;
  scanDurationMs: number;
  /** Unique ID for this scan run — used to invalidate stale confirms */
  scanRunId: string;
}

// ---------------------------------------------------------------------------
// Apply result
// ---------------------------------------------------------------------------

export interface TermFixResult {
  rulesCreated: number;
  chaptersFixed: number;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Scan options
// ---------------------------------------------------------------------------

export interface TermAuditScanOptions {
  workspaceId: string;
  fromChapter?: number;   // chapter order (inclusive)
  toChapter?: number;     // chapter order (inclusive)
  minFrequency?: number;  // default 2
  mergeThreshold?: number;         // default 0.72
  reviewZoneThreshold?: number;    // default 0.60
}
