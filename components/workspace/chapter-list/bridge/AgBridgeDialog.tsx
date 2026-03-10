/**
 * AgBridgeDialog
 *
 * Shows after export: real-time progress + auto-import.
 * State machine: WAITING → TRANSLATING → COMPLETE → IMPORTING → SUCCESS
 * v2.9.5: Missing chapter detection + history log
 */
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Copy, Download, Package, Loader2, CheckCircle2, Clock,
  AlertTriangle, RotateCcw, History,
} from "lucide-react";
import { toast } from "sonner";
import type { BridgePhase } from "../../hooks/useAntigravityOrchestrator";
import type { PollProgress, MissingChapterInfo, ImportResult } from "@/lib/bridge/antigravity-bridge";
import { getBridgeJobHistory } from "@/lib/bridge/antigravity-bridge";
import type { BridgeJobEntry } from "@/lib/db";

interface AgBridgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportedCount: number;
  jobId: string | null;
  exportPath: string | null;
  isImporting: boolean;
  onImport: () => void;
  onReExportMissing?: (missingOrders: number[]) => void;
  phase: BridgePhase;
  progress: PollProgress | null;
  missingInfo: MissingChapterInfo | null;
  importResult: ImportResult | null;
  workspaceId?: string;
}

export function AgBridgeDialog({
  open,
  onOpenChange,
  exportedCount,
  jobId,
  exportPath,
  isImporting,
  onImport,
  onReExportMissing,
  phase,
  progress,
  missingInfo,
  importResult,
  workspaceId,
}: AgBridgeDialogProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<BridgeJobEntry[]>([]);

  const copyCommand = () => {
    navigator.clipboard.writeText("/dich");
    toast.success("Đã copy lệnh /dich vào clipboard");
  };

  // Load history when tab is shown
  useEffect(() => {
    if (showHistory && open) {
      getBridgeJobHistory(workspaceId, 10).then(setHistory).catch(() => setHistory([]));
    }
  }, [showHistory, open, workspaceId]);

  const completed = progress?.completed ?? 0;
  const total = progress?.total ?? exportedCount;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] border-border bg-background text-foreground shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Antigravity Bridge
            {/* History toggle */}
            <button
              onClick={() => setShowHistory(h => !h)}
              className="ml-auto p-1.5 rounded-lg hover:bg-muted transition-colors"
              title="Lịch sử job"
            >
              <History className="h-4 w-4 text-muted-foreground" />
            </button>
          </DialogTitle>
        </DialogHeader>

        {showHistory ? (
          /* ─── History View ─────────────────────────────── */
          <div className="space-y-2 py-2 max-h-[300px] overflow-y-auto">
            {history.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">
                Chưa có lịch sử job nào
              </div>
            ) : (
              history.map((job) => (
                <div
                  key={job.id}
                  className="p-3 rounded-lg bg-muted/30 border border-border space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground">
                      {job.jobId.slice(0, 8)}
                    </span>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="text-sm text-foreground">
                    {job.chapterCount} chương
                    {job.importedCount !== undefined && ` → ${job.importedCount} imported`}
                  </div>
                  {job.qaSummary && (
                    <div className="text-[10px] text-blue-500">
                      🔍 {job.qaSummary.totalFindings} findings ({job.qaSummary.hardFindings} hard, {job.qaSummary.softFindings} soft)
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground/60">
                    {new Date(job.exportedAt).toLocaleString("vi-VN")}
                    {job.importedAt && ` → ${new Date(job.importedAt).toLocaleString("vi-VN")}`}
                  </div>
                  {job.missingOrders && job.missingOrders.length > 0 && (
                    <div className="text-[10px] text-amber-500">
                      ⚠️ Thiếu: Ch{job.missingOrders.join(', Ch')}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          /* ─── Main Bridge View ────────────────────────── */
          <div className="space-y-4 py-4">
            {/* Export summary */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2">
              <div className="text-sm font-bold text-foreground">
                📦 Đã đóng gói {exportedCount} chương
              </div>
              {exportPath && (
                <div className="text-[11px] text-muted-foreground font-mono break-all">
                  {exportPath}
                </div>
              )}
              {jobId && (
                <div className="text-[10px] text-muted-foreground/60 font-mono">
                  Job: {jobId.slice(0, 8)}...
                </div>
              )}
            </div>

            {/* Progress section — only shown when polling has started */}
            {(phase === "waiting" || phase === "translating" || phase === "complete" || phase === "importing" || phase === "success") && (
              <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-3">
                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">
                      {phase === "waiting" && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground animate-pulse" />
                          Đang chờ Agent...
                        </span>
                      )}
                      {phase === "translating" && (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                          Đang dịch...
                        </span>
                      )}
                      {phase === "complete" && (
                        <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Dịch xong! Đang import...
                        </span>
                      )}
                      {phase === "importing" && (
                        <span className="flex items-center gap-1.5 text-primary">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Đang import vào DB...
                        </span>
                      )}
                      {phase === "success" && !missingInfo && (
                        <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          🎉 Import thành công!
                        </span>
                      )}
                      {phase === "success" && missingInfo && (
                        <span className="flex items-center gap-1.5 text-amber-500">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Import xong — thiếu {missingInfo.missingOrders.length} chương
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono tabular-nums">
                      {importResult
                        ? `${importResult.imported}/${total}`
                        : `${completed}/${total}`
                      }
                    </span>
                  </div>

                  {/* Bar */}
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${phase === "success" && !missingInfo
                        ? "bg-green-500"
                        : phase === "success" && missingInfo
                          ? "bg-amber-500"
                          : phase === "complete" || phase === "importing"
                            ? "bg-green-500 animate-pulse"
                            : "bg-primary"
                        }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Missing chapters alert */}
            {missingInfo && missingInfo.hasMissing && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Thiếu {missingInfo.missingOrders.length} chương
                </div>
                <div className="text-xs text-muted-foreground">
                  Các chương chưa được dịch:{" "}
                  <span className="font-mono font-bold text-foreground">
                    {missingInfo.missingOrders.map(o => `Ch${o}`).join(", ")}
                  </span>
                </div>
                {onReExportMissing && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-semibold border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                    onClick={() => onReExportMissing(missingInfo.missingOrders)}
                  >
                    <RotateCcw className="h-3 w-3 mr-2" />
                    Re-export {missingInfo.missingOrders.length} chương thiếu
                  </Button>
                )}
              </div>
            )}

            {/* QA Summary — shown after import */}
            {phase === "success" && importResult && importResult.errors.some(e => e.startsWith('🔍 QA:')) && (
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-1.5">
                <div className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  🔍 QA Report
                </div>
                {importResult.errors.filter(e => e.startsWith('🔍 QA:')).map((e, i) => (
                  <div key={i} className="text-xs text-muted-foreground">{e.replace('🔍 QA: ', '')}</div>
                ))}
              </div>
            )}

            {/* Instructions — only when waiting/not started */}
            {(phase === "waiting" || phase === "idle") && completed === 0 && !missingInfo && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                <div className="text-sm font-bold text-foreground">Bước tiếp theo</div>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Qua chat <span className="font-bold text-foreground">Antigravity</span></li>
                  <li>
                    Gõ lệnh{" "}
                    <code className="px-1.5 py-0.5 rounded bg-muted border border-border text-primary font-mono font-bold text-xs">
                      /dich
                    </code>
                  </li>
                  <li>Agent sẽ tự dịch và import</li>
                </ol>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-semibold border-border"
                  onClick={copyCommand}
                >
                  <Copy className="h-3 w-3 mr-2" />
                  Copy lệnh /dich
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            className="text-muted-foreground font-medium"
            onClick={() => onOpenChange(false)}
          >
            Đóng
          </Button>
          {/* Manual import fallback — hidden during auto flow */}
          {phase !== "importing" && phase !== "success" && !showHistory && (
            <Button
              className="font-bold shadow-lg shadow-primary/20"
              onClick={onImport}
              disabled={isImporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {isImporting ? "Đang import..." : "📥 Import tay"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Status badge for history entries */
function StatusBadge({ status }: { status: BridgeJobEntry["status"] }) {
  const config: Record<string, { label: string; className: string }> = {
    exported: { label: "Exported", className: "bg-blue-500/10 text-blue-500" },
    translating: { label: "Đang dịch", className: "bg-primary/10 text-primary" },
    completed: { label: "Dịch xong", className: "bg-green-500/10 text-green-600" },
    imported: { label: "Imported", className: "bg-green-500/10 text-green-600" },
    partial: { label: "Thiếu", className: "bg-amber-500/10 text-amber-500" },
    failed: { label: "Lỗi", className: "bg-red-500/10 text-red-500" },
  };
  const c = config[status] ?? config.exported;
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${c.className}`}>
      {c.label}
    </span>
  );
}
