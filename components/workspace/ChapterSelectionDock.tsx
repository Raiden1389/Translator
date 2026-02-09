"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Eraser, Sparkles, X, Loader2, FileText } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Chapter } from "@/lib/db";

interface ChapterSelectionDockProps {
    selectedChapters: number[];
    setSelectedChapters: (ids: number[]) => void;
    setTranslateDialogOpen: (open: boolean) => void;
    filtered: Chapter[];
    setTempScanText: (text: string) => void;
    setScanConfigOpen: (open: boolean) => void;
    isAIExtracting: boolean;
    handleBulkClearTranslation: () => void;
    setBulkDeleteConfirmOpen: (open: boolean) => void;
}

export function ChapterSelectionDock({
    selectedChapters,
    setSelectedChapters,
    setTranslateDialogOpen,
    filtered,
    setTempScanText,
    setScanConfigOpen,
    isAIExtracting,
    handleBulkClearTranslation,
    setBulkDeleteConfirmOpen
}: ChapterSelectionDockProps) {
    if (selectedChapters.length === 0) return null;

    return (
        <div className="sticky bottom-0 left-0 right-0 z-40 animate-in slide-in-from-bottom-5 duration-300 -mx-8">
            <div className="absolute inset-0 bg-background/60 backdrop-blur-xl border-t border-border shadow-[0_-20px_40px_rgba(0,0,0,0.1)]" />

            <div className="relative px-8 py-3 flex items-center justify-between gap-4 max-w-7xl mx-auto">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all bg-primary/10 border-primary/20 text-primary">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Đã chọn</span>
                            <span className="text-sm font-black">{selectedChapters.length}</span>
                            <span className="text-[10px] opacity-60">chương</span>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedChapters([])}
                        className="text-muted-foreground hover:text-foreground text-xs font-bold transition-colors"
                    >
                        <X className="mr-1.5 h-3.5 w-3.5" />
                        Hủy chọn
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border/40 gap-1">
                        <Button
                            size="sm"
                            onClick={() => setTranslateDialogOpen(true)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-9 px-6 rounded-lg shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 gap-2"
                        >
                            <FileText className="h-4 w-4" />
                            <span>{selectedChapters.length > 1 ? "Dịch hàng loạt" : "Dịch chương"}</span>
                        </Button>

                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                const targetChapters = filtered.filter(c => selectedChapters.includes(c.id!));
                                const combinedText = targetChapters.map(c => c.content_original).join("\n\n---\n\n");
                                setTempScanText(combinedText);
                                setScanConfigOpen(true);
                            }}
                            disabled={isAIExtracting}
                            className="font-bold h-9 px-4 rounded-lg gap-2 transition-colors text-muted-foreground hover:bg-muted/80"
                        >
                            {isAIExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            <span className="hidden sm:inline">Quét Thuật Ngữ</span>
                        </Button>
                    </div>

                    <div className="w-px h-6 bg-border/50 mx-1" />

                    <div className="flex items-center gap-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleBulkClearTranslation}
                                    className="h-9 w-9 text-orange-500 hover:text-orange-600 hover:bg-orange-500/10 rounded-lg transition-colors"
                                >
                                    <Eraser className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Reset bản dịch ({selectedChapters.length} chương)</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setBulkDeleteConfirmOpen(true)}
                                    className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Xóa vĩnh viễn (Không thể hoàn tác)</TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            </div>
        </div>
    );
}
