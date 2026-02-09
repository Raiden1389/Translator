"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    BookOpen, Zap, ShieldCheck, AlertCircle, Clock, Eraser
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { vi } from "date-fns/locale";


// Inline Badge component
const Badge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border", className)}>
        {children}
    </span>
);

interface ChapterCardProps {
    id: number;
    order: number;
    title: string;
    title_translated?: string;
    status: 'draft' | 'translated' | 'reviewing';
    issueCount: number;
    lastTranslatedAtTime?: number;
    translationDurationMs?: number;
    wordCountOriginal?: number;
    isSelected: boolean;
    isLastRead: boolean;
    hasContent: boolean;
    hasTitle: boolean;

    // Handlers
    onSelect: (checked: boolean, shiftKey?: boolean) => void;
    onRead: () => void;
    onTranslate: () => void;
    onInspect: () => void;
    onClearTranslation: () => void;
    onDelete: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    onMouseEnter?: () => void;
}

export const ChapterCard = React.memo(function ChapterCard({
    order,
    title,
    title_translated,
    status,
    issueCount,
    lastTranslatedAtTime,
    wordCountOriginal,
    isSelected,
    isLastRead,
    hasContent,
    hasTitle,
    onSelect,
    onRead,
    onTranslate,
    onInspect,
    onClearTranslation,
    onContextMenu,
    onMouseEnter
}: ChapterCardProps) {


    const isTranslated = status === 'translated' || hasContent || hasTitle;

    return (
        <div
            className={cn(
                "group relative p-4 rounded-2xl border transition-all duration-300 bg-card",
                isSelected
                    ? "border-primary bg-primary/10 shadow-lg scale-[1.01]"
                    : "border-border hover:border-primary/40 hover:bg-accent/50 hover:shadow-lg",
                isLastRead && "ring-2 ring-green-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
            )}
            onContextMenu={onContextMenu}
            onMouseEnter={onMouseEnter}
            onClick={(e) => {
                // If modifier is held, toggle selection instead of reading
                if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
                    onSelect(!isSelected, e.shiftKey);
                    return;
                }
                onRead();
            }}
        >
            {/* Last Read Pulse */}
            {isLastRead && (
                <div className="absolute -top-1.5 -right-1.5 z-10 flex">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                </div>
            )}

            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => onSelect(!!checked, (window.event as MouseEvent)?.shiftKey)}
                        className="mt-1 rounded-md transition-all border-border data-[state=checked]:bg-primary"
                    />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 group/title">
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                                #{order}
                            </span>
                            <h3 className="font-bold text-sm truncate font-serif transition-colors text-foreground group-hover/title:text-primary">
                                {title.replace(/<br\s*\/?>/gi, " ")}
                            </h3>
                        </div>
                        <p className="text-xs truncate italic text-muted-foreground">
                            {(title_translated || "Chưa dịch tiêu đề...").replace(/<br\s*\/?>/gi, " ")}
                        </p>
                    </div>
                </div>

                <Button
                    size="icon"
                    variant="ghost"
                    onClick={onRead}
                    className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10 text-primary"
                >
                    <BookOpen className="h-4 w-4" />
                </Button>
            </div>

            {/* Progress Visualization */}
            <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                    <Badge className={cn(
                        "px-2 py-0.5 rounded-full border-0 gap-1.5",
                        isTranslated
                            ? "bg-green-500/10 text-green-600"
                            : "bg-muted text-muted-foreground"
                    )}>
                        <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isTranslated ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40"
                        )} />
                        {isTranslated ? "Đã hoàn thành" : "Bản thảo"}
                    </Badge>
                    <span className="text-muted-foreground/40">{wordCountOriginal?.toLocaleString() || 0} chữ</span>
                </div>
                <div className="h-1.5 w-full rounded-full overflow-hidden bg-muted">
                    <div
                        className={cn(
                            "h-full transition-all duration-1000 ease-out",
                            isTranslated
                                ? "w-full bg-linear-to-r from-emerald-500 to-emerald-400"
                                : "w-[15%] bg-slate-400/30"
                        )}
                    />
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    {issueCount > 0 && (
                        <div className="flex items-center gap-1 text-[9px] font-black text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-md animate-pulse">
                            <AlertCircle className="h-2.5 w-2.5" />
                            {issueCount} LỖI
                        </div>
                    )}
                    {lastTranslatedAtTime && (
                        <div className="flex items-center gap-1 text-[9px] text-muted-foreground/50">
                            <Clock className="h-2.5 w-2.5" />
                            {format(new Date(lastTranslatedAtTime), "HH:mm", { locale: vi })}
                        </div>
                    )}
                </div>

                {/* Hover Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={onTranslate}
                        className="h-7 w-7 rounded-lg hover:bg-primary/10 text-primary"
                        title="Dịch chương"
                    >
                        <Zap className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={onInspect}
                        className="h-7 w-7 rounded-lg hover:bg-amber-500/10 text-amber-500"
                        title="Soi lỗi"
                    >
                        <ShieldCheck className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={onClearTranslation}
                        className="h-7 w-7 rounded-lg hover:bg-rose-500/10 text-rose-500"
                        title="Reset bản dịch"
                    >
                        <Eraser className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
});

ChapterCard.displayName = "ChapterCard";
