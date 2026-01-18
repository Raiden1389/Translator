"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Book } from "lucide-react";
import { cn } from "@/lib/utils";
import { db, type Chapter } from "@/lib/db";

interface ChapterTableProps {
    chapters: Chapter[];
    selectedChapters: number[];
    setSelectedChapters?: (ids: number[]) => void;
    toggleSelect: (id: number) => void;
    toggleSelectAll: () => void;
    onRead: (id: number) => void;
    allChapterIds: number[];
}

export function ChapterTable({
    chapters,
    selectedChapters,
    setSelectedChapters,
    toggleSelect,
    toggleSelectAll,
    onRead
}: ChapterTableProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartId, setDragStartId] = useState<number | null>(null);
    const [dragCurrentId, setDragCurrentId] = useState<number | null>(null);

    // Global mouse up to stop dragging if mouse leaves table
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDragging) {
                commitDragSelection();
                setIsDragging(false);
                setDragStartId(null);
                setDragCurrentId(null);
            }
        };
        window.addEventListener("mouseup", handleGlobalMouseUp);
        return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
    }, [isDragging, dragStartId, dragCurrentId]);

    const handleMouseDown = (id: number, e: React.MouseEvent) => {
        // Allow drag to start anywhere except on actual utility buttons (Trash, etc) or the checkbox itself
        const target = e.target as HTMLElement;
        if (target.closest('[role="checkbox"]') || target.closest('.action-button')) return;

        setIsDragging(true);
        setDragStartId(id);
        setDragCurrentId(id);

        // Disable text selection during drag
        document.body.style.userSelect = "none";
    };

    const handleMouseEnter = (id: number) => {
        if (isDragging) {
            setDragCurrentId(id);
        }
    };

    const commitDragSelection = () => {
        if (!dragStartId || !dragCurrentId || !setSelectedChapters) {
            document.body.style.userSelect = "";
            return;
        }

        const startIndex = chapters.findIndex(c => c.id === dragStartId);
        const currentIndex = chapters.findIndex(c => c.id === dragCurrentId);

        if (startIndex === -1 || currentIndex === -1) return;

        const start = Math.min(startIndex, currentIndex);
        const end = Math.max(startIndex, currentIndex);

        const idsInRange = chapters.slice(start, end + 1).map(c => c.id!);

        // Merge with existing selection (union)
        // Or should it REPLACE? standard behavior safely is usually union or toggle.
        // Let's implement UNION for now (add to selection).
        const newSelection = Array.from(new Set([...selectedChapters, ...idsInRange]));
        setSelectedChapters(newSelection);

        document.body.style.userSelect = "";
    };

    // Helper to check if a row is currently in the potential drag range
    const isInDragRange = (id: number) => {
        if (!isDragging || !dragStartId || !dragCurrentId) return false;

        const startIndex = chapters.findIndex(c => c.id === dragStartId);
        const currentIndex = chapters.findIndex(c => c.id === dragCurrentId);
        const targetIndex = chapters.findIndex(c => c.id === id);

        if (startIndex === -1 || currentIndex === -1 || targetIndex === -1) return false;

        const start = Math.min(startIndex, currentIndex);
        const end = Math.max(startIndex, currentIndex);

        return targetIndex >= start && targetIndex <= end;
    };

    return (
        <div className="bg-card rounded-xl border border-border shadow-md overflow-hidden select-none">
            <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10 font-bold">
                    <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="w-[40px] pl-4">
                            <Checkbox
                                checked={chapters.length > 0 && selectedChapters.length === chapters.length}
                                onCheckedChange={toggleSelectAll}
                                className="border-border shadow-sm"
                            />
                        </TableHead>
                        <TableHead className="w-[60px] text-center text-muted-foreground font-black">C.#</TableHead>
                        <TableHead className="text-muted-foreground font-black">Tiêu đề</TableHead>
                        <TableHead className="text-muted-foreground font-black">Tiêu đề dịch</TableHead>
                        <TableHead className="w-[120px] text-center text-muted-foreground font-black">Trạng thái</TableHead>
                        <TableHead className="w-[100px] text-center text-muted-foreground font-black">Từ gốc</TableHead>
                        <TableHead className="w-[100px] text-center text-muted-foreground font-black">Từ dịch</TableHead>
                        <TableHead className="w-[80px] text-right text-muted-foreground font-black">Hành động</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {chapters.map((chapter) => {
                        const isSelected = selectedChapters.includes(chapter.id!);
                        const isInDrag = isInDragRange(chapter.id!);

                        return (
                            <TableRow
                                key={chapter.id}
                                className={cn(
                                    "border-border transition-colors group cursor-pointer",
                                    isSelected || isInDrag
                                        ? "bg-primary/10 hover:bg-primary/15"
                                        : "hover:bg-muted/50"
                                )}
                                onMouseDown={(e) => handleMouseDown(chapter.id!, e)}
                                onMouseEnter={() => handleMouseEnter(chapter.id!)}
                                onClick={(e) => {
                                    // Don't toggle if clicking a button or a link/title specifically handled elsewhere
                                    if ((e.target as HTMLElement).closest('button, a, .cursor-help')) return;
                                    toggleSelect(chapter.id!);
                                }}
                                onContextMenu={(e) => {
                                    if (selectedChapters.length > 0) {
                                        e.preventDefault();
                                        if (setSelectedChapters) setSelectedChapters([]);
                                    }
                                }}
                            >
                                <TableCell className="pl-4">
                                    <Checkbox
                                        checked={isSelected || isInDrag}
                                        onCheckedChange={() => toggleSelect(chapter.id!)}
                                        className="border-border shadow-sm"
                                        onClick={(e) => e.stopPropagation()} // Prevent double trigger with row onClick
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
                                    {(chapter.wordCountTranslated || (chapter.content_translated ? chapter.content_translated.trim().split(/\s+/).length : 0))?.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-50 group-hover:opacity-100">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 action-button"
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (confirm("Xóa chương này?")) {
                                                    await db.chapters.delete(chapter.id!);
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
