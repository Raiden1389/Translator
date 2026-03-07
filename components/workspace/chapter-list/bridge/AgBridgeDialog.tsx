/**
 * AgBridgeDialog
 *
 * Shows after export: real-time progress + auto-import.
 * State machine: WAITING → TRANSLATING → COMPLETE → IMPORTING → SUCCESS
 */
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Download, Package, Loader2, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import type { BridgePhase } from "../../hooks/useAntigravityOrchestrator";
import type { PollProgress } from "@/lib/bridge/antigravity-bridge";

interface AgBridgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportedCount: number;
  jobId: string | null;
  exportPath: string | null;
  isImporting: boolean;
  onImport: () => void;
  phase: BridgePhase;
  progress: PollProgress | null;
}

export function AgBridgeDialog({
  open,
  onOpenChange,
  exportedCount,
  jobId,
  exportPath,
  isImporting,
  onImport,
  phase,
  progress,
}: AgBridgeDialogProps) {
  const copyCommand = () => {
    navigator.clipboard.writeText("/dich");
    toast.success("Đã copy lệnh /dich vào clipboard");
  };

  const completed = progress?.completed ?? 0;
  const total = progress?.total ?? exportedCount;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] border-border bg-background text-foreground shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Antigravity Bridge
          </DialogTitle>
        </DialogHeader>

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
                    {phase === "success" && (
                      <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        🎉 Import thành công!
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono tabular-nums">
                    {completed}/{total}
                  </span>
                </div>

                {/* Bar */}
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${phase === "success"
                        ? "bg-green-500"
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

          {/* Instructions — only when waiting/not started */}
          {(phase === "waiting" || phase === "idle") && completed === 0 && (
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

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            className="text-muted-foreground font-medium"
            onClick={() => onOpenChange(false)}
          >
            Đóng
          </Button>
          {/* Manual import fallback — hidden during auto flow */}
          {phase !== "importing" && phase !== "success" && (
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
