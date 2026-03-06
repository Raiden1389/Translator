/**
 * AgBridgeDialog
 *
 * Shows after export: instructions + copy command + import button.
 * Follows existing shadcn/ui theme — no custom colors.
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
import { Copy, Download, Package } from "lucide-react";
import { toast } from "sonner";

interface AgBridgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportedCount: number;
  jobId: string | null;
  exportPath: string | null;
  isImporting: boolean;
  onImport: () => void;
}

export function AgBridgeDialog({
  open,
  onOpenChange,
  exportedCount,
  jobId,
  exportPath,
  isImporting,
  onImport,
}: AgBridgeDialogProps) {
  const copyCommand = () => {
    navigator.clipboard.writeText("/dich");
    toast.success("Đã copy lệnh /dich vào clipboard");
  };

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

          {/* Instructions */}
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
              <li>Đợi Agent dịch xong</li>
              <li>Quay lại đây bấm <span className="font-bold text-foreground">Import</span></li>
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
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            className="text-muted-foreground font-medium"
            onClick={() => onOpenChange(false)}
          >
            Đóng
          </Button>
          <Button
            className="font-bold shadow-lg shadow-primary/20"
            onClick={onImport}
            disabled={isImporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {isImporting ? "Đang import..." : "📥 Import kết quả"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
