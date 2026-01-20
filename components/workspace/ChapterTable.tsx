"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, Book } from "lucide-react";
import { db, type Chapter } from "@/lib/db";
import { ChapterRow } from "./ChapterRow";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ChapterTableProps {
    chapters: Chapter[];
    selectedChapters: number[];
    setSelectedChapters: (ids: number[]) => void;
    toggleSelect: (id: number) => void;

    // Selection handlers
    onSelectPage: () => void;
    onSelectGlobal: () => void;
    onDeselectAll: () => void;

    // Actions
    onRead: (id: number) => void;
    onInspect: (id: number) => void;
    onApplyCorrections: () => void;
}

export function ChapterTable({
    chapters,
    selectedChapters,
    setSelectedChapters,
    toggleSelect,
    onSelectPage,
    onSelectGlobal,
    onDeselectAll,
    onRead,
    onInspect,
    onApplyCorrections
}: ChapterTableProps) {
    // Refs for Drag Logic
    const isLeftMouseDownRef = useRef(false);
    const dragStartIdRef = useRef<number | null>(null);
    const isDraggingRef = useRef(false);

    // Global Mouse Up to reset
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            isLeftMouseDownRef.current = false;
            isDraggingRef.current = false;
            dragStartIdRef.current = null;
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    // Handle Mouse Down (Start Anchor)
    const handleMouseDown = useCallback((id: number, e: React.MouseEvent) => {
        // Right Click: Clear Selection
        if (e.button === 2) {
            setSelectedChapters([]);
            return;
        }

        // Left Click: Set Anchor
        if (e.button === 0) {
            isLeftMouseDownRef.current = true;
            isDraggingRef.current = false; // Not dragging yet
            dragStartIdRef.current = id;
        }
    }, [setSelectedChapters]);

    // Handle Mouse Enter (Update Selection Range)
    const handleMouseEnter = useCallback((id: number) => {
        // 1. Must be holding Left Mouse
        if (!isLeftMouseDownRef.current) return;

        // 2. Must have valid Start Anchor
        if (dragStartIdRef.current === null) return;

        // 3. JITTER THRESHOLD: If we are still on the same row where we started, IGNORE.
        // This prevents "Drag" logic from kicking in for micro-movements on the same row.
        if (id === dragStartIdRef.current) return;

        // 4. NOW we are dragging
        isDraggingRef.current = true;

        const startIndex = chapters.findIndex(c => c.id === dragStartIdRef.current);
        const currentIndex = chapters.findIndex(c => c.id === id);

        if (startIndex === -1 || currentIndex === -1) return;

        // Calculate Range strictly between Start and Current
        const start = Math.min(startIndex, currentIndex);
        const end = Math.max(startIndex, currentIndex);

        const newSelectedIds: number[] = [];
        for (let i = start; i <= end; i++) {
            if (chapters[i]?.id) {
                newSelectedIds.push(chapters[i].id!);
            }
        }

        // Apply Selection
        setSelectedChapters(newSelectedIds);

    }, [chapters, setSelectedChapters]);

    const handleDelete = useCallback(async (id: number) => {
        if (confirm("Xóa chương này?")) {
            await db.chapters.delete(id);
        }
    }, []);

    const isPageAllSelected = chapters.length > 0 && chapters.every(c => selectedChapters.includes(c.id!));
    const isPageSomeSelected = chapters.some(c => selectedChapters.includes(c.id!));

    return (
        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px] p-2">
                            <div className="flex items-center gap-1">
                                <Checkbox
                                    checked={isPageAllSelected || (isPageSomeSelected && "indeterminate")}
                                    onCheckedChange={() => {
                                        if (isPageAllSelected) {
                                            const pageIds = new Set(chapters.map(c => c.id!));
                                            setSelectedChapters(selectedChapters.filter(id => !pageIds.has(id)));
                                        } else {
                                            onSelectPage();
                                        }
                                    }}
                                />
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
                                            <ChevronDown className="h-4 w-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-56 p-1" align="start">
                                        <div className="grid gap-1">
                                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                                Lựa chọn ({selectedChapters.length})
                                            </div>
                                            <Button variant="ghost" size="sm" className="justify-start font-normal text-xs" onClick={onSelectPage}>
                                                Chọn trang này ({chapters.length})
                                            </Button>
                                            <Button variant="ghost" size="sm" className="justify-start font-normal text-xs" onClick={onSelectGlobal}>
                                                Chọn TẤT CẢ (Global)
                                            </Button>
                                            <div className="h-px bg-border my-1" />
                                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                                Thao tác hàng loạt
                                            </div>
                                            <Button variant="ghost" size="sm" className="justify-start font-normal text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10" onClick={onApplyCorrections}>
                                                <Book className="mr-2 h-3 w-3" />
                                                Áp dụng Cải chính (Fix Names)
                                            </Button>
                                            <div className="h-px bg-border my-1" />
                                            <Button variant="ghost" size="sm" className="justify-start font-normal text-xs text-destructive hover:text-destructive" onClick={onDeselectAll}>
                                                Bỏ chọn tất cả
                                            </Button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </TableHead>
                        <TableHead className="w-[60px] text-center text-muted-foreground font-black whitespace-nowrap">C.#</TableHead>
                        <TableHead className="text-muted-foreground font-black whitespace-nowrap">Tiêu đề</TableHead>
                        <TableHead className="text-muted-foreground font-black whitespace-nowrap">Tiêu đề dịch</TableHead>
                        <TableHead className="w-[120px] text-center text-muted-foreground font-black whitespace-nowrap">Trạng thái</TableHead>
                        <TableHead className="w-[100px] text-center text-muted-foreground font-black whitespace-nowrap">Từ gốc</TableHead>
                        <TableHead className="w-[100px] text-center text-muted-foreground font-black whitespace-nowrap">Từ dịch</TableHead>
                        <TableHead className="w-[80px] text-right text-muted-foreground font-black whitespace-nowrap">Hành động</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {chapters.map((chapter) => (
                        <ChapterRow
                            key={chapter.id}
                            chapter={chapter}
                            isSelected={selectedChapters.includes(chapter.id!)}
                            isInDrag={false} // Removed ref access, relying on isSelected update
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
