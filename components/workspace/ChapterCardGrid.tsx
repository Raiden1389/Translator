"use client";

import React, { useRef } from "react";
import { ChapterCard } from "./ChapterCard";
import { FileUp } from "lucide-react";
import { db, type Chapter } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { useVirtualizer } from "@tanstack/react-virtual";

interface ChapterCardGridProps {
    chapters: Chapter[];
    selectedChapters: number[];
    toggleSelect: (id: number) => void;
    onRead: (id: number) => void;
    onInspect: (id: number) => void;
    onClearTranslation: (id: number) => void;
    onImport?: () => void;
    lastReadChapterId?: number;
}

export function ChapterCardGrid({
    chapters,
    selectedChapters,
    toggleSelect,
    onRead,
    onInspect,
    onClearTranslation,
    onImport,
    lastReadChapterId
}: ChapterCardGridProps) {
    const parentRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: chapters.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 110, // Cards are roughly this height
        overscan: 5,
    });

    const selectedSet = React.useMemo(() => new Set(selectedChapters), [selectedChapters]);

    if (chapters.length === 0) {
        return (
            <div className="bg-card rounded-xl border border-border shadow-lg p-8">
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
                    <div className="p-6 rounded-3xl bg-muted/50 border border-border shadow-inner">
                        <FileUp className="h-16 w-16 text-muted-foreground/20 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xl font-bold text-foreground">Chưa có chương nào</p>
                        <p className="text-sm text-muted-foreground/60 max-w-sm leading-relaxed">
                            Tải lên file EPUB hoặc TXT để bắt đầu dịch truyện của bạn ngay bây giờ.
                        </p>
                    </div>
                    {onImport && (
                        <Button
                            onClick={onImport}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 rounded-2xl font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 gap-2"
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
        <div className="bg-card rounded-xl border border-border shadow-lg p-2 h-[70vh] flex flex-col overflow-hidden">
            <div
                ref={parentRef}
                className="flex-1 overflow-auto custom-scrollbar relative p-2"
            >
                <div
                    style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const chapter = chapters[virtualRow.index];
                        return (
                            <div
                                key={virtualRow.key}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                    paddingBottom: '8px' // Gap replacement
                                }}
                            >
                                <ChapterCard
                                    id={chapter.id!}
                                    order={chapter.order}
                                    title={chapter.title}
                                    title_translated={chapter.title_translated}
                                    status={chapter.status || 'draft'}
                                    issueCount={chapter.inspectionResults?.length || 0}
                                    lastTranslatedAtTime={chapter.lastTranslatedAt?.getTime()}
                                    translationDurationMs={chapter.translationDurationMs}
                                    wordCountOriginal={chapter.wordCountOriginal}
                                    isSelected={selectedSet.has(chapter.id!)}
                                    isLastRead={lastReadChapterId === chapter.id}
                                    hasContent={!!chapter.content_translated && chapter.content_translated.length > 0}
                                    hasTitle={!!chapter.title_translated && chapter.title_translated.length > 0}
                                    onSelect={() => toggleSelect(chapter.id!)}
                                    onRead={() => onRead(chapter.id!)}
                                    onTranslate={() => {/* Unified batch handler preferred */ }}
                                    onInspect={() => onInspect(chapter.id!)}
                                    onClearTranslation={() => onClearTranslation(chapter.id!)}
                                    onDelete={async () => {
                                        if (confirm("Xóa chương này?")) {
                                            await db.chapters.delete(chapter.id!);
                                        }
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
