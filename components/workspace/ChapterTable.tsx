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
        // Didnt click on button or checkbox
        if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return;

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
        <div className="bg-[#1e1e2e] rounded-xl border border-white/10 shadow-lg overflow-hidden select-none">
            <Table>
                <TableHeader className="bg-[#252538] sticky top-0 z-10">
                    <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="w-[40px] pl-4">
                            <Checkbox
                                checked={chapters.length > 0 && selectedChapters.length === chapters.length}
                                onCheckedChange={toggleSelectAll}
                                className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                        </TableHead>
                        <TableHead className="w-[60px] text-center text-white/60">C.#</TableHead>
                        <TableHead className="text-white/60">Tiêu đề</TableHead>
                        <TableHead className="text-white/60">Tiêu đề dịch</TableHead>
                        <TableHead className="w-[120px] text-center text-white/60">Trạng thái</TableHead>
                        <TableHead className="w-[100px] text-center text-white/60">Từ gốc</TableHead>
                        <TableHead className="w-[100px] text-center text-white/60">Từ dịch</TableHead>
                        <TableHead className="w-[80px] text-right text-white/60">Hành động</TableHead>
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
                                    "border-white/5 transition-colors group cursor-pointer",
                                    isSelected || isInDrag ? "bg-primary/10 hover:bg-primary/20" : "hover:bg-white/5"
                                )}
                                onMouseDown={(e) => handleMouseDown(chapter.id!, e)}
                                onMouseEnter={() => handleMouseEnter(chapter.id!)}
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
                                        className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary pointer-events-none" // Pointer events none to prevent conflict with row click
                                    />
                                </TableCell>
                                <TableCell className="text-center font-mono text-white/50 text-xs text-nowrap">
                                    {chapter.order}
                                </TableCell>
                                <TableCell className="font-medium text-white/90">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onRead(chapter.id!); }}
                                        className="hover:text-primary transition-colors block w-full h-full text-left"
                                    >
                                        <div className="line-clamp-1 text-sm font-bold flex items-center gap-2">
                                            {chapter.glossaryExtractedAt && (
                                                <div
                                                    className="flex items-center gap-1 bg-purple-500/20 px-1.5 py-0.5 rounded text-[10px] text-purple-300 border border-purple-500/30 cursor-help"
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
                                <TableCell className="text-white/70">
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
                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                        )}
                                        title={chapter.status === 'translated'
                                            ? `Model: ${chapter.translationModel || 'N/A'}\nTime: ${chapter.translationDurationMs ? (chapter.translationDurationMs / 1000).toFixed(1) + 's' : 'N/A'}\nDate: ${chapter.lastTranslatedAt ? new Date(chapter.lastTranslatedAt).toLocaleString() : 'N/A'}`
                                            : 'Chưa dịch'
                                        }
                                    >
                                        {chapter.status === 'translated' ? "Đã dịch" : "Chờ dịch"}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center text-xs text-white/50 font-mono">
                                    {chapter.wordCountOriginal?.toLocaleString() || 0}
                                </TableCell>
                                <TableCell className="text-center text-xs text-white/50 font-mono">
                                    {(chapter.wordCountTranslated || (chapter.content_translated ? chapter.content_translated.trim().split(/\s+/).length : 0))?.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-50 group-hover:opacity-100">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-white/50 hover:text-destructive hover:bg-destructive/10"
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
