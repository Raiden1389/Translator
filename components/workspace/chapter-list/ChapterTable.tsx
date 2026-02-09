"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, Book } from "lucide-react";
import { type Chapter } from "@/lib/db";
import { type AiQueueState } from "@/lib/services/ai-queue";
import { ChapterRow } from "./ChapterRow";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useChapterTable } from "../hooks/useChapterTable";
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

interface ChapterTableProps {
    chapters: Chapter[];
    selectedChapters: number[];
    queueState: AiQueueState;
    setSelectedChapters: (ids: number[]) => void;
    onSelect: (id: number, shiftKey?: boolean) => void;

    // Selection handlers
    onSelectPage: () => void;
    onSelectGlobal: () => void;
    onDeselectAll: () => void;

    // Actions
    onRead: (id: number) => void;
    onInspect: (id: number) => void;
    onClearTranslation: (id: number) => void;
    onApplyCorrections: () => void;
    lastReadChapterId?: number;
}

export const ChapterTable = React.memo(function ChapterTable(props: ChapterTableProps) {
    const {
        chapters, selectedChapters, queueState, setSelectedChapters, onSelect,
        onSelectPage, onSelectGlobal, onDeselectAll,
        onRead, onInspect, onClearTranslation, onApplyCorrections,
        lastReadChapterId
    } = props;

    const parentRef = useRef<HTMLDivElement>(null);

    const [deleteId, setDeleteId] = React.useState<number | null>(null);

    const { state, actions } = useChapterTable({
        chapters,
        selectedChapters,
        setSelectedChapters
    });

    const { selectedSet, isPageAllSelected, isPageSomeSelected } = state;
    const { handleMouseDown, handleMouseEnter, handleDelete } = actions;

    // Virtualizer for ultra-high performance in large books
    const rowVirtualizer = useVirtualizer({
        count: chapters.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 52,
        overscan: 10,
    });

    return (
        <div className="border border-border bg-muted/40 overflow-hidden flex flex-col h-[75vh] shadow-sm rounded-xl transition-all duration-500">
            {/* Virtualized Header - Sticky Grid */}
            <div className="grid grid-cols-[50px_60px_1fr_1fr_140px_100px] bg-muted border-b-2 border-border/80 py-3 px-4 shadow-sm font-semibold text-[10px] uppercase tracking-widest text-muted-foreground z-20 shrink-0 transition-all duration-500">
                <div className="flex items-center gap-1">
                    <Checkbox
                        checked={isPageAllSelected || (isPageSomeSelected && "indeterminate")}
                        onCheckedChange={() => isPageAllSelected ? onDeselectAll() : onSelectPage()}
                    />
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground">
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-1" align="start">
                            <div className="grid gap-1">
                                <Button variant="ghost" size="sm" className="justify-start font-normal text-xs" onClick={onSelectPage}>Chọn trang này</Button>
                                <Button variant="ghost" size="sm" className="justify-start font-normal text-xs" onClick={onSelectGlobal}>Chọn TẤT CẢ</Button>
                                <div className="h-px bg-border my-1" />
                                <Button variant="ghost" size="sm" className="justify-start font-normal text-xs text-primary" onClick={onApplyCorrections}>
                                    <Book className="mr-2 h-3 w-3" /> Áp dụng Cải chính
                                </Button>
                                <Button variant="ghost" size="sm" className="justify-start font-normal text-xs text-destructive" onClick={onDeselectAll}>Bỏ chọn tất cả</Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="text-center">C.#</div>
                <div>Tiêu đề</div>
                <div>Tiêu đề dịch</div>
                <div className="text-center">Trạng thái</div>
                <div className="text-right pr-4">Hành động</div>
            </div>

            {/* Scrollable Virtual Body */}
            <div
                ref={parentRef}
                className="flex-1 overflow-auto custom-scrollbar relative"
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
                                }}
                            >
                                <ChapterRow
                                    id={chapter.id!}
                                    order={chapter.order}
                                    index={virtualRow.index}
                                    title={chapter.title}
                                    title_translated={chapter.title_translated}
                                    status={chapter.status || 'draft'}
                                    hasGlossary={!!chapter.glossaryExtractedAt}
                                    issueCount={chapter.inspectionResults?.length || 0}
                                    wordCountOriginal={chapter.wordCountOriginal}
                                    translationModel={chapter.translationModel}
                                    isSelected={selectedSet.has(chapter.id!)}
                                    isInDrag={false}
                                    isLastRead={lastReadChapterId === chapter.id}
                                    hasContent={!!chapter.content_translated && chapter.content_translated.length > 0}
                                    hasTitle={!!chapter.title_translated && chapter.title_translated.length > 0}
                                    queueStatus={
                                        queueState.runningIds.includes(`translate-chap-${chapter.id}`) ? 'running' :
                                            queueState.pendingIds.includes(`translate-chap-${chapter.id}`) ? 'queued' : 'none'
                                    }
                                    onMouseDown={handleMouseDown}
                                    onMouseEnter={handleMouseEnter}
                                    onSelect={onSelect}
                                    onRead={onRead}
                                    onDelete={(id) => setDeleteId(id)}
                                    onInspect={onInspect}
                                    onClearTranslation={onClearTranslation}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="max-w-[400px] rounded-3xl border-destructive/20 shadow-2xl">
                    <AlertDialogHeader className="items-center text-center">
                        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
                            <AlertTriangle className="h-8 w-8 text-destructive animate-bounce" />
                        </div>
                        <AlertDialogTitle className="text-xl font-bold text-foreground">Xác nhận xóa chương?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            Bạn sắp xóa vĩnh viễn chương truyện này khỏi thư viện. Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-center gap-2 pt-4">
                        <AlertDialogCancel className="rounded-2xl border-border text-muted-foreground hover:bg-muted px-8">Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                if (deleteId) {
                                    await handleDelete(deleteId);
                                    setDeleteId(null);
                                }
                            }}
                            className="rounded-2xl bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0 px-8 shadow-lg shadow-destructive/20"
                        >
                            Xác nhận Xóa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
});
