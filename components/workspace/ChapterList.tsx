"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { extractGlossary } from "@/lib/gemini";

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

    const handleScan = async () => {
        if (selectedChapters.length === 0) return;
        toast.info(`Đang quét ${selectedChapters.length} chương...`);

        try {
            const selectedChaps = await db.chapters.where("id").anyOf(selectedChapters).toArray();
            let allChars: any[] = [];
            let allTerms: any[] = [];

            // Process sequentially to avoid rate limits
            for (const chapter of selectedChaps) {
                toast.loading(`Đang quét chương: ${chapter.title}...`, {
                    id: "scanning-toast",
                    icon: <Loader2 className="h-4 w-4 animate-spin text-primary" />
                });
                if (!chapter.content_original) continue;

                const result = await extractGlossary(chapter.content_original, (log: string) => console.log(log));
                if (result) {
                    allChars = [...allChars, ...result.characters];
                    allTerms = [...allTerms, ...result.terms];

                    // Update Chapter Status
                    await db.chapters.update(chapter.id!, { glossaryExtractedAt: new Date() });
                }
            }
            toast.dismiss("scanning-toast");

            if (allChars.length > 0 || allTerms.length > 0) {
                // Deduplicate by original text
                const uniqueChars = Array.from(new Map(allChars.map(item => [item.original, item])).values());
                const uniqueTerms = Array.from(new Map(allTerms.map(item => [item.original, item])).values());

                // Get existing dictionary to exclude existing items
                const dictionary = await db.dictionary.where('workspaceId').equals(workspaceId).toArray();
                const existingOriginals = new Set(dictionary.map(d => d.original.toLowerCase().trim()));

                const finalChars = uniqueChars.filter((c: any) => !existingOriginals.has(c.original.toLowerCase().trim()));
                const finalTerms = uniqueTerms.filter((t: any) => !existingOriginals.has(t.original.toLowerCase().trim()));

                if (finalChars.length === 0 && finalTerms.length === 0) {
                    toast.info("Không tìm thấy thuật ngữ mới nào.");
                    return;
                }

                setReviewData({ chars: finalChars, terms: finalTerms });
                toast.success(`Tìm thấy ${finalChars.length + finalTerms.length} thuật ngữ mới!`);
            } else {
                toast.info("Không tìm thấy thuật ngữ nào.");
            }
        } catch (error) {
            console.error("Scan error:", error);
            toast.error("Lỗi khi quét thuật ngữ.");
            toast.dismiss("scanning-toast");
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
                        workspaceId,
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
                onScan={handleScan}
                workspaceId={workspaceId}
            />

            {viewMode === "grid" ? (
                <ChapterCardGrid
                    chapters={currentChapters}
                    selectedChapters={selectedChapters}
                    toggleSelect={toggleSingleSelection}
                    onRead={setReadingChapterId}
                    onImport={() => fileInputRef.current?.click()}
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
                onSave={async (saveChars, saveTerms, blacklistChars, blacklistTerms) => {
                    // Save to Dictionary
                    const allSave = [...saveChars, ...saveTerms].map(item => ({ ...item, workspaceId }));
                    if (allSave.length > 0) {
                        await db.dictionary.bulkAdd(allSave);
                    }

                    // Save to Blacklist
                    const allBlacklist = [...blacklistChars, ...blacklistTerms];
                    for (const item of allBlacklist) {
                        // Check existing before adding to avoid key constraint errors
                        const existing = await db.blacklist.where({ word: item.original, workspaceId }).first();
                        if (!existing) {
                            await db.blacklist.add({
                                workspaceId,
                                word: item.original,
                                translated: item.translated,
                                source: 'manual',
                                createdAt: new Date()
                            });
                        }
                    }

                    toast.success(`Đã lưu: ${allSave.length} từ vào từ điển, ${allBlacklist.length} từ vào blacklist.`);
                    setReviewData(null);
                }}
            />
        </div>
    );
}
