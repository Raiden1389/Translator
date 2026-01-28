"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, Book } from "lucide-react";
import { type Chapter } from "@/lib/db";
import { ChapterRow } from "./ChapterRow";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useChapterTable } from "./hooks/useChapterTable";

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
    onClearTranslation: (id: number) => void;
    onApplyCorrections: () => void;
    lastReadChapterId?: number;
}

export function ChapterTable(props: ChapterTableProps) {
    const {
        chapters, selectedChapters, setSelectedChapters, toggleSelect,
        onSelectPage, onSelectGlobal, onDeselectAll,
        onRead, onInspect, onClearTranslation, onApplyCorrections,
        lastReadChapterId
    } = props;

    const parentRef = useRef<HTMLDivElement>(null);

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
        <div className="rounded-xl border bg-card overflow-hidden flex flex-col h-[70vh]">
            {/* Virtualized Header - Sticky Grid */}
            <div className="grid grid-cols-[50px_60px_1fr_1fr_140px_100px] bg-muted/50 border-b py-3 px-4 font-black text-[10px] uppercase tracking-widest text-muted-foreground z-20 shrink-0">
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
                                <Button variant="ghost" size="sm" className="justify-start font-normal text-xs text-blue-400" onClick={onApplyCorrections}>
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
                                    onMouseDown={handleMouseDown}
                                    onMouseEnter={handleMouseEnter}
                                    toggleSelect={toggleSelect}
                                    onRead={onRead}
                                    onDelete={handleDelete}
                                    onInspect={onInspect}
                                    onClearTranslation={onClearTranslation}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
