import React from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, HistoryEntry } from "@/lib/db";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RotateCcw, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";

interface HistoryDialogProps {
    workspaceId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function HistoryDialog({ workspaceId, open, onOpenChange }: HistoryDialogProps) {
    const history = useLiveQuery(
        () => db.history
            .where("workspaceId").equals(workspaceId)
            .reverse() // Newest first
            .limit(20) // Limit to last 20 actions
            .toArray(),
        [workspaceId]
    );

    const handleUndo = async (entry: HistoryEntry) => {
        if (!confirm(`Bạn có chắc muốn hoàn tác hành động "${entry.summary}" không?`)) return;

        const toastId = toast.loading("Đang hoàn tác...");

        try {
            await db.transaction('rw', db.chapters, db.history, async () => {
                // Restore each chapter
                for (const item of entry.snapshot) {
                    await db.chapters.update(item.chapterId, {
                        title_translated: item.before.title,
                        content_translated: item.before.content,
                        updatedAt: new Date()
                    });
                }

                // Delete the history entry after undoing (or mark as undone?)
                // For simplicity, we delete it to prevent double undo.
                // Or clearer UX: keep it but mark status. For now, delete.
                await db.history.delete(entry.id!);
            });

            toast.success("Đã hoàn tác thành công!", { id: toastId });
            onOpenChange(false);
        } catch (error) {
            console.error("Undo failed:", error);
            toast.error("Hoàn tác thất bại.", { id: toastId });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-background border-border text-foreground shadow-2xl rounded-3xl p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Clock className="h-5 w-5 text-primary" />
                        Lịch sử chỉnh sửa
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Các thao tác hàng loạt gần đây. Bạn có thể hoàn tác nếu cần.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[450px] px-6 pb-6">
                    <div className="space-y-3">
                        {!history || history.length === 0 ? (
                            <div className="text-center py-20 text-muted-foreground/50 text-sm flex flex-col items-center gap-3">
                                <Clock className="h-10 w-10 opacity-10" />
                                Chưa có lịch sử thao tác nào.
                            </div>
                        ) : (
                            history.map((entry) => (
                                <div key={entry.id} className="relative group p-4 rounded-2xl bg-muted/30 border border-border/50 hover:border-primary/20 hover:bg-muted/50 transition-all shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="space-y-1">
                                            <div className="font-bold text-sm text-foreground">
                                                {entry.summary}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                                <Clock className="h-3 w-3" />
                                                {formatDistanceToNow(entry.timestamp, { addSuffix: true, locale: vi })}
                                                <span className="w-1 h-1 rounded-full bg-border" />
                                                <span>{entry.affectedCount} chương</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleUndo(entry)}
                                        className="w-full mt-2 border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30 text-xs h-9 gap-2 bg-background font-bold rounded-xl"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        Hoàn tác (Undo)
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>

                <div className="p-4 bg-muted/30 border-t border-border flex items-center gap-2 text-[10px] text-muted-foreground px-6 py-3">
                    <AlertCircle className="h-3 w-3" />
                    <span>Chúng tôi chỉ lưu trữ 20 thao tác gần nhất.</span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
