/**
 * Term Audit — React Hook
 *
 * Wraps runTermAuditScan + applyTermFixes behind a clean state machine.
 * Feature-flagged: returns { disabled: true } when featureFlags.termAudit is OFF.
 *
 * State machine:
 *   idle → scanning → ready (with report) → applying → ready | error
 *
 * Usage:
 *   const audit = useTermAudit({ workspaceId, fromChapter, toChapter });
 *   audit.scan();
 *   audit.confirmCanonical(clusterId, canonical);
 *   audit.apply();
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { featureFlags } from '@/lib/featureFlags';
import { runTermAuditScan, applyTermFixes } from '@/lib/services/term-audit.service';
import type {
  TermAuditReport,
  TermCluster,
  TermFixResult,
  TermAuditScanOptions,
} from '@/lib/services/term-audit.types';

// ---------------------------------------------------------------------------
// State types
// ---------------------------------------------------------------------------

export type TermAuditStatus = 'idle' | 'scanning' | 'ready' | 'applying' | 'error';

export interface TermAuditState {
  status: TermAuditStatus;
  report: TermAuditReport | null;
  /** clusterId → chosen canonical */
  confirmedFixes: Map<string, string>;
  applyResult: TermFixResult | null;
  error: string | null;
  progress: { current: number; total: number; label: string } | null;
  /** Feature disabled — nothing to render */
  disabled: boolean;
}

export interface TermAuditActions {
  /** Start a new scan */
  scan: () => Promise<void>;
  /**
   * Confirm a cluster — set canonical + mark cluster.confirmed = true.
   * Resets confirm if null canonical passed (un-confirm).
   */
  confirmCanonical: (clusterId: string, canonical: string | null) => void;
  /** Apply all confirmed fixes */
  apply: () => Promise<void>;
  /** Reset to idle state */
  reset: () => void;
}

export type UseTermAuditReturn = TermAuditState & TermAuditActions;

// ---------------------------------------------------------------------------
// Hook options
// ---------------------------------------------------------------------------

export interface UseTermAuditOptions extends Partial<TermAuditScanOptions> {
  workspaceId: string;
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

const INITIAL_STATE: TermAuditState = {
  status: 'idle',
  report: null,
  confirmedFixes: new Map(),
  applyResult: null,
  error: null,
  progress: null,
  disabled: !featureFlags.termAudit,
};

export function useTermAudit(options: UseTermAuditOptions): UseTermAuditReturn {
  const [state, setState] = useState<TermAuditState>(INITIAL_STATE);

  // Track current scanRunId for stale-confirm guard
  const currentScanRunId = useRef<string>('');

  // Helper: mutate specific fields
  const patch = useCallback((partial: Partial<TermAuditState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  // ---------------------------------------------------------------------------
  // scan()
  // ---------------------------------------------------------------------------

  const scan = useCallback(async () => {
    if (!featureFlags.termAudit) return;

    patch({ status: 'scanning', error: null, report: null, applyResult: null, confirmedFixes: new Map(), progress: null });

    try {
      const report = await runTermAuditScan({
        workspaceId: options.workspaceId,
        fromChapter: options.fromChapter,
        toChapter: options.toChapter,
        minFrequency: options.minFrequency ?? 2,
        mergeThreshold: options.mergeThreshold ?? 0.72,
        reviewZoneThreshold: options.reviewZoneThreshold ?? 0.60,
      });

      currentScanRunId.current = report.scanRunId;

      patch({ status: 'ready', report });
    } catch (err) {
      patch({
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, [options, patch]);

  // ---------------------------------------------------------------------------
  // confirmCanonical()
  // ---------------------------------------------------------------------------

  const confirmCanonical = useCallback((clusterId: string, canonical: string | null) => {
    setState(prev => {
      if (!prev.report) return prev;

      const newFixes = new Map(prev.confirmedFixes);
      const newClusters: TermCluster[] = prev.report.clusters.map(c => {
        if (c.id !== clusterId) return c;

        if (canonical === null) {
          // Un-confirm
          newFixes.delete(clusterId);
          return { ...c, confirmed: false, confirmedAt: undefined };
        }

        // Guard: scanRunId must still match
        if (c.scanRunId !== currentScanRunId.current) {
          console.warn('[TermAudit] Ignored confirm for stale cluster:', clusterId);
          return c;
        }

        // Set confirm
        newFixes.set(clusterId, canonical);
        return {
          ...c,
          confirmed: true,
          confirmedAt: Date.now(),
          suggestedCanonical: canonical,
        };
      });

      return {
        ...prev,
        confirmedFixes: newFixes,
        report: { ...prev.report, clusters: newClusters },
      };
    });
  }, []);

  // ---------------------------------------------------------------------------
  // apply()
  // ---------------------------------------------------------------------------

  const apply = useCallback(async () => {
    if (!featureFlags.termAudit) return;
    if (!state.report) return;
    if (state.confirmedFixes.size === 0) return;

    patch({ status: 'applying', error: null, progress: null });

    try {
      const result = await applyTermFixes({
        confirmedFixes: state.confirmedFixes,
        clusters: state.report.clusters,
        workspaceId: options.workspaceId,
        currentScanRunId: currentScanRunId.current,
        onProgress: (current, total, label) => {
          patch({ progress: { current, total, label } });
        },
      });

      patch({ status: 'ready', applyResult: result, progress: null });
    } catch (err) {
      patch({
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
        progress: null,
      });
    }
  }, [state.report, state.confirmedFixes, options.workspaceId, patch]);

  // ---------------------------------------------------------------------------
  // reset()
  // ---------------------------------------------------------------------------

  const reset = useCallback(() => {
    currentScanRunId.current = '';
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    scan,
    confirmCanonical,
    apply,
    reset,
  };
}
