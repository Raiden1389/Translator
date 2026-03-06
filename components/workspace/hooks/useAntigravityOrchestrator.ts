/**
 * useAntigravityOrchestrator
 *
 * React hook that bridges the TranslationProvider with
 * the Antigravity file-based translation system.
 */
import { useState, useCallback } from "react";
import { exportInbox, importOutbox, hasPendingOutbox } from "@/lib/bridge/antigravity-bridge";
import type { ImportResult } from "@/lib/bridge/antigravity-bridge";
import type { Chapter, DictionaryEntry, CorrectionEntry } from "@/lib/db";
import { toast } from "sonner";

interface BridgeState {
  isExporting: boolean;
  isImporting: boolean;
  lastJobId: string | null;
  lastExportPath: string | null;
  dialogOpen: boolean;
  exportedCount: number;
}

export function useAntigravityOrchestrator() {
  const [state, setState] = useState<BridgeState>({
    isExporting: false,
    isImporting: false,
    lastJobId: null,
    lastExportPath: null,
    dialogOpen: false,
    exportedCount: 0,
  });

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
      }));
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
      const result = await importOutbox(currentWorkspaceId, state.lastJobId ?? undefined);

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
        dialogOpen: false,
        lastJobId: null,
        lastExportPath: null,
      }));

      return result;
    } catch (err) {
      setState(s => ({ ...s, isImporting: false }));
      toast.error(`Import thất bại: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }, [state.lastJobId]);

  const closeDialog = useCallback(() => {
    setState(s => ({ ...s, dialogOpen: false }));
  }, []);

  const checkPendingOutbox = useCallback(async (): Promise<boolean> => {
    try {
      return await hasPendingOutbox();
    } catch {
      return false;
    }
  }, []);

  const setBridgeResult = useCallback((jobId: string, path: string, chapterCount: number) => {
    setState(s => ({
      ...s,
      isExporting: false,
      lastJobId: jobId,
      lastExportPath: path,
      dialogOpen: true,
      exportedCount: chapterCount,
    }));
  }, []);

  return {
    ...state,
    exportForBridge,
    importFromBridge,
    closeDialog,
    checkPendingOutbox,
    setBridgeResult,
  };
}
