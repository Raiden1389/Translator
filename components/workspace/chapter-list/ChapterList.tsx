"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Dexie from "dexie";
import { db, type Chapter } from "@/lib/db";
import { clearChapterTranslation } from "@/lib/services/chapter.service";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ChapterListHeader } from "../shared/ChapterListHeader";
import { ChapterTable } from "./ChapterTable";
import { ChapterCardGrid } from "./ChapterCardGrid";
import { ReaderModal } from "./ReaderModal";
import { ImportProgressOverlay } from "./ImportProgressOverlay";

import { TranslateConfigDialog } from "./TranslateConfigDialog";
import { InspectionDialog } from "./InspectionDialog";
import { HistoryDialog } from "../shared/HistoryDialog";
import { ScanConfigDialog, EntityType } from "../ScanConfigDialog";
import { ReviewDialog } from "../shared/ReviewDialog";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useChapterSelection } from "../hooks/useChapterSelection";
import { useChapterImport } from "../hooks/useChapterImport";
import { usePersistedState } from "@/lib/hooks/usePersistedState";
import { useAIExtraction } from "../editor/hooks/useAIExtraction";

import { inspectChapter } from "@/lib/gemini";
import { applyCorrectionRule } from "@/lib/gemini/text/correction";
import { ReviewData, GlossaryCharacter, GlossaryTerm, TranslationSettings, InspectionIssue } from "@/lib/types"; // Kept ReviewData for prop type

interface ChapterListProps {
    workspaceId: string;
    onShowScanResults: (data: ReviewData) => void;
    onTranslate: (props: {
        workspaceId: string;
        chapters: Chapter[];
        selectedChapters: number[];
        currentSettings: TranslationSettings;
        translateConfig: {
            customPrompt: string;
            autoExtract: boolean;
            fixPunctuation?: boolean;
            maxConcurrency?: number;
            enableChunking: boolean;
            maxConcurrentChunks: number;
            chunkSize?: number;
        };
        onReviewNeeded: (chars: GlossaryCharacter[], terms: GlossaryTerm[]) => void;
    }) => void;
}

export function ChapterList({ workspaceId, onShowScanResults, onTranslate }: ChapterListProps) {
    const workspace = useLiveQuery(() => db.workspaces.get(workspaceId), [workspaceId]);
    const chapters = useLiveQuery(
        () => db.chapters.where("[workspaceId+order]").between([workspaceId, Dexie.minKey], [workspaceId, Dexie.maxKey]).toArray(),
        [workspaceId]
    );



    const [search, setSearch] = useState("");
    const [readingChapterId, setReadingChapterId] = useState<number | null>(null);
    const [filterStatus, setFilterStatus] = usePersistedState<"all" | "draft" | "translated">(`workspace-${workspaceId}-filter`, "all");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = usePersistedState(`workspace-${workspaceId}-perPage`, 50);
    const [viewMode, setViewMode] = usePersistedState<"grid" | "table">(`workspace-${workspaceId}-viewMode`, "grid");
    const [translateDialogOpen, setTranslateDialogOpen] = useState(false);
    // Removed local reviewData state
    const [inspectingChapter, setInspectingChapter] = useState<{ id: number, title: string, issues: InspectionIssue[] } | null>(null);
    const [isInspectOpen, setIsInspectOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [scanConfigOpen, setScanConfigOpen] = useState(false);

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
        handleSelect
    } = useChapterSelection(filtered.map(c => c.id!));

    const {
        importing,
        progress: importProgress,
        importStatus,
        fileInputRef,
        handleFileUpload,
        handleImportJSON
    } = useChapterImport(workspaceId, chapters?.length || 0);

    // AI Extraction
    const dictEntries = useLiveQuery(() => db.dictionary.where("workspaceId").equals(workspaceId).toArray(), [workspaceId]);
    const {
        pendingCharacters,
        pendingTerms,
        isReviewOpen,
        setIsReviewOpen,
        handleAIExtractChapter,
        handleConfirmSaveAI
    } = useAIExtraction(workspaceId, dictEntries || []);

    const handleScan = () => setScanConfigOpen(true);
    const handleStartScan = async (selectedTypes: EntityType[]) => {
        setScanConfigOpen(false);
        // Get all selected chapters' content
        if (selectedChapters.length === 0) {
            toast.error("Vui lòng chọn ít nhất 1 chương để quét!");
            return;
        }
        const selectedChapterData = chapters?.filter(c => selectedChapters.includes(c.id!)) || [];
        const combinedText = selectedChapterData.map(c => c.content_original).join("\n\n");
        await handleAIExtractChapter(combinedText, selectedTypes as string[]);
    };

    // Removed local useBatchTranslate

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


    const handleInspect = async (id: number) => {
        const chapter = await db.chapters.get(id);
        if (!chapter || !chapter.content_translated) {
            return toast.error("Chương này chưa dịch hoặc không tồn tại.");
        }

        toast.loading(`Đang rà soát chương: ${chapter.title}...`, {
            id: "inspecting-toast",
            icon: <Loader2 className="h-4 w-4 animate-spin text-primary" />
        });

        try {
            const issues = await inspectChapter(workspaceId, chapter.content_translated);
            // Save results to DB
            await db.chapters.update(id, { inspectionResults: issues });

            setInspectingChapter({ id, title: chapter.title, issues });
            setIsInspectOpen(true);

            toast.success("Rà soát hoàn tất!", { id: "inspecting-toast" });
        } catch (error) {
            console.error("Inspect error:", error);
            toast.error("Lỗi khi rà soát AI.", { id: "inspecting-toast" });
        }
    };

    const handleApplyCorrections = async () => {
        if (selectedChapters.length === 0) return toast.error("Vui lòng chọn chương cần sửa.");

        const corrections = await db.corrections.where('workspaceId').equals(workspaceId).toArray();
        if (corrections.length === 0) return toast.error("Chưa có dữ liệu Cải chính (Corrections).");

        toast.loading(`Đang áp dụng cải chính cho ${selectedChapters.length} chương...`, { id: "applying-corrections" });

        try {
            const chaptersToFix = await db.chapters.where("id").anyOf(selectedChapters).toArray();
            let updatedCount = 0;

            const snapshotStr = JSON.stringify(chaptersToFix.map(c => ({
                chapterId: c.id,
                before: { title: c.title_translated || "", content: c.content_translated || "" }
            })));
            const snapshot = JSON.parse(snapshotStr); // Deep copy just in case

            await db.transaction('rw', db.chapters, db.history, async () => {
                let anyChange = false;

                for (const chapter of chaptersToFix) {
                    if (!chapter.content_translated) continue;

                    let newContent = chapter.content_translated;
                    let newTitle = chapter.title_translated || "";
                    let hasChanges = false;

                    // Apply all corrections (Batch)
                    for (const correction of corrections) {
                        const originalContent = newContent;
                        const originalTitle = newTitle;

                        newContent = applyCorrectionRule(newContent, correction);
                        if (newTitle) {
                            newTitle = applyCorrectionRule(newTitle, correction);
                        }

                        if (newContent !== originalContent || newTitle !== originalTitle) {
                            hasChanges = true;
                        }
                    }

                    if (hasChanges) {
                        await db.chapters.update(chapter.id!, {
                            content_translated: newContent,
                            title_translated: newTitle,
                            updatedAt: new Date()
                        });
                        updatedCount++;
                        anyChange = true;
                    }
                }

                if (anyChange) {
                    // ROTATION STRATEGY: Delete ALL previous history for this workspace before adding new one.
                    // This ensures we only keep the LATEST snapshot (Single Undo).
                    await db.history.where("workspaceId").equals(workspaceId).delete();

                    // Save New History
                    await db.history.add({
                        workspaceId,
                        actionType: 'batch_correction',
                        summary: `Áp dụng cải chính (${updatedCount} chương)`,
                        timestamp: new Date(),
                        affectedCount: updatedCount,
                        snapshot: snapshot // Store PREVIOUS state
                    });
                }
            });

            if (updatedCount > 0) {
                toast.success(`Đã cập nhật ${updatedCount} chương!`, {
                    id: "applying-corrections",
                    action: {
                        label: "Lịch sử / Undo",
                        onClick: () => setHistoryOpen(true)
                    }
                });
            } else {
                toast.info("Không có thay đổi nào cần áp dụng.", { id: "applying-corrections" });
            }

        } catch (error: any) {
            console.error("Apply corrections error:", error);
            toast.error("Lỗi khi áp dụng cải chính: " + error.message, { id: "applying-corrections" });
        }
    };

    const handleClearTranslation = async (id: number) => {
        if (!confirm("Xóa bản dịch của chương này để dịch lại? (Bản gốc Trung Quốc vẫn được giữ nguyên)")) return;

        try {
            await clearChapterTranslation(id);
            toast.success("Đã xóa bản dịch. Bạn có thể dịch lại chương này.");
        } catch (error) {
            console.error("Clear translation error:", error);
            toast.error("Lỗi khi xóa bản dịch.");
        }
    };

    if (!chapters) return <div className="p-10 text-center text-white/50 animate-pulse">Loading workspace...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative pb-10">
            {/* TranslationProgressOverlay for imports */}
            <ImportProgressOverlay importing={importing} progress={importProgress} importStatus={importStatus} />
            <ImportProgressOverlay importing={importing} progress={importProgress} importStatus={importStatus} />

            <TranslateConfigDialog
                open={translateDialogOpen}
                onOpenChange={setTranslateDialogOpen}
                selectedCount={selectedChapters.length}
                onStart={(config: { customPrompt: string; autoExtract: boolean; maxConcurrency: number }, settings: TranslationSettings) => {
                    setTranslateDialogOpen(false);
                    onTranslate({
                        workspaceId,
                        chapters: filtered,
                        selectedChapters,
                        currentSettings: settings,
                        translateConfig: {
                            ...config,
                            enableChunking: false,
                            maxConcurrentChunks: 3
                        },
                        onReviewNeeded: (chars: GlossaryCharacter[], terms: GlossaryTerm[]) => onShowScanResults({ chars, terms })
                    });
                }}
            />

            <ChapterListHeader
                workspaceId={workspaceId}
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
                onExport={handleExport}
                fileInputRef={fileInputRef}
                onFileUpload={handleFileUpload}
                onImportJSON={handleImportJSON}
                importing={importing}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onScan={handleScan}
                lastReadChapterId={workspace?.lastReadChapterId}
                onReadContinue={(id) => setReadingChapterId(id)}
                onHistoryOpen={() => setHistoryOpen(true)}
                onApplyCorrections={() => toast.info("Tính năng đang phát triển")}
                onClearCache={() => toast.info("Cache được tối ưu tự động")}
                onFixTitles={() => toast.info("Tính năng đang phát triển")}
            />

            <ErrorBoundary name="ChapterListView">
                {viewMode === "grid" ? (
                    <ChapterCardGrid
                        chapters={currentChapters}
                        selectedChapters={selectedChapters}
                        onSelect={handleSelect}
                        onRead={(id) => {
                            setReadingChapterId(id);
                            db.workspaces.update(workspaceId, { lastReadChapterId: id });
                        }}
                        onInspect={handleInspect}
                        onClearTranslation={handleClearTranslation}
                        onImport={() => fileInputRef.current?.click()}
                    />
                ) : (
                    <ChapterTable
                        chapters={currentChapters}
                        selectedChapters={selectedChapters}
                        setSelectedChapters={setSelectedChapters}
                        onSelect={handleSelect}

                        onSelectPage={() => {
                            // Union current page IDs with existing selection
                            const pageIds = currentChapters.map(c => c.id!);
                            const newSet = new Set([...selectedChapters, ...pageIds]);
                            setSelectedChapters(Array.from(newSet));
                        }}
                        onSelectGlobal={() => setSelectedChapters(filtered.map(c => c.id!))}
                        onDeselectAll={() => setSelectedChapters([])}

                        onRead={(id) => {
                            setReadingChapterId(id);
                            db.workspaces.update(workspaceId, { lastReadChapterId: id });
                        }}
                        onInspect={handleInspect}
                        onClearTranslation={handleClearTranslation}
                        onApplyCorrections={handleApplyCorrections}
                    />
                )}
            </ErrorBoundary>

            {inspectingChapter && (
                <InspectionDialog
                    open={isInspectOpen}
                    onOpenChange={setIsInspectOpen}
                    chapterTitle={inspectingChapter.title}
                    issues={inspectingChapter.issues}
                    onNavigateToIssue={(original) => {
                        // For now just close or keep open, navigating would require editor context
                        console.log("Navigate to:", original);
                    }}
                />
            )}

            {readingChapterId && (
                <ReaderModal
                    chapterId={readingChapterId}
                    isOpen={!!readingChapterId}
                    onClose={() => setReadingChapterId(null)}
                    hasPrev={filtered.findIndex(c => c.id === readingChapterId) > 0}
                    hasNext={filtered.findIndex(c => c.id === readingChapterId) < filtered.length - 1}
                    onPrev={() => {
                        const idx = filtered.findIndex(c => c.id === readingChapterId);
                        if (idx > 0) {
                            const newId = filtered[idx - 1].id!;
                            setReadingChapterId(newId);
                            db.workspaces.update(workspaceId, { lastReadChapterId: newId });
                        }
                    }}
                    onNext={() => {
                        const idx = filtered.findIndex(c => c.id === readingChapterId);
                        if (idx < filtered.length - 1) {
                            const newId = filtered[idx + 1].id!;
                            setReadingChapterId(newId);
                            db.workspaces.update(workspaceId, { lastReadChapterId: newId });
                        }
                    }}
                />
            )}

            <HistoryDialog
                workspaceId={workspaceId}
                open={historyOpen}
                onOpenChange={setHistoryOpen}
            />

            <ScanConfigDialog
                open={scanConfigOpen}
                onOpenChange={setScanConfigOpen}
                onStart={handleStartScan}
            />

            <ReviewDialog
                open={isReviewOpen}
                onOpenChange={setIsReviewOpen}
                characters={pendingCharacters as GlossaryCharacter[]}
                terms={pendingTerms as GlossaryTerm[]}
                onSave={handleConfirmSaveAI}
            />
        </div>
    );
}
