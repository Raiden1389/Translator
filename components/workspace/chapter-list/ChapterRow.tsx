"use client";

import React from "react";
import { CheckboxNative } from "@/components/ui/checkbox-native";
import { Button } from "@/components/ui/button";
import { Trash2, Book, Zap, Clock, CheckCircle2, Loader2, Eraser, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EditableTitle } from "./EditableTitle";

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
    queueStatus: 'queued' | 'running' | 'none';

    // Handlers
    onMouseDown: (id: number, e: React.MouseEvent) => void;
    onMouseEnter: (id: number) => void;
    onSelect: (id: number, shiftKey?: boolean) => void;
    onRead: (id: number) => void;
    onDelete: (id: number) => void;
    onInspect: (id: number) => void;
    onRetranslate: (id: number) => void;
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
    onRetranslate,
    onClearTranslation,
    queueStatus,
    index
}: ChapterRowProps) {
    const isRunning = queueStatus === 'running' || queueStatus === 'queued';
    // Fix: queueStatus is a string ('none', 'running', 'queued'). !'none' is false.
    const isTranslated = (status === 'translated' || hasContent || hasTitle) && !isRunning;
    const isDraft = !isTranslated && !isRunning;

    // PERFORMANCE FIX: Memoize className to prevent recalculation on every render
    const rowClassName = React.useMemo(() => cn(
        "grid grid-cols-[50px_60px_1fr_1fr_140px_100px] items-center px-4 py-2 border-b border-border/50 transition-all group cursor-pointer h-fit min-h-[50px] relative overflow-hidden",
        isSelected || isInDrag
            ? "bg-primary/10 border-l-4 border-primary shadow-inner"
            : (index % 2 === 1 ? "bg-card hover:bg-green-500/5 hover:border-l-[6px] hover:border-green-500/30" : "bg-muted/10 hover:bg-green-500/5 hover:border-l-[6px] hover:border-green-500/30"),
        isDraft && "opacity-70 grayscale-[0.3] hover:opacity-100 hover:grayscale-0",
        isLastRead && "bg-green-500/10 border-l-[6px] border-green-500/60"
    ), [isSelected, isInDrag, isDraft, isLastRead, index]);

    // PERFORMANCE FIX: Memoize event handlers
    const handleMouseDownCallback = React.useCallback((e: React.MouseEvent) => {
        onMouseDown(id, e);
    }, [id, onMouseDown]);

    const handleMouseEnterCallback = React.useCallback(() => {
        onMouseEnter(id);
    }, [id, onMouseEnter]);

    const handleClickCallback = React.useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, a, .cursor-help, [role="checkbox"]')) return;
        onSelect(id, e.shiftKey);
    }, [id, onSelect]);

    const handleCheckboxClick = React.useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    const handleReadClick = React.useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onRead(id);
    }, [id, onRead]);

    const handleInspectClick = React.useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onInspect(id);
    }, [id, onInspect]);

    const handleRetranslateClick = React.useCallback((e: React.MouseEvent) => {
        console.log('[ChapterRow] Retranslate clicked for ID:', id);
        e.stopPropagation();
        onRetranslate(id);
    }, [id, onRetranslate]);

    const handleClearClick = React.useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onClearTranslation(id);
    }, [id, onClearTranslation]);

    const handleDeleteClick = React.useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(id);
    }, [id, onDelete]);

    // PERFORMANCE FIX: Memoize ALL classNames to prevent recalculation
    const checkboxClassName = React.useMemo(() => cn(
        "shadow-sm border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
    ), []);

    const orderClassName = React.useMemo(() => cn(
        "text-center font-mono text-[10px] text-muted-foreground"
    ), []);

    const titleClassName = React.useMemo(() => cn(
        "font-bold truncate select-text text-foreground"
    ), []);

    const titleButtonClassName = React.useMemo(() => cn(
        "transition-colors block w-full text-left truncate font-serif text-base hover:text-primary"
    ), []);

    const titleIconClassName = React.useMemo(() => cn(
        "w-3 h-3 shrink-0 text-primary/60"
    ), []);



    const statusBadgeClassName = React.useMemo(() => cn(
        "inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-tighter cursor-help gap-1 shadow-xs",
        isRunning ? "bg-primary/10 text-primary border-primary/30 animate-pulse" :
            isTranslated ? "bg-green-500/10 text-green-600 border-green-500/30" :
                "bg-muted text-muted-foreground border-border"
    ), [isRunning, isTranslated]);

    const inspectButtonClassName = React.useMemo(() => cn(
        "h-7 w-7 text-muted-foreground hover:text-primary hover:bg-accent"
    ), []);

    const clearButtonClassName = React.useMemo(() => cn(
        "h-7 w-7 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
    ), []);

    const deleteButtonClassName = React.useMemo(() => cn(
        "h-7 w-7 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
    ), []);

    return (
        <div
            className={rowClassName}
            onMouseDown={handleMouseDownCallback}
            onMouseEnter={handleMouseEnterCallback}
            onClick={handleClickCallback}
        >
            <div className="flex justify-center">
                <CheckboxNative
                    checked={isSelected || isInDrag}
                    onChange={() => onSelect(id, (window.event as MouseEvent)?.shiftKey)}
                    className={checkboxClassName}
                    onClick={handleCheckboxClick}
                />
            </div>

            <div className={orderClassName}>
                #{order}
            </div>

            <div className={titleClassName}>
                <button
                    onClick={handleReadClick}
                    className={titleButtonClassName}
                >
                    <div className="flex items-center gap-2 truncate">
                        {hasGlossary && (
                            <Book className={titleIconClassName} />
                        )}
                        <span className="truncate">{title.replace(/<br\s*\/?>/gi, " ")}</span>
                    </div>
                </button>
            </div>

            <EditableTitle
                id={id}
                title_translated={title_translated}
                onRead={handleReadClick}
            />


            <div className="flex flex-col items-center justify-center gap-0.5">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className={statusBadgeClassName}>
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
                            className={inspectButtonClassName}
                            onClick={handleInspectClick}
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
                            className={cn(
                                "h-7 w-7 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10",
                                !isTranslated && "opacity-30 cursor-not-allowed"
                            )}
                            onClick={handleRetranslateClick}
                            disabled={!isTranslated}
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Dịch lại chương này</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={clearButtonClassName}
                            onClick={handleClearClick}
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
                            className={deleteButtonClassName}
                            onClick={handleDeleteClick}
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
