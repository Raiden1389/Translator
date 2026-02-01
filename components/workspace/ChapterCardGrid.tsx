"use client";

import React, { useRef } from "react";
import { ChapterCard } from "./ChapterCard";
import { FileUp } from "lucide-react";
import { db, type Chapter } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface ChapterCardGridProps {
    chapters: Chapter[];
    selectedChapters: number[];
    onSelect: (id: number, shiftKey?: boolean) => void;
    onRead: (id: number) => void;
    onInspect: (id: number) => void;
    onClearTranslation: (id: number) => void;
    onImport?: () => void;
    lastReadChapterId?: number;
}

export function ChapterCardGrid({
    chapters,
    selectedChapters,
    onSelect,
    onRead,
    onInspect,
    onClearTranslation,
    onImport,
    lastReadChapterId
}: ChapterCardGridProps) {
    const [deleteId, setDeleteId] = React.useState<number | null>(null);
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
                                    lastTranslatedAtTime={chapter.lastTranslatedAt instanceof Date ? chapter.lastTranslatedAt.getTime() : (chapter.lastTranslatedAt ? new Date(chapter.lastTranslatedAt).getTime() : undefined)}
                                    translationDurationMs={chapter.translationDurationMs}
                                    wordCountOriginal={chapter.wordCountOriginal}
                                    isSelected={selectedSet.has(chapter.id!)}
                                    isLastRead={lastReadChapterId === chapter.id}
                                    hasContent={!!chapter.content_translated && chapter.content_translated.length > 0}
                                    hasTitle={!!chapter.title_translated && chapter.title_translated.length > 0}
                                    onSelect={(checked, shiftKey) => onSelect(chapter.id!, shiftKey)}
                                    onRead={() => onRead(chapter.id!)}
                                    onTranslate={() => {/* Unified batch handler preferred */ }}
                                    onInspect={() => onInspect(chapter.id!)}
                                    onClearTranslation={() => onClearTranslation(chapter.id!)}
                                    onDelete={() => setDeleteId(chapter.id!)}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="max-w-[400px] rounded-3xl border-rose-100 shadow-2xl">
                    <AlertDialogHeader className="items-center text-center">
                        <div className="h-16 w-16 rounded-full bg-rose-50 flex items-center justify-center mb-2">
                            <AlertTriangle className="h-8 w-8 text-rose-500 animate-bounce" />
                        </div>
                        <AlertDialogTitle className="text-xl font-bold text-slate-900">Xác nhận xóa chương?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500">
                            Bạn sắp xóa vĩnh viễn chương truyện này khỏi thư viện. Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-center gap-2 pt-4">
                        <AlertDialogCancel className="rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50 px-8">Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                if (deleteId) {
                                    await db.chapters.delete(deleteId);
                                    setDeleteId(null);
                                }
                            }}
                            className="rounded-2xl bg-rose-500 hover:bg-rose-600 text-white border-0 px-8 shadow-lg shadow-rose-200"
                        >
                            Xác nhận Xóa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
