"use client";

import React from "react";
import { ChapterCard } from "./ChapterCard";
import { FileUp } from "lucide-react";
import type { Chapter } from "@/lib/db";

interface ChapterCardGridProps {
    chapters: Chapter[];
    selectedChapters: number[];
    onToggleSelect: (id: number) => void;
    onRead: (id: number) => void;
    onTranslate: (id: number) => void;
    onDelete: (id: number) => void;
}

export function ChapterCardGrid({
    chapters,
    selectedChapters,
    onToggleSelect,
    onRead,
    onTranslate,
    onDelete
}: ChapterCardGridProps) {
    if (chapters.length === 0) {
        return (
            <div className="bg-[#1e1e2e] rounded-xl border border-white/10 shadow-lg p-4">
                <div className="flex flex-col items-center justify-center h-[400px] text-white/40">
                    <FileUp className="h-16 w-16 mb-4 opacity-30" />
                    <p className="text-lg">Không tìm thấy chương nào</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#1e1e2e] rounded-xl border border-white/10 shadow-lg p-4">
            <div className="grid grid-cols-1 gap-2">
                {chapters.map((chapter) => (
                    <ChapterCard
                        key={chapter.id}
                        chapter={chapter}
                        isSelected={selectedChapters.includes(chapter.id!)}
                        onSelect={() => onToggleSelect(chapter.id!)}
                        onRead={() => onRead(chapter.id!)}
                        onTranslate={() => onTranslate(chapter.id!)}
                        onInspect={() => {/* TODO: Add inspect functionality */ }}
                        onDelete={() => onDelete(chapter.id!)}
                    />
                ))}
            </div>
        </div>
    );
}
