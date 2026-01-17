"use client";

import React from "react";
import { ChapterCard } from "./ChapterCard";
import { FileUp } from "lucide-react";
import { db, type Chapter } from "@/lib/db";
import { Button } from "@/components/ui/button";

interface ChapterCardGridProps {
    chapters: Chapter[];
    selectedChapters: number[];
    toggleSelect: (id: number) => void;
    onRead: (id: number) => void;
    onImport?: () => void;
}

export function ChapterCardGrid({
    chapters,
    selectedChapters,
    toggleSelect,
    onRead,
    onImport
}: ChapterCardGridProps) {
    if (chapters.length === 0) {
        return (
            <div className="bg-[#1e1e2e] rounded-xl border border-white/10 shadow-lg p-8">
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
                    <div className="p-6 rounded-3xl bg-white/5 border border-white/10 shadow-inner">
                        <FileUp className="h-16 w-16 text-white/20 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xl font-bold text-white/90">Chưa có chương nào</p>
                        <p className="text-sm text-white/40 max-w-sm leading-relaxed">
                            Tải lên file EPUB hoặc TXT để bắt đầu dịch truyện của bạn ngay bây giờ.
                        </p>
                    </div>
                    {onImport && (
                        <Button
                            onClick={onImport}
                            className="bg-[#6c5ce7] hover:bg-[#a29bfe] text-white px-8 h-12 rounded-2xl font-bold shadow-lg shadow-[#6c5ce7]/20 transition-all hover:scale-105 active:scale-95 gap-2"
                        >
                            <FileUp className="w-5 h-5" />
                            Tải lên ngay
                        </Button>
                    )}
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
                        onSelect={() => toggleSelect(chapter.id!)}
                        onRead={() => onRead(chapter.id!)}
                        onTranslate={() => {/* Handle via multi-select or single translate */ }}
                        onInspect={() => {/* TODO: Add inspect functionality */ }}
                        onDelete={async () => {
                            if (confirm("Xóa chương này?")) {
                                await db.chapters.delete(chapter.id!);
                            }
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
