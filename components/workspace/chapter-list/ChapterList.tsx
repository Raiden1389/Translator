"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Dexie from "dexie";
import { db, type Chapter } from "@/lib/db";
import { toast } from "sonner";
import { ChapterListHeader } from "../shared/ChapterListHeader";
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

// NEW: Extracted view components
import { ChapterListDialogs } from "./components/ChapterListDialogs";
import { ChapterListContent } from "./components/ChapterListContent";

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

            {/* Overlays */}
            <ImportProgressOverlay importing={importing} progress={importProgress} importStatus={importStatus} />

            {/* Header */}
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

            {/* Main Content */}
            <ChapterListContent
                viewMode={viewMode}
                currentChapters={currentChapters}
                selectedChapters={selectedChapters}
                queueState={queueState}
                setSelectedChapters={setSelectedChapters}
                filtered={filtered}
                handleSelect={handleSelect}
                handleRead={handleRead}
                handleInspect={handleInspect}
                handleClearTranslation={handleClearTranslation}
                handleApplyCorrections={handleApplyCorrections}
                fileInputRef={fileInputRef}
            />

            {/* All Dialogs */}
            <ChapterListDialogs
                translateDialogOpen={translateDialogOpen}
                setTranslateDialogOpen={setTranslateDialogOpen}
                selectedChapters={selectedChapters}
                onTranslate={onTranslate}
                workspaceId={workspaceId}
                filtered={filtered}
                onShowScanResults={onShowScanResults}
                isInspectOpen={isInspectOpen}
                setIsInspectOpen={setIsInspectOpen}
                inspectingChapter={inspectingChapter}
                readingChapterId={readingChapterId}
                handleReaderClose={handleReaderClose}
                handlePrev={handlePrev}
                handleNext={handleNext}
                hasPrev={hasPrev}
                hasNext={hasNext}
                historyOpen={historyOpen}
                setHistoryOpen={setHistoryOpen}
                scanConfigOpen={scanConfigOpen}
                setScanConfigOpen={setScanConfigOpen}
                handleStartScan={handleStartScan}
                isReviewOpen={isReviewOpen}
                setIsReviewOpen={setIsReviewOpen}
                pendingCharacters={pendingCharacters}
                pendingTerms={pendingTerms}
                handleConfirmSaveAI={handleConfirmSaveAI}
            />

            {/* Selection Dock */}
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
