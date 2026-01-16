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
        className: "bg-gray-500/20 text-gray-300 border-gray-500/30"
    },
    translated: {
        label: "Đã dịch",
        className: "bg-green-500/20 text-green-300 border-green-500/30"
    },
    reviewing: {
        label: "Đang soi",
        className: "bg-amber-500/20 text-amber-300 border-amber-500/30"
    }
};

export function ChapterCard({
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
                "bg-gradient-to-br from-[#1e1e2e] to-[#2a2a3e]",
                "hover:scale-[1.005] hover:shadow-xl hover:shadow-primary/10",
                isSelected
                    ? "border-primary/50 shadow-lg shadow-primary/20"
                    : "border-white/10 hover:border-primary/30"
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
                            <h3 className="font-semibold text-white truncate">
                                {chapter.title}
                            </h3>
                        </div>
                        {chapter.title_translated && (
                            <p className="text-xs text-white/40 truncate">
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

            {/* Stats Row */}
            <div className="flex items-center gap-2 text-sm text-white/60 mb-2">
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
                    className="h-6 text-[10px] px-2 text-purple-300 hover:text-purple-200 hover:bg-purple-500/10"
                >
                    <Zap className="mr-1 h-3 w-3" />
                    Dịch
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onInspect}
                    className="h-6 text-[10px] px-2 text-amber-300 hover:text-amber-200 hover:bg-amber-500/10"
                >
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    Soi lỗi
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={onDelete}
                    className="h-6 text-[10px] px-2 text-red-300 hover:text-red-200 hover:bg-red-500/10"
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
}


