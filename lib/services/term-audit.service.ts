/**
 * Term Audit — Service Orchestrator
 *
 * Entry point that chains:
 *   Phase 1: extract candidates from content_translated
 *   Phase 2: normalize + compute rootHint
 *   Phase 3: cluster with bucket+greedy+guard
 *   Phase 4: enrich with protected-term detection
 *
 * Read-only until applyTermFixes() is explicitly called.
 * Feature flag: featureFlags.termAudit (must be true)
 */

import { db, GLOBAL_WORKSPACE_ID } from '@/lib/db';
import { extractTermCandidates } from './term-audit.extraction';
import { normalizeTerm } from './term-audit.normalization';
import { clusterTerms } from './term-audit.clustering';
import type {
  TermAuditReport,
  TermAuditScanOptions,
  TermCluster,
} from './term-audit.types';

// Re-export apply for consumers
export { applyTermFixes } from './term-audit.autofix';
export type { TermApplyInput } from './term-audit.autofix';

// ---------------------------------------------------------------------------
// Scan run ID generator
// ---------------------------------------------------------------------------

function generateScanRunId(): string {
  return `scan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// ---------------------------------------------------------------------------
// Protected term detection
// ---------------------------------------------------------------------------

/**
 * Check if a term has an exact-match Correction or Glossary entry.
 * Used to tag cluster as 'protected-related'.
 */
async function findRelatedCorrection(term: string): Promise<string | undefined> {
  const normalized = term.normalize('NFC').toLowerCase();
  const rule = await db.corrections
    .where('workspaceId')
    .equals(GLOBAL_WORKSPACE_ID)
    .filter(c =>
      c.type === 'replace' &&
      (c.from || c.original || '').normalize('NFC').toLowerCase() === normalized
    )
    .first();
  return rule ? `${rule.from} → ${rule.to}` : undefined;
}

async function findRelatedGlossary(term: string, workspaceId: string): Promise<string | undefined> {
  const normalized = term.normalize('NFC').toLowerCase();
  const entry = await db.dictionary
    .where('[workspaceId+type]')
    .equals([workspaceId, 'term'])
    .filter(e =>
      (e.original || '').normalize('NFC').toLowerCase() === normalized ||
      (e.translated || '').normalize('NFC').toLowerCase() === normalized
    )
    .first();
  return entry ? `${entry.original} → ${entry.translated}` : undefined;
}

/**
 * Enrich clusters with protected-term detection.
 * Clusters that have all variants exact-matched in Corrections/Glossary
 * get clusterMode = 'protected-related'.
 */
async function enrichWithProtectedTerms(
  clusters: TermCluster[],
  workspaceId: string,
): Promise<TermCluster[]> {
  const enriched: TermCluster[] = [];

  for (const cluster of clusters) {
    let relatedCorrection: string | undefined;
    let relatedGlossary: string | undefined;
    let anyVariantProtected = false;

    for (const variant of cluster.variants) {
      const corr = await findRelatedCorrection(variant.term);
      const gloss = await findRelatedGlossary(variant.term, workspaceId);

      if (corr && !relatedCorrection) relatedCorrection = corr;
      if (gloss && !relatedGlossary) relatedGlossary = gloss;
      if (corr || gloss) anyVariantProtected = true;
    }

    enriched.push({
      ...cluster,
      relatedCorrection,
      relatedGlossary,
      // If any variant is already in Corrections/Glossary → protected-related
      clusterMode: anyVariantProtected ? 'protected-related' : cluster.clusterMode,
    });
  }

  return enriched;
}

// ---------------------------------------------------------------------------
// Main scan function
// ---------------------------------------------------------------------------

export async function runTermAuditScan(
  options: TermAuditScanOptions,
): Promise<TermAuditReport> {
  const startTime = performance.now();
  const scanRunId = generateScanRunId();

  // Load chapters
  const allChapters = await db.chapters
    .where('workspaceId')
    .equals(options.workspaceId)
    .toArray();

  const targetChapters = allChapters.filter(c => {
    if (!c.content_translated || c.content_translated.trim() === '') return false;
    if (options.fromChapter !== undefined && c.order < options.fromChapter) return false;
    if (options.toChapter !== undefined && c.order > options.toChapter) return false;
    return true;
  });

  // Phase 1: Extract
  const occurrences = extractTermCandidates({
    chapters: targetChapters,
    fromChapter: options.fromChapter,
    toChapter: options.toChapter,
    minFrequency: options.minFrequency ?? 2,
  });

  // Phase 2+3: Normalize (embedded in clustering) + Cluster
  const rawClusters = clusterTerms({
    occurrences,
    options: {
      mergeThreshold: options.mergeThreshold ?? 0.72,
      reviewZoneThreshold: options.reviewZoneThreshold ?? 0.60,
    },
    scanRunId,
  });

  // Phase 4: Enrich with protected-term detection
  const clusters = await enrichWithProtectedTerms(rawClusters, options.workspaceId);

  const inconsistentCount = clusters.filter(c => c.isInconsistent && c.clusterMode !== 'protected-related').length;
  const consistentCount = clusters.length - inconsistentCount;
  const scanDurationMs = Math.round(performance.now() - startTime);

  // Normalize occurrences count to avoid double-counting from normalization phase
  const uniqueTerms = new Set(occurrences.map(o => normalizeTerm(o.term).normalized));

  console.log(
    `[TermAudit] Scan complete: ${occurrences.length} candidates, ` +
    `${clusters.length} clusters (${inconsistentCount} inconsistent) in ${scanDurationMs}ms`
  );

  return {
    clusters,
    inconsistentCount,
    consistentCount,
    totalTermsFound: uniqueTerms.size,
    totalChaptersScanned: targetChapters.length,
    scanDurationMs,
    scanRunId,
  };
}
