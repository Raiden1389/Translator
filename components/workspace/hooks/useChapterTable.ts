"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Chapter } from "@/lib/db";
import { deleteChapter } from "@/lib/services/chapter.service";

interface UseChapterTableParams {
    chapters: Chapter[];
    selectedChapters: number[];
    setSelectedChapters: (ids: number[]) => void;
}

export function useChapterTable({ chapters, selectedChapters, setSelectedChapters }: UseChapterTableParams) {
    const isLeftMouseDownRef = useRef(false);
    const dragStartIdRef = useRef<number | null>(null);
    const isDraggingRef = useRef(false);

    const chapterIndexMap = useMemo(() => {
        const map = new Map<number, number>();
        chapters.forEach((c, i) => map.set(c.id!, i));
        return map;
    }, [chapters]);

    const selectedSet = useMemo(() => new Set(selectedChapters), [selectedChapters]);

    useEffect(() => {
        const handleGlobalMouseUp = () => {
            isLeftMouseDownRef.current = false;
            isDraggingRef.current = false;
            dragStartIdRef.current = null;
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    const handleMouseDown = useCallback((id: number, e: React.MouseEvent) => {
        if (e.button === 2) {
            setSelectedChapters([]);
            return;
        }
        if (e.button === 0) {
            isLeftMouseDownRef.current = true;
            isDraggingRef.current = false;
            dragStartIdRef.current = id;
        }
    }, [setSelectedChapters]);

    const handleMouseEnter = useCallback((id: number) => {
        if (!isLeftMouseDownRef.current || dragStartIdRef.current === null || id === dragStartIdRef.current) return;
        isDraggingRef.current = true;

        const startIndex = chapterIndexMap.get(dragStartIdRef.current!);
        const currentIndex = chapterIndexMap.get(id);

        if (startIndex === undefined || currentIndex === undefined) return;

        const start = Math.min(startIndex, currentIndex);
        const end = Math.max(startIndex, currentIndex);

        const newSelectedIds: number[] = [];
        for (let i = start; i <= end; i++) {
            if (chapters[i]?.id) {
                newSelectedIds.push(chapters[i].id!);
            }
        }
        setSelectedChapters(newSelectedIds);
    }, [chapters, chapterIndexMap, setSelectedChapters]);

    const handleDelete = useCallback(async (id: number) => {
        if (confirm("Xóa chương này?")) {
            await deleteChapter(id);
        }
    }, []);

    const isPageAllSelected = chapters.length > 0 && chapters.every(c => selectedSet.has(c.id!));
    const isPageSomeSelected = chapters.some(c => selectedSet.has(c.id!));

    return {
        state: {
            selectedSet,
            isPageAllSelected,
            isPageSomeSelected
        },
        actions: {
            handleMouseDown,
            handleMouseEnter,
            handleDelete
        }
    };
}
