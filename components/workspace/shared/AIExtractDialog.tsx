"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Sparkles, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIExtractDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onExtract: (source: "latest" | "current" | "select") => void;
    isExtracting: boolean;
    onSelectFromList?: () => void;
}

export function AIExtractDialog({
    open,
    onOpenChange,
    onExtract,
    isExtracting,
    onSelectFromList
}: AIExtractDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px] bg-popover border-border text-popover-foreground">
                <DialogHeader>
                    <DialogTitle>Chọn nguồn quét AI</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Mày muốn AI quét dữ liệu từ đâu để trích xuất nhân vật/thuật ngữ?
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Button
                        variant="outline"
                        className="justify-start h-16 border-border hover:bg-muted bg-transparent group"
                        onClick={() => onExtract("current")}
                        disabled={isExtracting}
                    >
                        <div className="flex items-center gap-3 text-left">
                            <div className="p-2 rounded bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-bold">Chương đang đọc</div>
                                <div className="text-xs text-muted-foreground">Quét chương mày vừa mở gần đây nhất.</div>
                            </div>
                        </div>
                    </Button>
                    <Button
                        variant="outline"
                        className="justify-start h-16 border-border hover:bg-muted bg-transparent group"
                        onClick={() => onExtract("latest")}
                        disabled={isExtracting}
                    >
                        <div className="flex items-center gap-3 text-left">
                            <div className="p-2 rounded bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-bold">Chương mới nhất</div>
                                <div className="text-xs text-muted-foreground">Quét chương cuối cùng vừa đăng.</div>
                            </div>
                        </div>
                    </Button>
                    {onSelectFromList && (
                        <Button
                            variant="outline"
                            className="justify-start h-16 border-border hover:bg-muted bg-transparent group"
                            onClick={onSelectFromList}
                            disabled={isExtracting}
                        >
                            <div className="flex items-center gap-3 text-left">
                                <div className="p-2 rounded bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20">
                                    <MoreHorizontal className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold">Chọn từ danh sách</div>
                                    <div className="text-xs text-muted-foreground">Mày sang tab Chương để chọn nhiều chương.</div>
                                </div>
                            </div>
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
