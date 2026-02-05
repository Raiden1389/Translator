"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2, Book, Zap, Clock, CheckCircle2, Loader2, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAiQueueStatus } from "../hooks/useAiQueueStatus";
import { useRaiden } from "@/components/theme/RaidenProvider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ChapterRowProps {
    id: number;
    order: number;
    title: string;
    title_translated?: string;
    status: 'draft' | 'translated' | 'reviewing';
    hasGlossary: boolean;
    issueCount: number;
    wordCountOriginal?: number;
    translationModel?: string;
    isSelected: boolean;
    isInDrag: boolean;
    isLastRead: boolean;
    hasContent: boolean;
    hasTitle: boolean;

    // Handlers
    onMouseDown: (id: number, e: React.MouseEvent) => void;
    onMouseEnter: (id: number) => void;
    onSelect: (id: number, shiftKey?: boolean) => void;
    onRead: (id: number) => void;
    onDelete: (id: number) => void;
    onInspect: (id: number) => void;
    onClearTranslation: (id: number) => void;
    index: number;
}

export const ChapterRow = React.memo(function ChapterRow({
    id,
    order,
    title,
    title_translated,
    status,
    hasGlossary,
    issueCount,
    wordCountOriginal,
    translationModel,
    isSelected,
    isInDrag,
    isLastRead,
    hasContent,
    hasTitle,
    onMouseDown,
    onMouseEnter,
    onSelect,
    onRead,
    onDelete,
    onInspect,
    onClearTranslation,
    index
}: ChapterRowProps) {
    const { isRaidenMode } = useRaiden();
    const queueStatus = useAiQueueStatus(`translate-chap-${id}`);

    const isRunning = queueStatus === 'running' || queueStatus === 'queued';
    // Fix: queueStatus is a string ('none', 'running', 'queued'). !'none' is false.
    const isTranslated = (status === 'translated' || hasContent || hasTitle) && !isRunning;
    const isDraft = !isTranslated && !isRunning;

    return (
        <div
            className={cn(
                "grid grid-cols-[50px_60px_1fr_1fr_140px_100px] items-center px-4 py-2 border-b transition-all group cursor-pointer h-fit min-h-[50px] relative overflow-hidden",
                isRaidenMode ? "border-slate-800/40" : "border-border/50",
                isSelected || isInDrag
                    ? (isRaidenMode ? "bg-primary/10 border-l-4 border-primary shadow-inner" : "bg-primary/10 border-l-4 border-primary shadow-inner")
                    : (isRaidenMode
                        ? "hover:bg-primary/5 hover:border-l-4 hover:border-primary/50"
                        : (index % 2 === 1 ? "bg-card hover:bg-emerald-500/5 hover:border-l-[6px] hover:border-emerald-500/30" : "bg-muted/20 hover:bg-emerald-500/5 hover:border-l-[6px] hover:border-emerald-500/30")),
                isDraft && "opacity-70 grayscale-[0.3] hover:opacity-100 hover:grayscale-0",
                isLastRead && (isRaidenMode ? "bg-emerald-500/10 border-l-[6px] border-emerald-500/60" : "bg-emerald-50/50 border-l-[6px] border-emerald-500/50 shadow-inner")
            )}
            onMouseDown={(e) => onMouseDown(id, e)}
            onMouseEnter={() => onMouseEnter(id)}
            onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button, a, .cursor-help, [role="checkbox"]')) return;
                onSelect(id, e.shiftKey);
            }}
        >
            <div className="flex justify-center">
                <Checkbox
                    checked={isSelected || isInDrag}
                    onCheckedChange={() => onSelect(id, (window.event as MouseEvent)?.shiftKey)}
                    className={cn(
                        "shadow-sm",
                        isRaidenMode
                            ? "border-slate-600 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                            : "border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    )}
                    onClick={(e) => e.stopPropagation()}
                />
            </div>

            <div className={cn("text-center font-mono text-[10px]", isRaidenMode ? "text-slate-600" : "text-slate-400")}>
                #{order}
            </div>

            <div className={cn("font-bold truncate select-text", isRaidenMode ? "text-slate-200" : "text-slate-900")}>
                <button
                    onClick={(e) => { e.stopPropagation(); onRead(id); }}
                    className={cn("transition-colors block w-full text-left truncate font-serif text-base", isRaidenMode ? "hover:text-purple-400" : "hover:text-blue-600")}
                >
                    <div className="flex items-center gap-2 truncate">
                        {hasGlossary && (
                            <Book className={cn("w-3 h-3 shrink-0", isRaidenMode ? "text-purple-500/60" : "text-blue-500/60")} />
                        )}
                        <span className="truncate">{title.replace(/<br\s*\/?>/gi, " ")}</span>
                    </div>
                </button>
            </div>

            <div className={cn("truncate", isRaidenMode ? "text-slate-400" : "text-slate-600")}>
                <button
                    onClick={(e) => { e.stopPropagation(); onRead(id); }}
                    className={cn("transition-colors block w-full text-left truncate italic text-sm font-medium", isRaidenMode ? "hover:text-purple-300" : "hover:text-blue-600")}
                >
                    {(title_translated || "—").replace(/<br\s*\/?>/gi, " ")}
                </button>
            </div>


            <div className="flex flex-col items-center justify-center gap-0.5">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span
                            className={cn(
                                "inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-tighter cursor-help gap-1 shadow-xs",
                                isRunning ? (isRaidenMode ? "bg-purple-900/20 text-purple-400 border-purple-800/30 animate-pulse" : "bg-blue-50 text-blue-600 border-blue-200 animate-pulse") :
                                    isTranslated ? (isRaidenMode ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/30" : "bg-emerald-50 text-emerald-700 border-emerald-200/50") :
                                        (isRaidenMode ? "bg-slate-800 text-slate-500 border-slate-700" : "bg-gray-100/50 text-gray-500 border-gray-200")
                            )}
                        >
                            {isRunning ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> :
                                isTranslated ? <CheckCircle2 className="w-2.5 h-2.5 opacity-80" /> : <Clock className="w-2.5 h-2.5 opacity-40" />}
                            {isRunning ? (queueStatus === 'running' ? "Đang dịch" : "Xếp hàng") :
                                isTranslated ? "Đã dịch" : "Chờ dịch"}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        {isTranslated ? `Model: ${translationModel} | Words: ${wordCountOriginal?.toLocaleString()}` : `Chờ dịch | Words: ${wordCountOriginal?.toLocaleString()}`}
                    </TooltipContent>
                </Tooltip>
                {issueCount > 0 && (
                    <span className="text-[8px] text-rose-500 font-black animate-pulse uppercase">
                        {issueCount} LỖI
                    </span>
                )}
            </div>

            <div className="flex items-center justify-end gap-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-7 w-7", isRaidenMode ? "text-slate-500 hover:text-purple-400 hover:bg-purple-500/10" : "text-slate-400 hover:text-primary hover:bg-blue-50")}
                            onClick={(e) => { e.stopPropagation(); onInspect(id); }}
                            disabled={!isTranslated}
                        >
                            <Zap className="h-3.5 w-3.5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Soi lỗi logic/dịch thuật bằng AI</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-7 w-7", isRaidenMode ? "text-slate-500 hover:text-amber-400 hover:bg-amber-500/10" : "text-slate-400 hover:text-amber-600 hover:bg-amber-50")}
                            onClick={(e) => { e.stopPropagation(); onClearTranslation(id); }}
                        >
                            <Eraser className="h-3.5 w-3.5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Xóa bản dịch (giữ bản gốc)</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-7 w-7", isRaidenMode ? "text-slate-500 hover:text-rose-500 hover:bg-rose-500/10" : "text-slate-400 hover:text-rose-500 hover:bg-rose-50")}
                            onClick={(e) => { e.stopPropagation(); onDelete(id); }}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Xóa vĩnh viễn chương này</TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
});

ChapterRow.displayName = "ChapterRow";
