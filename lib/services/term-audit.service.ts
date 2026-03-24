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
// Helpers
// ---------------------------------------------------------------------------

/** Yield to main thread — prevents UI freeze during heavy computation */
function yieldToMain(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function generateScanRunId(): string {
  return `scan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}




/**
 * Enrich clusters with protected-term detection.
 * Batch-loads all corrections + glossary entries upfront to avoid N+1 DB queries.
 */
async function enrichWithProtectedTerms(
  clusters: TermCluster[],
  workspaceId: string,
): Promise<TermCluster[]> {
  // Batch-load all corrections and glossary entries upfront
  const [allCorrections, allGlossary] = await Promise.all([
    db.corrections.where('workspaceId').equals(GLOBAL_WORKSPACE_ID).toArray(),
    db.dictionary.where('[workspaceId+type]').equals([workspaceId, 'term']).toArray(),
  ]);

  // Build lookup maps (normalized → display string)
  const corrMap = new Map<string, string>();
  for (const c of allCorrections) {
    if (c.type !== 'replace') continue;
    const key = (c.from || c.original || '').normalize('NFC').toLowerCase();
    if (key) corrMap.set(key, `${c.from} → ${c.to}`);
  }

  const glossMap = new Map<string, string>();
  for (const e of allGlossary) {
    const origKey = (e.original || '').normalize('NFC').toLowerCase();
    const transKey = (e.translated || '').normalize('NFC').toLowerCase();
    const display = `${e.original} → ${e.translated}`;
    if (origKey) glossMap.set(origKey, display);
    if (transKey) glossMap.set(transKey, display);
  }

  // Enrich clusters using lookup maps (O(1) per variant)
  return clusters.map(cluster => {
    let relatedCorrection: string | undefined;
    let relatedGlossary: string | undefined;
    let anyVariantProtected = false;

    for (const variant of cluster.variants) {
      const normalized = variant.term.normalize('NFC').toLowerCase();
      const corr = corrMap.get(normalized);
      const gloss = glossMap.get(normalized);

      if (corr && !relatedCorrection) relatedCorrection = corr;
      if (gloss && !relatedGlossary) relatedGlossary = gloss;
      if (corr || gloss) anyVariantProtected = true;
    }

    return {
      ...cluster,
      relatedCorrection,
      relatedGlossary,
      clusterMode: anyVariantProtected ? 'protected-related' : cluster.clusterMode,
    };
  });
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

  // Phase 1: Extract — chunked to prevent UI freeze on large datasets
  const CHUNK_SIZE = 50;
  const allOccurrences: ReturnType<typeof extractTermCandidates> extends (infer T)[] ? T[] : never = [];

  for (let i = 0; i < targetChapters.length; i += CHUNK_SIZE) {
    const chunk = targetChapters.slice(i, i + CHUNK_SIZE);
    const chunkResults = extractTermCandidates({
      chapters: chunk,
      minFrequency: 1,  // no threshold within chunks — filter globally below
    });
    allOccurrences.push(...chunkResults);

    // Yield to main thread every chunk to prevent UI freeze
    if (i + CHUNK_SIZE < targetChapters.length) {
      await yieldToMain();
    }
  }

  // Merge chunk results: aggregate by term key
  const merged = new Map<string, typeof allOccurrences[0]>();
  for (const occ of allOccurrences) {
    const key = occ.term.toLowerCase().trim();
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...occ });
    } else {
      existing.count += occ.count;
      existing.chapters = [...new Set([...existing.chapters, ...occ.chapters])].sort((a, b) => a - b);
      if (existing.contexts.length < 3) {
        existing.contexts.push(...occ.contexts.slice(0, 3 - existing.contexts.length));
      }
      if (existing.chapterRefs && occ.chapterRefs && existing.chapterRefs.length < 3) {
        existing.chapterRefs.push(...occ.chapterRefs.slice(0, 3 - existing.chapterRefs.length));
      }
    }
  }

  // Apply global frequency threshold
  const minFreq = options.minFrequency ?? 2;
  const occurrences = Array.from(merged.values()).filter(o => o.count >= minFreq);
  occurrences.sort((a, b) => b.count - a.count);

  await yieldToMain();

  // Phase 2+3: Normalize (embedded in clustering) + Cluster
  const rawClusters = clusterTerms({
    occurrences,
    options: {
      mergeThreshold: options.mergeThreshold ?? 0.72,
      reviewZoneThreshold: options.reviewZoneThreshold ?? 0.60,
    },
    scanRunId,
  });

  await yieldToMain();

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
