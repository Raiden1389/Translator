/**
 * Term Audit — Autofix Engine (Phase 4)
 *
 * Applies confirmed term fixes to Corrections (Luyện Văn) + sweeps chapters.
 * Reuses corrections.service.ts (sweepSingleRule) and db.history.
 *
 * Guards enforced before apply:
 *   - cluster.confirmed === true
 *   - cluster.variants.length >= 2
 *   - cluster.scanRunId matches current scan session
 */

import { db, CorrectionEntry, GLOBAL_WORKSPACE_ID } from '@/lib/db';
import { sweepSingleRule } from '@/lib/services/corrections.service';
import type { TermCluster, TermFixResult } from './term-audit.types';

export interface TermApplyInput {
  /** Map<clusterId, chosenCanonical> — from UI confirmation */
  confirmedFixes: Map<string, string>;
  clusters: TermCluster[];
  workspaceId: string;
  /** Must match cluster.scanRunId — prevents applying stale confirms */
  currentScanRunId: string;
  onProgress?: (current: number, total: number, label: string) => void;
}

export async function applyTermFixes(input: TermApplyInput): Promise<TermFixResult> {
  const { confirmedFixes, clusters, workspaceId, currentScanRunId, onProgress } = input;
  const startTime = performance.now();

  // Build fix list with guards
  const fixes: { from: string; to: string; clusterId: string }[] = [];

  for (const [clusterId, canonical] of confirmedFixes) {
    const cluster = clusters.find(c => c.id === clusterId);
    if (!cluster) continue;

    // Guard 1: must be confirmed
    if (!cluster.confirmed) {
      console.warn(`[TermAudit] Skipped unconfirmed cluster: ${clusterId}`);
      continue;
    }

    // Guard 2: must have ≥ 2 variants (nothing to fix with 1)
    if (cluster.variants.length < 2) {
      console.warn(`[TermAudit] Skipped single-variant cluster: ${clusterId}`);
      continue;
    }

    // Guard 3: scanRunId must match current session
    if (cluster.scanRunId !== currentScanRunId) {
      console.warn(`[TermAudit] Skipped stale cluster (scanRunId mismatch): ${clusterId}`);
      continue;
    }

    for (const variant of cluster.variants) {
      if (variant.term === canonical) continue;
      fixes.push({ from: variant.term, to: canonical, clusterId });
    }
  }

  if (fixes.length === 0) {
    return { rulesCreated: 0, chaptersFixed: 0, durationMs: 0 };
  }

  const total = fixes.length;
  let rulesCreated = 0;
  let totalChaptersFixed = 0;
  let historySaved = false;

  // Lazy snapshot — captured on first actual chapter change
  let snapshot: { chapterId: number; before: { title: string; content: string } }[] | null = null;

  async function ensureSnapshot() {
    if (snapshot) return snapshot;
    const translatedChapters = await db.chapters
      .filter(c => !!c.content_translated)
      .toArray();
    snapshot = translatedChapters.map(c => ({
      chapterId: c.id!,
      before: {
        title: c.title_translated || c.title,
        content: c.content_translated || '',
      },
    }));
    return snapshot;
  }

  for (let i = 0; i < fixes.length; i++) {
    const fix = fixes[i];
    onProgress?.(i + 1, total, `${fix.from} → ${fix.to}`);

    // Check for existing rule
    const existing = await db.corrections
      .where('workspaceId')
      .equals(GLOBAL_WORKSPACE_ID)
      .filter(c =>
        c.type === 'replace' &&
        (c.from || c.original || '').normalize('NFC').toLowerCase() ===
          fix.from.normalize('NFC').toLowerCase()
      )
      .first();

    if (existing) {
      const existingTo = (existing.to || existing.replacement || '').normalize('NFC').toLowerCase();
      const newTo = fix.to.normalize('NFC').toLowerCase();

      if (existingTo === newTo) {
        console.log(`[TermAudit] Skip identical rule: "${fix.from}" → "${fix.to}"`);
        continue;
      }

      // Update existing rule with new canonical
      await db.corrections.update(existing.id!, {
        to: fix.to.normalize('NFC'),
        replacement: fix.to.normalize('NFC'),
        createdAt: new Date(),
      });
      rulesCreated++;
      console.log(`[TermAudit] Updated rule: "${fix.from}" → "${existingTo}" ⇒ "${fix.to}"`);
    } else {
      // Create new rule
      const entry: Partial<CorrectionEntry> = {
        workspaceId: GLOBAL_WORKSPACE_ID,
        type: 'replace',
        from: fix.from.normalize('NFC'),
        to: fix.to.normalize('NFC'),
        original: fix.from.normalize('NFC'),
        replacement: fix.to.normalize('NFC'),
        createdAt: new Date(),
      };
      await db.corrections.add(entry as CorrectionEntry);
      rulesCreated++;
    }

    // Sweep all chapters with this rule
    const currentSnapshot = await ensureSnapshot();
    const sweepRule: Partial<CorrectionEntry> = {
      type: 'replace',
      from: fix.from.normalize('NFC'),
      to: fix.to.normalize('NFC'),
      original: fix.from.normalize('NFC'),
      replacement: fix.to.normalize('NFC'),
    };

    const affected = await sweepSingleRule(sweepRule);
    totalChaptersFixed += affected;

    // Save undo snapshot to history on first actual change
    if (affected > 0 && !historySaved && currentSnapshot.length > 0) {
      await db.history.add({
        workspaceId,
        actionType: 'batch_correction',
        summary: 'Term Audit: áp dụng sửa thuật ngữ toàn cục',
        timestamp: new Date(),
        affectedCount: currentSnapshot.length,
        snapshot: currentSnapshot,
      });
      historySaved = true;
    }

    console.log(`[TermAudit] Rule "${fix.from}" → "${fix.to}": ${affected} chapters updated`);
  }

  const durationMs = Math.round(performance.now() - startTime);
  console.log(
    `[TermAudit] Apply complete: ${rulesCreated} rules, ` +
    `${totalChaptersFixed} chapter updates in ${durationMs}ms`
  );

  return { rulesCreated, chaptersFixed: totalChaptersFixed, durationMs };
}
