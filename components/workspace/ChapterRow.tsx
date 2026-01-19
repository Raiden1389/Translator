"use client";

import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash2, Book } from "lucide-react";
import { cn } from "@/lib/utils";
import { Chapter } from "@/lib/db";

interface ChapterRowProps {
    chapter: Chapter;
    isSelected: boolean;
    isInDrag: boolean;
    onMouseDown: (id: number, e: React.MouseEvent) => void;
    onMouseEnter: (id: number) => void;
    toggleSelect: (id: number) => void;
    onRead: (id: number) => void;
    onDelete: (id: number) => void;
}

export const ChapterRow = React.memo(function ChapterRow({
    chapter,
    isSelected,
    isInDrag,
    onMouseDown,
    onMouseEnter,
    toggleSelect,
    onRead,
    onDelete,
}: ChapterRowProps) {
    return (
        <TableRow
            className={cn(
                "border-border transition-colors group cursor-pointer",
                isSelected || isInDrag
                    ? "bg-primary/10 hover:bg-primary/15"
                    : "hover:bg-muted/50"
            )}
            onMouseDown={(e) => onMouseDown(chapter.id!, e)}
            onMouseEnter={() => onMouseEnter(chapter.id!)}
            onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button, a, .cursor-help, [role="checkbox"]')) return;
                toggleSelect(chapter.id!);
            }}
        >
            <TableCell className="pl-4">
                <Checkbox
                    checked={isSelected || isInDrag}
                    onCheckedChange={() => toggleSelect(chapter.id!)}
                    className="border-border shadow-sm"
                    onClick={(e) => e.stopPropagation()}
                />
            </TableCell>
            <TableCell className="text-center font-mono text-muted-foreground/60 text-xs text-nowrap">
                {chapter.order}
            </TableCell>
            <TableCell className="font-bold text-foreground">
                <button
                    onClick={(e) => { e.stopPropagation(); onRead(chapter.id!); }}
                    className="hover:text-primary transition-colors block w-full h-full text-left"
                >
                    <div className="line-clamp-1 text-sm font-bold flex items-center gap-2">
                        {chapter.glossaryExtractedAt && (
                            <div
                                className="flex items-center gap-1 bg-primary/10 px-1.5 py-0.5 rounded text-[10px] text-primary border border-primary/20 cursor-help"
                                title={`Đã trích xuất thuật ngữ: ${new Date(chapter.glossaryExtractedAt).toLocaleString()}`}
                            >
                                <Book className="w-3 h-3" />
                                <span className="hidden xl:inline">Glossary</span>
                            </div>
                        )}
                        {chapter.title}
                    </div>
                </button>
            </TableCell>
            <TableCell className="text-foreground/70">
                <button
                    onClick={(e) => { e.stopPropagation(); onRead(chapter.id!); }}
                    className="hover:text-primary transition-colors block w-full h-full text-left"
                >
                    <div className="line-clamp-1 text-sm italic">{chapter.title_translated || "—"}</div>
                </button>
            </TableCell>
            <TableCell className="text-center">
                <span
                    className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider cursor-help",
                        chapter.status === 'translated'
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-amber-100 text-amber-700 border-amber-200"
                    )}
                    title={chapter.status === 'translated'
                        ? `Model: ${chapter.translationModel || 'N/A'}\nTime: ${chapter.translationDurationMs ? (chapter.translationDurationMs / 1000).toFixed(1) + 's' : 'N/A'}\nDate: ${chapter.lastTranslatedAt ? new Date(chapter.lastTranslatedAt).toLocaleString() : 'N/A'}`
                        : 'Chưa dịch'
                    }
                >
                    {chapter.status === 'translated' ? "Đã dịch" : "Chờ dịch"}
                </span>
            </TableCell>
            <TableCell className="text-center text-xs text-muted-foreground/60 font-mono">
                {chapter.wordCountOriginal?.toLocaleString() || 0}
            </TableCell>
            <TableCell className="text-center text-xs text-muted-foreground/60 font-mono">
                {chapter.wordCountTranslated?.toLocaleString() ||
                    (chapter.content_translated ? chapter.content_translated.trim().split(/\s+/).length : 0).toLocaleString()}
            </TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1 opacity-50 group-hover:opacity-100">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 action-button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(chapter.id!);
                        }}
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
});

ChapterRow.displayName = "ChapterRow";
