"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { ChapterListHeader } from "./ChapterListHeader";
import { ChapterTable } from "./ChapterTable";
import { ChapterCardGrid } from "./ChapterCardGrid";
import { ReaderModal } from "./ReaderModal";
import { ImportProgressOverlay } from "./ImportProgressOverlay";
import { TranslationProgressOverlay } from "./TranslationProgressOverlay";
import { TranslateConfigDialog } from "./TranslateConfigDialog";
import { useChapterSelection } from "./hooks/useChapterSelection";
import { useChapterImport } from "./hooks/useChapterImport";
import { useBatchTranslate } from "./hooks/useBatchTranslate";
import { usePersistedState } from "@/lib/hooks/usePersistedState";

import { ReviewDialog } from "./ReviewDialog";

interface ChapterListProps {
    workspaceId: string;
}

export function ChapterList({ workspaceId }: ChapterListProps) {
    const chapters = useLiveQuery(
        () => db.chapters.where("workspaceId").equals(workspaceId).sortBy("order"),
        [workspaceId]
    );

    const [search, setSearch] = useState("");
    const [readingChapterId, setReadingChapterId] = useState<number | null>(null);
    const [filterStatus, setFilterStatus] = usePersistedState<"all" | "draft" | "translated">(`workspace-${workspaceId}-filter`, "all");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = usePersistedState(`workspace-${workspaceId}-perPage`, 50);
    const [viewMode, setViewMode] = usePersistedState<"grid" | "table">(`workspace-${workspaceId}-viewMode`, "grid");
    const [translateDialogOpen, setTranslateDialogOpen] = useState(false);
    const [reviewData, setReviewData] = useState<{ chars: any[], terms: any[] } | null>(null);

    // Filtered Content
    const filtered = useMemo(() => {
        if (!chapters) return [];
        return chapters.filter(c => {
            const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = filterStatus === "all" || c.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [chapters, search, filterStatus]);

    // Hooks
    const {
        selectedChapters,
        setSelectedChapters,
        toggleSelectAll,
        toggleSingleSelection
    } = useChapterSelection(filtered.map(c => c.id!));

    const {
        importing,
        progress: importProgress,
        importStatus,
        fileInputRef,
        importInputRef,
        handleFileUpload,
        handleImportJSON
    } = useChapterImport(workspaceId, chapters?.length || 0);

    const {
        isTranslating,
        batchProgress,
        handleBatchTranslate
    } = useBatchTranslate();

    // Pagination
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const currentChapters = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filtered.slice(start, start + itemsPerPage);
    }, [filtered, currentPage, itemsPerPage]);

    useEffect(() => { setCurrentPage(1); }, [search, filterStatus]);

    // Handlers
    const handleExport = async () => {
        const selectedIds = selectedChapters.length > 0 ? selectedChapters : filtered.map(c => c.id!);
        if (selectedIds.length === 0) return toast.error("Không có gì để xuất.");
        const data = await db.chapters.bulkGet(selectedIds);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `workspace-export-${new Date().getTime()}.json`;
        a.click();
    };

    const handleSelectRange = (rangeStr: string) => {
        if (!rangeStr.trim()) return;

        const parts = rangeStr.split(',').map(p => p.trim());
        const selectedOrders = new Set<number>();

        parts.forEach(part => {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(num => parseInt(num.trim()));
                if (!isNaN(start) && !isNaN(end)) {
                    const min = Math.min(start, end);
                    const max = Math.max(start, end);
                    for (let i = min; i <= max; i++) {
                        selectedOrders.add(i);
                    }
                }
            } else {
                const num = parseInt(part);
                if (!isNaN(num)) {
                    selectedOrders.add(num);
                }
            }
        });

        const newSelectedIds = filtered
            .filter(c => selectedOrders.has(c.order))
            .map(c => c.id!);

        if (newSelectedIds.length > 0) {
            setSelectedChapters(newSelectedIds);
            toast.success(`Đã chọn ${newSelectedIds.length} chương`);
        } else {
            toast.error(`Không tìm thấy chương nào trong khoảng "${rangeStr}"`);
        }
    };

    if (!chapters) return <div className="p-10 text-center text-white/50 animate-pulse">Loading workspace...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative pb-10">
            <ImportProgressOverlay importing={importing} progress={importProgress} importStatus={importStatus} />

            <TranslationProgressOverlay isTranslating={isTranslating} progress={batchProgress} />

            <TranslateConfigDialog
                open={translateDialogOpen}
                onOpenChange={setTranslateDialogOpen}
                selectedCount={selectedChapters.length}
                onStart={(config, settings) => {
                    setTranslateDialogOpen(false);
                    handleBatchTranslate({
                        chapters: filtered,
                        selectedChapters,
                        currentSettings: settings,
                        translateConfig: config,
                        onReviewNeeded: (chars, terms) => setReviewData({ chars, terms })
                    });
                }}
            />

            <ChapterListHeader
                totalChapters={chapters.length}
                searchTerm={search}
                setSearchTerm={setSearch}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
                selectedChapters={selectedChapters}
                setSelectedChapters={setSelectedChapters}
                onExport={handleExport}
                onImport={() => importInputRef.current?.click()}
                onTranslate={() => setTranslateDialogOpen(true)}
                importInputRef={importInputRef}
                fileInputRef={fileInputRef}
                onFileUpload={handleFileUpload}
                onImportJSON={handleImportJSON}
                importing={importing}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onSelectRange={handleSelectRange}
            />

            {viewMode === "grid" ? (
                <ChapterCardGrid
                    chapters={currentChapters}
                    selectedChapters={selectedChapters}
                    toggleSelect={toggleSingleSelection}
                    onRead={setReadingChapterId}
                />
            ) : (
                <ChapterTable
                    chapters={currentChapters}
                    selectedChapters={selectedChapters}
                    setSelectedChapters={setSelectedChapters}
                    toggleSelect={toggleSingleSelection}
                    toggleSelectAll={() => toggleSelectAll(filtered.map(c => c.id!))}
                    onRead={setReadingChapterId}
                    allChapterIds={filtered.map(c => c.id!)}
                />
            )}

            {readingChapterId && (
                <ReaderModal
                    chapterId={readingChapterId}
                    isOpen={!!readingChapterId}
                    onClose={() => setReadingChapterId(null)}
                    workspaceChapters={filtered}
                    hasPrev={filtered.findIndex(c => c.id === readingChapterId) > 0}
                    hasNext={filtered.findIndex(c => c.id === readingChapterId) < filtered.length - 1}
                    onPrev={() => {
                        const idx = filtered.findIndex(c => c.id === readingChapterId);
                        if (idx > 0) setReadingChapterId(filtered[idx - 1].id!);
                    }}
                    onNext={() => {
                        const idx = filtered.findIndex(c => c.id === readingChapterId);
                        if (idx < filtered.length - 1) setReadingChapterId(filtered[idx + 1].id!);
                    }}
                />
            )}

            <ReviewDialog
                open={!!reviewData}
                onOpenChange={(v) => !v && setReviewData(null)}
                characters={reviewData?.chars || []}
                terms={reviewData?.terms || []}
                onSave={async (chars, terms) => {
                    await db.dictionary.bulkAdd([...chars, ...terms]);
                    toast.success("Đã lưu vào từ điển!");
                    setReviewData(null);
                }}
            />
        </div>
    );
}
