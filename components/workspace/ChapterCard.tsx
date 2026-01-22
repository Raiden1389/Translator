"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    FileText, BookOpen, Zap, ShieldCheck, AlertCircle, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Chapter } from "@/lib/db";

// Inline Badge component
const Badge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border", className)}>
        {children}
    </span>
);

interface ChapterCardProps {
    chapter: Chapter;
    isSelected: boolean;
    onSelect: (checked: boolean) => void;
    onRead: () => void;
    onTranslate: () => void;
    onInspect: () => void;
    onDelete: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    onMouseEnter?: () => void;
    isDragSelected?: boolean;
}

const statusConfig = {
    draft: {
        label: "Chưa dịch",
        className: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20 raiden-mode:bg-[#a0a0a01a] raiden-mode:text-[#a0a0a0] raiden-mode:border-[#a0a0a033]"
    },
    translated: {
        label: "Đã dịch",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 raiden-mode:bg-[#00ff991a] raiden-mode:text-[#00ff99] raiden-mode:border-[#00ff9933]"
    },
    reviewing: {
        label: "Đang soi",
        className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 raiden-mode:bg-[#ffcc001a] raiden-mode:text-[#ffcc00] raiden-mode:border-[#ffcc0033]"
    }
};

export const ChapterCard = React.memo(function ChapterCard({
    chapter,
    isSelected,
    onSelect,
    onRead,
    onTranslate,
    onInspect,
    onDelete,
    onContextMenu,
    onMouseEnter,
    isDragSelected = false
}: ChapterCardProps) {
    const issueCount = chapter.inspectionResults?.length || 0;
    const status = chapter.status || 'draft';

    return (
        <div
            className={cn(
                "group relative p-3 rounded-lg border transition-all duration-200",
                "bg-card",
                "hover:scale-[1.005] hover:shadow-xl hover:shadow-primary/5",
                isSelected
                    ? "border-primary/50 shadow-lg shadow-primary/10"
                    : "border-border hover:border-primary/30"
            )}
            onContextMenu={onContextMenu}
            onMouseEnter={onMouseEnter}
        >
            {/* Header Row */}
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={onSelect}
                        className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <FileText
                                className="h-4 w-4 text-primary flex-shrink-0 cursor-pointer hover:text-primary/80 transition-colors"
                                onClick={onRead}
                            />
                            <h3 className="font-semibold text-foreground truncate">
                                {chapter.title}
                            </h3>
                        </div>
                        {chapter.title_translated && (
                            <p className="text-xs text-muted-foreground/60 truncate">
                                {chapter.title_translated}
                            </p>
                        )}
                    </div>
                </div>

                {/* Quick Read Button */}
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={onRead}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                    <BookOpen className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {chapter.wordCountOriginal || 0} từ
                </span>

                <Badge className={cn("text-xs border", statusConfig[status].className)}>
                    {statusConfig[status].label}
                </Badge>

                {issueCount > 0 && (
                    <span className="flex items-center gap-1 text-amber-400">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {issueCount} lỗi
                    </span>
                )}
            </div>

            {/* Quick Actions (on hover) */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onTranslate}
                    className="h-6 text-[10px] px-2 text-primary hover:text-primary-foreground hover:bg-primary/90 raiden-mode:hover:bg-primary raiden-mode:hover:text-black"
                >
                    <Zap className="mr-1 h-3 w-3" />
                    Dịch
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onInspect}
                    className="h-6 text-[10px] px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-500/10 raiden-mode:text-[#ffcc00] raiden-mode:hover:bg-[#ffcc00] raiden-mode:hover:text-black"
                >
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    Soi lỗi
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onDelete}
                    className="h-6 text-[10px] px-2 text-destructive hover:text-destructive-foreground hover:bg-destructive raiden-mode:hover:bg-destructive raiden-mode:hover:text-white"
                >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Xóa
                </Button>
            </div>

            {/* Selection Indicator */}
            {isSelected && (
                <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-lg" />
            )}
        </div>
    );
});

ChapterCard.displayName = "ChapterCard";


