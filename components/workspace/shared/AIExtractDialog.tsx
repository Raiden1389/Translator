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
                            <div className="p-2 rounded bg-primary/10 text-primary group-hover:bg-primary/20">
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
                            <div className="p-2 rounded bg-primary/10 text-primary group-hover:bg-primary/20">
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
                                <div className="p-2 rounded bg-accent/10 text-accent group-hover:bg-accent/20">
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
