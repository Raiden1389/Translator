/**
 * useAntigravityOrchestrator
 *
 * React hook that bridges the TranslationProvider with
 * the Antigravity file-based translation system.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { exportInbox, exportMissingOnly, importOutbox, hasPendingOutbox, pollJobProgress, findLatestOutboxInfo, detectMissingChapters, updateBridgeJobStatus } from "@/lib/bridge/antigravity-bridge";
import type { ImportResult, PollProgress, MissingChapterInfo } from "@/lib/bridge/antigravity-bridge";
import type { Chapter, DictionaryEntry, CorrectionEntry } from "@/lib/db";
import { toast } from "sonner";

export type BridgePhase = "idle" | "waiting" | "translating" | "complete" | "importing" | "success";

interface BridgeState {
  isExporting: boolean;
  isImporting: boolean;
  lastJobId: string | null;
  lastExportPath: string | null;
  dialogOpen: boolean;
  exportedCount: number;
  exportedOrders: number[];   // Track which orders were exported
  phase: BridgePhase;
  progress: PollProgress | null;
  missingInfo: MissingChapterInfo | null;
  importResult: ImportResult | null;
}

interface BridgeExportContext {
  workspaceId: string;
  glossary: DictionaryEntry[];
  corrections: CorrectionEntry[];
  prompt: string;
  temperature: number;
}

export function useAntigravityOrchestrator() {
  const [state, setState] = useState<BridgeState>({
    isExporting: false,
    isImporting: false,
    lastJobId: null,
    lastExportPath: null,
    dialogOpen: false,
    exportedCount: 0,
    exportedOrders: [],
    phase: "idle",
    progress: null,
    missingInfo: null,
    importResult: null,
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoImportTriggered = useRef(false);
  const exportContextRef = useRef<BridgeExportContext | null>(null);

  const exportForBridge = useCallback(async (
    workspaceId: string,
    chapters: Chapter[],
    glossary: DictionaryEntry[],
    corrections: CorrectionEntry[],
    prompt: string,
    temperature: number,
  ) => {
    setState(s => ({ ...s, isExporting: true }));

    try {
      exportContextRef.current = { workspaceId, glossary, corrections, prompt, temperature };
      const { jobId, path, chapterCount } = await exportInbox(
        workspaceId, chapters, glossary, corrections, prompt, temperature,
      );

      setState(s => ({
        ...s,
        isExporting: false,
        lastJobId: jobId,
        lastExportPath: path,
        dialogOpen: true,
        exportedCount: chapterCount,
        exportedOrders: chapters.map(c => c.order),
        phase: "waiting",
        progress: null,
        missingInfo: null,
        importResult: null,
      }));
      autoImportTriggered.current = false;
    } catch (err) {
      setState(s => ({ ...s, isExporting: false }));
      toast.error(`Export thất bại: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  const importFromBridge = useCallback(async (
    currentWorkspaceId: string,
  ): Promise<ImportResult | null> => {
    setState(s => ({ ...s, isImporting: true }));

    try {
      const result = await importOutbox(
        currentWorkspaceId,
        state.lastJobId ?? undefined,
        state.exportedCount || undefined,
      );

      if (result.imported > 0) {
        toast.success(`✅ Đã nhập ${result.imported} chương từ Antigravity Bridge`);
      }
      if (result.skipped > 0) {
        toast.warning(`⚠️ Bỏ qua ${result.skipped} chương (lỗi hoặc rỗng)`);
      }
      if (result.errors.length > 0 && result.imported === 0) {
        toast.error(result.errors[0]);
      }

      setState(s => ({
        ...s,
        isImporting: false,
        // dialogOpen: false, // Don't close here, let phase transition handle it
        lastJobId: result.imported > 0 ? s.lastJobId : null,
        lastExportPath: result.imported > 0 ? s.lastExportPath : null,
        phase: "idle",
        progress: null,
      }));

      return result;
    } catch (err) {
      setState(s => ({ ...s, isImporting: false }));
      toast.error(`Import thất bại: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }, [state.lastJobId, state.exportedCount]);

  const closeDialog = useCallback(() => {
    setState(s => ({ ...s, dialogOpen: false, phase: "idle", progress: null }));
    autoImportTriggered.current = false;
  }, []);

  const checkPendingOutbox = useCallback(async (): Promise<boolean> => {
    try {
      return await hasPendingOutbox();
    } catch {
      return false;
    }
  }, []);

  // ─── Poll Effect ────────────────────────────────────────────
  useEffect(() => {
    // Only poll when dialog is open and we have a job
    if (!state.dialogOpen || !state.lastJobId || state.phase === "importing" || state.phase === "success") {
      return;
    }

    const jobId = state.lastJobId;
    const expected = state.exportedCount;

    const tick = async () => {
      try {
        const p = await pollJobProgress(jobId, expected);
        setState(s => {
          if (!s.dialogOpen || s.lastJobId !== jobId) return s;

          let nextPhase = s.phase;
          if (p.isDone) {
            nextPhase = "complete";
          } else if (p.completed > 0) {
            nextPhase = "translating";
          }

          return { ...s, progress: p, phase: nextPhase as BridgePhase };
        });

        // Auto-import when complete
        if (p.isDone && !autoImportTriggered.current) {
          autoImportTriggered.current = true;
          // Small delay so user sees "Complete" before import starts
          setTimeout(() => {
            setState(s => {
              if (s.phase === "complete") {
                return { ...s, phase: "importing", isImporting: true };
              }
              return s;
            });
          }, 1500);
        }
      } catch {
        // Silently ignore poll errors
      }
    };

    // Initial tick
    tick();
    pollRef.current = setInterval(tick, 2000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [state.dialogOpen, state.lastJobId, state.exportedCount, state.phase]);

  const setBridgeResult = useCallback((
    jobId: string,
    path: string,
    chapterCount: number,
    exportedOrders: number[] = [],
    exportContext?: BridgeExportContext,
  ) => {
    if (exportContext) {
      exportContextRef.current = exportContext;
    }
    setState(s => ({
      ...s,
      isExporting: false,
      lastJobId: jobId,
      lastExportPath: path,
      dialogOpen: true,
      exportedCount: chapterCount,
      exportedOrders,
      phase: "waiting" as BridgePhase,
      progress: null,
      missingInfo: null,
      importResult: null,
    }));
    autoImportTriggered.current = false;
  }, []);

  // Called externally (from dialog) with workspaceId for auto-import
  const triggerAutoImport = useCallback(async (
    currentWorkspaceId: string,
  ) => {
    setState(s => ({ ...s, phase: "importing", isImporting: true }));
    const result = await importFromBridge(currentWorkspaceId);
    if (result && result.imported > 0) {
      // Check for missing chapters based on ACTUAL imported orders
      const missing = detectMissingChapters(state.exportedOrders, result.importedOrders);

      if (missing.hasMissing) {
        // Partial import — update history and keep dialog open
        if (state.lastJobId) {
          await updateBridgeJobStatus(state.lastJobId, {
            status: 'partial',
            missingOrders: missing.missingOrders,
          });
        }
        setState(s => ({
          ...s,
          phase: "success",
          missingInfo: missing,
          importResult: result,
        }));
        toast.warning(`⚠️ Thiếu ${missing.missingOrders.length} chương: ${missing.missingOrders.join(', ')}`);
        // Don't auto-close — user needs to see missing info
        return;
      }

      setState(s => ({ ...s, phase: "success", importResult: result, missingInfo: null }));

      // Auto-push to cloud after bridge import (background, non-blocking)
      import("@/lib/sync/cloud-sync").then(({ hasToken, pushDelta }) => {
        if (!hasToken()) return;
        pushDelta(currentWorkspaceId).then(r => {
          if (r.sizeKB === 0) return;
          import("sonner").then(({ toast }) => {
            toast.success(`☁️ Đã sync ${r.delta ? "+" + r.chapterCount : r.chapterCount} chương lên cloud`);
          });
        }).catch(err => {
          console.warn("[CloudSync] Auto-push after bridge import failed:", err);
        });
      }).catch(() => { /* cloud-sync module not available */ });

      // Don't auto-close dialog — let user see summary and results
    }
  }, [importFromBridge, state.exportedOrders, state.lastJobId]);

  // ─── Reopen dialog for pending outbox ─────────────────────────
  const reopenForImport = useCallback(async () => {
    try {
      const info = await findLatestOutboxInfo();
      if (!info) {
        toast.info("Không có outbox nào đang chờ import");
        return;
      }
      setState(s => ({
        ...s,
        lastJobId: info.jobId,
        lastExportPath: null,
        dialogOpen: true,
        exportedCount: info.fileCount,
        exportedOrders: info.orders,
        phase: "complete" as BridgePhase,
        progress: {
          completed: info.fileCount,
          total: info.fileCount,
          completedOrders: info.orders,
          isDone: true,
        },
      }));
      autoImportTriggered.current = false;
    } catch {
      toast.error("Lỗi khi mở lại Bridge dialog");
    }
  }, []);

  const reExportMissing = useCallback(async (workspaceId: string, missingOrders: number[]) => {
    const ctx = exportContextRef.current;
    if (!ctx || ctx.workspaceId !== workspaceId) {
      toast.error("Không còn context export để re-export chương thiếu. Hãy chọn lại chương và export Bridge mới.");
      return;
    }
    if (missingOrders.length === 0) return;

    setState(s => ({ ...s, isExporting: true }));
    try {
      const { jobId, path, chapterCount } = await exportMissingOnly(
        workspaceId,
        missingOrders,
        ctx.glossary,
        ctx.corrections,
        ctx.prompt,
        ctx.temperature,
      );
      setState(s => ({
        ...s,
        isExporting: false,
        lastJobId: jobId,
        lastExportPath: path,
        dialogOpen: true,
        exportedCount: chapterCount,
        exportedOrders: missingOrders,
        phase: "waiting" as BridgePhase,
        progress: null,
        missingInfo: null,
        importResult: null,
      }));
      autoImportTriggered.current = false;
      toast.success(`Đã export lại ${chapterCount} chương thiếu`);
    } catch (err) {
      setState(s => ({ ...s, isExporting: false }));
      toast.error(`Re-export thất bại: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, []);

  return {
    ...state,
    exportForBridge,
    importFromBridge,
    closeDialog,
    checkPendingOutbox,
    setBridgeResult,
    triggerAutoImport,
    reopenForImport,
    reExportMissing,
  };
}
