"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, Search, Zap, AlertTriangle, Languages, MessageSquareQuote } from "lucide-react";
import { InspectionIssue } from "@/lib/gemini";
import { cn } from "@/lib/utils";

interface InspectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    chapterTitle: string;
    issues: InspectionIssue[];
    onNavigateToIssue?: (original: string) => void;
}

export function InspectionDialog({
    open,
    onOpenChange,
    chapterTitle,
    issues,
    onNavigateToIssue
}: InspectionDialogProps) {
    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'untranslated': return <Languages className="w-4 h-4 text-rose-500" />;
            case 'pronoun': return <MessageSquareQuote className="w-4 h-4 text-amber-500" />;
            case 'grammar': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
            default: return <AlertCircle className="w-4 h-4 text-blue-500" />;
        }
    };

    const getTypeText = (type: string) => {
        switch (type) {
            case 'untranslated': return 'Chưa dịch';
            case 'pronoun': return 'Xưng hô';
            case 'grammar': return 'Ngữ pháp';
            default: return 'Khác';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-card border-border p-0 gap-0 overflow-hidden shadow-2xl">
                <DialogHeader className="p-6 pb-4 bg-muted/30 border-b border-border">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                <Zap className="w-5 h-5 text-primary" />
                                AI Inspect Result
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground font-medium">
                                Chương: {chapterTitle}
                            </DialogDescription>
                        </div>
                        <div className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold border transition-all",
                            issues.length > 0
                                ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        )}>
                            {issues.length > 0 ? `Phát hiện ${issues.length} vấn đề` : "Bản dịch hoàn hảo!"}
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh]">
                    <div className="p-6 space-y-4">
                        {issues.length > 0 ? (
                            issues.map((issue, idx) => (
                                <div
                                    key={idx}
                                    className="group p-4 rounded-xl bg-background border border-border hover:border-primary/30 hover:shadow-md transition-all animate-in slide-in-from-bottom-2 duration-300"
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 rounded-lg bg-muted shrink-0">
                                            {getTypeIcon(issue.type)}
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                    Loại: {getTypeText(issue.type)}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-[10px] uppercase font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => onNavigateToIssue?.(issue.original)}
                                                >
                                                    <Search className="w-3 h-3 mr-1" /> Tìm trong chương
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <div className="text-[9px] font-bold text-rose-500 uppercase tracking-tighter">Vấn đề</div>
                                                    <div className="text-sm font-medium p-2 bg-rose-500/5 rounded border border-rose-500/10 line-clamp-3">
                                                        "{issue.original}"
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">Gợi ý sửa</div>
                                                    <div className="text-sm font-bold text-emerald-600 p-2 bg-emerald-500/5 rounded border border-emerald-500/10 line-clamp-3">
                                                        "{issue.suggestion}"
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-1">
                                                <p className="text-xs text-muted-foreground italic leading-relaxed">
                                                    <span className="font-bold text-foreground/70 not-italic mr-1">Lý do:</span>
                                                    {issue.reason}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                                <div className="p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-lg font-bold text-foreground">Không tìm thấy lỗi nào!</h4>
                                    <p className="text-sm text-muted-foreground max-w-xs">
                                        AI đã kiểm tra kỹ lưỡng và không phát hiện vấn đề quan trọng nào về xưng hô hay ngữ pháp.
                                    </p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="rounded-full px-8">
                                    Tuyệt vời
                                </Button>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {issues.length > 0 && (
                    <div className="p-4 bg-muted/30 border-t border-border flex justify-end">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="font-bold rounded-lg px-6"
                            onClick={() => onOpenChange(false)}
                        >
                            Đóng
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
