"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2, Book, Zap, Clock, CheckCircle2, Loader2, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAiQueueStatus } from "./hooks/useAiQueueStatus";
import { useRaiden } from "@/components/theme/RaidenProvider";

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
    toggleSelect: (id: number) => void;
    onRead: (id: number) => void;
    onDelete: (id: number) => void;
    onInspect: (id: number) => void;
    onClearTranslation: (id: number) => void;
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
    toggleSelect,
    onRead,
    onDelete,
    onInspect,
    onClearTranslation
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
                "grid grid-cols-[50px_60px_1fr_1fr_140px_100px] items-center px-4 border-b transition-all group cursor-pointer h-full text-sm relative",
                isRaidenMode ? "border-slate-800/40" : "border-slate-100",
                isSelected || isInDrag
                    ? (isRaidenMode ? "bg-purple-900/20 hover:bg-purple-900/30" : "bg-indigo-50 hover:bg-indigo-100/50")
                    : (isRaidenMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50"),
                isDraft && "opacity-40 grayscale-[0.5] hover:opacity-100 hover:grayscale-0",
                isLastRead && (isRaidenMode ? "bg-purple-500/5 border-b-purple-500/30 shadow-[inset_0_0_20px_rgba(168,85,247,0.05)]" : "bg-indigo-50/50 border-b-indigo-200")
            )}
            onMouseDown={(e) => onMouseDown(id, e)}
            onMouseEnter={() => onMouseEnter(id)}
            onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button, a, .cursor-help, [role="checkbox"]')) return;
                toggleSelect(id);
            }}
        >
            <div className="flex justify-center">
                <Checkbox
                    checked={isSelected || isInDrag}
                    onCheckedChange={() => toggleSelect(id)}
                    className={cn(
                        "shadow-sm",
                        isRaidenMode
                            ? "border-slate-600 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                            : "border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                    )}
                    onClick={(e) => e.stopPropagation()}
                />
            </div>

            <div className={cn("text-center font-mono text-xs", isRaidenMode ? "text-slate-600" : "text-slate-400")}>
                {order}
            </div>

            <div className={cn("font-bold truncate", isRaidenMode ? "text-slate-200" : "text-slate-900")}>
                <button
                    onClick={(e) => { e.stopPropagation(); onRead(id); }}
                    className={cn("transition-colors block w-full text-left truncate", isRaidenMode ? "hover:text-purple-400" : "hover:text-indigo-600")}
                >
                    <div className="flex items-center gap-2 truncate">
                        {hasGlossary && (
                            <Book className={cn("w-3 h-3 shrink-0", isRaidenMode ? "text-purple-500/60" : "text-indigo-500")} />
                        )}
                        <span className="truncate">{title}</span>
                    </div>
                </button>
            </div>

            <div className={cn("truncate italic", isRaidenMode ? "text-slate-400" : "text-slate-600")}>
                <button
                    onClick={(e) => { e.stopPropagation(); onRead(id); }}
                    className={cn("transition-colors block w-full text-left truncate italic", isRaidenMode ? "hover:text-purple-300" : "hover:text-indigo-600")}
                >
                    {title_translated || "—"}
                </button>
            </div>

            <div className="flex flex-col items-center justify-center gap-0.5">
                <span
                    className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-tight cursor-help gap-1",
                        isRunning ? (isRaidenMode ? "bg-purple-900/20 text-purple-400 border-purple-800/30 animate-pulse" : "bg-indigo-50 text-indigo-600 border-indigo-200 animate-pulse") :
                            isTranslated ? (isRaidenMode ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/30" : "bg-emerald-50 text-emerald-600 border-emerald-200") :
                                (isRaidenMode ? "bg-slate-800 text-slate-500 border-slate-700" : "bg-slate-50 text-slate-500 border-slate-200")
                    )}
                    title={isTranslated ? `Model: ${translationModel} | Words: ${wordCountOriginal?.toLocaleString()}` : `Chờ dịch | Words: ${wordCountOriginal?.toLocaleString()}`}
                >
                    {isRunning ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> :
                        isTranslated ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                    {isRunning ? (queueStatus === 'running' ? "Đang dịch" : "Xếp hàng") :
                        isTranslated ? "Đã dịch" : "Chờ dịch"}
                </span>
                {issueCount > 0 && (
                    <span className="text-[8px] text-rose-500 font-black animate-pulse uppercase">
                        {issueCount} LỖI
                    </span>
                )}
            </div>

            <div className="flex items-center justify-end gap-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-7 w-7", isRaidenMode ? "text-slate-500 hover:text-purple-400 hover:bg-purple-500/10" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50")}
                    onClick={(e) => { e.stopPropagation(); onInspect(id); }}
                    disabled={!isTranslated}
                >
                    <Zap className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-7 w-7", isRaidenMode ? "text-slate-500 hover:text-amber-400 hover:bg-amber-500/10" : "text-slate-400 hover:text-amber-600 hover:bg-amber-50")}
                    onClick={(e) => { e.stopPropagation(); onClearTranslation(id); }}
                    title="Xóa bản dịch (giữ bản gốc)"
                >
                    <Eraser className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-7 w-7", isRaidenMode ? "text-slate-500 hover:text-rose-500 hover:bg-rose-500/10" : "text-slate-400 hover:text-rose-500 hover:bg-rose-50")}
                    onClick={(e) => { e.stopPropagation(); onDelete(id); }}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
});

ChapterRow.displayName = "ChapterRow";
