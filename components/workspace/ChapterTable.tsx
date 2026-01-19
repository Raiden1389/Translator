"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Book } from "lucide-react";
import { cn } from "@/lib/utils";
import { db, type Chapter } from "@/lib/db";
import { ChapterRow } from "./ChapterRow";

interface ChapterTableProps {
    chapters: Chapter[];
    selectedChapters: number[];
    setSelectedChapters?: (ids: number[]) => void;
    toggleSelect: (id: number) => void;
    toggleSelectAll: () => void;
    onRead: (id: number) => void;
    onInspect: (id: number) => void;
    allChapterIds: number[];
}

export function ChapterTable({
    chapters,
    selectedChapters,
    setSelectedChapters,
    toggleSelect,
    toggleSelectAll,
    onRead,
    onInspect
}: ChapterTableProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartId, setDragStartId] = useState<number | null>(null);
    const [dragCurrentId, setDragCurrentId] = useState<number | null>(null);

    // Refs for stale closure prevention in global listeners
    const stateRef = useRef({
        chapters,
        selectedChapters,
        isDragging,
        dragStartId,
        dragCurrentId,
        setSelectedChapters
    });

    // Update ref on render
    useEffect(() => {
        stateRef.current = {
            chapters,
            selectedChapters,
            isDragging,
            dragStartId,
            dragCurrentId,
            setSelectedChapters
        };
    }, [chapters, selectedChapters, isDragging, dragStartId, dragCurrentId, setSelectedChapters]);

    // Global mouse up
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            const state = stateRef.current;
            if (state.isDragging) {
                // Determine selection
                if (state.dragStartId && state.dragCurrentId && state.setSelectedChapters) {
                    const startIndex = state.chapters.findIndex(c => c.id === state.dragStartId);
                    const currentIndex = state.chapters.findIndex(c => c.id === state.dragCurrentId);

                    if (startIndex !== -1 && currentIndex !== -1) {
                        const start = Math.min(startIndex, currentIndex);
                        const end = Math.max(startIndex, currentIndex);
                        const idsInRange = state.chapters.slice(start, end + 1).map(c => c.id!);

                        // Add to existing selection (Union)
                        const newSelection = Array.from(new Set([...state.selectedChapters, ...idsInRange]));
                        state.setSelectedChapters(newSelection);
                    }
                }

                // Reset
                setIsDragging(false);
                setDragStartId(null);
                setDragCurrentId(null);
                document.body.style.userSelect = "";
            }
        };
        window.addEventListener("mouseup", handleGlobalMouseUp);
        return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
    }, []); // Empty dependency! uses ref

    const handleMouseDown = useCallback((id: number, e: React.MouseEvent) => {
        // Allow drag to start anywhere except on actual utility buttons (Trash, etc) or the checkbox itself
        const target = e.target as HTMLElement;
        if (target.closest('[role="checkbox"]') || target.closest('.action-button')) return;

        setIsDragging(true);
        setDragStartId(id);
        setDragCurrentId(id);

        // Disable text selection during drag
        document.body.style.userSelect = "none";
    }, []);

    const handleMouseEnter = useCallback((id: number) => {
        // Read directly from ref to avoid dependency churn, or just trust state since this is React event
        if (stateRef.current.isDragging) {
            setDragCurrentId(id);
        }
    }, []);

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

    const handleDelete = useCallback(async (id: number) => {
        if (confirm("Xóa chương này?")) {
            await db.chapters.delete(id);
        }
    }, []);

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
                    {chapters.map((chapter) => (
                        <ChapterRow
                            key={chapter.id}
                            chapter={chapter}
                            isSelected={selectedChapters.includes(chapter.id!)}
                            isInDrag={isInDragRange(chapter.id!)}
                            onMouseDown={handleMouseDown}
                            onMouseEnter={handleMouseEnter}
                            toggleSelect={toggleSelect}
                            onRead={onRead}
                            onDelete={handleDelete}
                            onInspect={onInspect}
                        />
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
