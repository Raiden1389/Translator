"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Dexie from "dexie";
import { db, type Chapter } from "@/lib/db";
import { toast } from "sonner";
import { ChapterListHeader } from "../shared/ChapterListHeader";
import { ChapterTable } from "./ChapterTable";
import { ChapterCardGrid } from "./ChapterCardGrid";
import { ReaderModal } from "./ReaderModal";
import { ImportProgressOverlay } from "./ImportProgressOverlay";
import { ChapterSelectionDock } from "../ChapterSelectionDock";

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
import { useAiQueueStats } from "../hooks/useAiQueueStatus";

// NEW: Extracted hooks
import { useChapterActions } from "./hooks/useChapterActions";
import { useCorrections } from "./hooks/useCorrections";
import { useDialogStates } from "./hooks/useDialogStates";
import { useScanConfig } from "./hooks/useScanConfig";
import { useReaderNavigation } from "./hooks/useReaderNavigation";

import { ReviewData, GlossaryCharacter, GlossaryTerm, TranslationSettings } from "@/lib/types";

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
    const [filterStatus, setFilterStatus] = usePersistedState<"all" | "draft" | "translated">(`workspace-${workspaceId}-filter`, "all");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = usePersistedState(`workspace-${workspaceId}-perPage`, 50);
    const [viewMode, setViewMode] = usePersistedState<"grid" | "table">(`workspace-${workspaceId}-viewMode`, "grid");

    const filtered = useMemo(() => {
        if (!chapters) return [];
        return chapters.filter(c => {
            const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = filterStatus === "all" || c.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [chapters, search, filterStatus]);

    const allChapterIds = useMemo(() => filtered.map(c => c.id!), [filtered]);

    const {
        selectedChapters,
        setSelectedChapters,
        handleSelect
    } = useChapterSelection(allChapterIds);

    const {
        importing,
        progress: importProgress,
        importStatus,
        fileInputRef,
        handleFileUpload,
        handleImportJSON
    } = useChapterImport(workspaceId, chapters?.length || 0);

    const dictEntries = useLiveQuery(() => db.dictionary.where("workspaceId").equals(workspaceId).toArray(), [workspaceId]);
    const {
        pendingCharacters,
        pendingTerms,
        isReviewOpen,
        setIsReviewOpen,
        handleAIExtractChapter,
        handleConfirmSaveAI
    } = useAIExtraction(workspaceId, dictEntries || []);

    const queueState = useAiQueueStats();

    // NEW: Dialog states first (needed by other hooks)
    const { translateDialogOpen, setTranslateDialogOpen, historyOpen, setHistoryOpen } = useDialogStates();

    // NEW: Use all extracted hooks
    const {
        handleExport,
        handleInspect,
        handleClearTranslation,
        handleBulkClearTranslation,
        handleBulkDelete,
        handleSanitizeDatabase,
        inspectingChapter,
        isInspectOpen,
        setIsInspectOpen
    } = useChapterActions({ workspaceId, selectedChapters, filtered, setHistoryOpen });

    const { handleApplyCorrections, handleFixTitleCase } = useCorrections({
        workspaceId,
        selectedChapters,
        setHistoryOpen
    });

    const {
        scanConfigOpen,
        setScanConfigOpen,
        handleScan,
        handleStartScan
    } = useScanConfig({ selectedChapters, chapters, handleAIExtractChapter });

    const {
        readingChapterId,
        handleRead,
        handlePrev,
        handleNext,
        handleClose: handleReaderClose,
        hasPrev,
        hasNext
    } = useReaderNavigation({ workspaceId, filtered });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const currentChapters = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filtered.slice(start, start + itemsPerPage);
    }, [filtered, currentPage, itemsPerPage]);

    useEffect(() => { setCurrentPage(1); }, [search, filterStatus]);

    if (!chapters) return <div className="p-10 text-center text-white/50 animate-pulse">Loading workspace...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative pb-10">
            <ImportProgressOverlay importing={importing} progress={importProgress} importStatus={importStatus} />
            <ImportProgressOverlay importing={importing} progress={importProgress} importStatus={importStatus} />

            <TranslateConfigDialog
                open={translateDialogOpen}
                onOpenChange={setTranslateDialogOpen}
                selectedCount={selectedChapters.length}
                onStart={(config: {
                    customPrompt: string;
                    autoExtract: boolean;
                    maxConcurrency: number;
                    fixPunctuation?: boolean;
                    enableChunking: boolean;
                    maxConcurrentChunks: number;
                    chunkSize?: number;
                }, settings: TranslationSettings) => {
                    setTranslateDialogOpen(false);
                    onTranslate({
                        workspaceId,
                        chapters: filtered,
                        selectedChapters,
                        currentSettings: settings,
                        translateConfig: config,
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
                onReadContinue={handleRead}
                onHistoryOpen={() => setHistoryOpen(true)}
                onApplyCorrections={() => toast.info("Tính năng đang phát triển")}
                onClearCache={handleSanitizeDatabase}
                onFixTitles={() => toast.info("Tính năng đang phát triển")}
                onFixTitleCase={handleFixTitleCase}
            />

            <ErrorBoundary name="ChapterListView">
                {viewMode === "grid" ? (
                    <ChapterCardGrid
                        chapters={currentChapters}
                        selectedChapters={selectedChapters}
                        queueState={queueState}
                        onSelect={handleSelect}
                        onRead={handleRead}
                        onInspect={handleInspect}
                        onClearTranslation={handleClearTranslation}
                        onImport={() => fileInputRef.current?.click()}
                    />
                ) : (
                    <ChapterTable
                        chapters={currentChapters}
                        selectedChapters={selectedChapters}
                        queueState={queueState}
                        setSelectedChapters={setSelectedChapters}
                        onSelect={handleSelect}

                        onSelectPage={() => {
                            const pageIds = currentChapters.map(c => c.id!);
                            const newSet = new Set([...selectedChapters, ...pageIds]);
                            setSelectedChapters(Array.from(newSet));
                        }}
                        onSelectGlobal={() => setSelectedChapters(filtered.map(c => c.id!))}
                        onDeselectAll={() => setSelectedChapters([])}

                        onRead={handleRead}
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
                        console.log("Navigate to:", original);
                    }}
                />
            )}

            {readingChapterId && (
                <ReaderModal
                    chapterId={readingChapterId}
                    isOpen={!!readingChapterId}
                    onClose={handleReaderClose}
                    hasPrev={filtered.findIndex(c => c.id === readingChapterId) > 0}
                    hasNext={filtered.findIndex(c => c.id === readingChapterId) < filtered.length - 1}
                    onPrev={handlePrev}
                    onNext={handleNext}
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

            <ChapterSelectionDock
                selectedChapters={selectedChapters}
                isRaidenMode={false}
                setSelectedChapters={setSelectedChapters}
                setTranslateDialogOpen={setTranslateDialogOpen}
                filtered={filtered}
                setTempScanText={() => { }}
                setScanConfigOpen={setScanConfigOpen}
                isAIExtracting={false}
                handleBulkClearTranslation={handleBulkClearTranslation}
                setBulkDeleteConfirmOpen={() => handleBulkDelete()}
            />
        </div>
    );
}
