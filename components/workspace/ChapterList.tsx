"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Dexie from "dexie";
import { db, Chapter } from "@/lib/db";
import { ChapterListHeader } from "./ChapterListHeader";
import { ChapterTable } from "./ChapterTable";
import { ChapterCardGrid } from "./ChapterCardGrid";
import { ReaderModal } from "./ReaderModal";
import { ImportProgressOverlay } from "./ImportProgressOverlay";
import { TranslateConfigDialog } from "./TranslateConfigDialog";
import { InspectionDialog } from "./InspectionDialog";
import { HistoryDialog } from "./HistoryDialog";
import { ReviewDialog } from "./ReviewDialog";
import { ScanConfigDialog } from "./ScanConfigDialog";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { TranslationSettings } from "@/lib/types";
import { useChapterList } from "./hooks/useChapterList";

interface BatchTranslateHandlerProps {
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
}

interface ChapterListProps {
    workspaceId: string;
    onTranslate: (props: BatchTranslateHandlerProps) => void;
}

export function ChapterList({ workspaceId, onTranslate }: ChapterListProps) {
    const workspace = useLiveQuery(() => db.workspaces.get(workspaceId), [workspaceId]);
    const chapters = useLiveQuery(
        () => db.chapters.where("[workspaceId+order]").between([workspaceId, Dexie.minKey], [workspaceId, Dexie.maxKey]).toArray(),
        [workspaceId]
    );

    const { state, actions } = useChapterList(workspaceId, chapters);

    const {
        search, filterStatus, currentPage, itemsPerPage, viewMode,
        readingChapterId, translateDialogOpen, inspectingChapter, isInspectOpen,
        historyOpen, filtered, currentChapters, totalPages,
        selectedChapters, importing, importProgress, importStatus,
        fileInputRef, importInputRef
    } = state;

    const {
        setSearch, setFilterStatus, setCurrentPage, setItemsPerPage, setViewMode,
        setReadingChapterId, setTranslateDialogOpen, setIsInspectOpen, setHistoryOpen,
        setSelectedChapters, toggleSingleSelection, handleSelectRange, handleInspect,
        handleApplyCorrections, handleClearTranslationAction, handleExport,
        handleFileUpload, handleImportJSON,
        setIsReviewOpen, handleAIExtractChapter, handleConfirmSaveAI,
        isAIExtracting, pendingCharacters, pendingTerms, isReviewOpen
    } = actions;

    const [scanConfigOpen, setScanConfigOpen] = useState(false);
    const [tempScanText, setTempScanText] = useState("");

    if (!chapters) return <div className="p-10 text-center text-white/50 animate-pulse">Loading workspace...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative pb-10">
            <ImportProgressOverlay importing={importing} progress={importProgress} importStatus={importStatus} />

            <TranslateConfigDialog
                open={translateDialogOpen}
                onOpenChange={setTranslateDialogOpen}
                selectedCount={selectedChapters.length}
                onStart={(config, settings) => {
                    setTranslateDialogOpen(false);
                    onTranslate({
                        workspaceId,
                        chapters: filtered,
                        selectedChapters,
                        currentSettings: settings,
                        translateConfig: {
                            ...config,
                            fixPunctuation: config.fixPunctuation,
                            enableChunking: config.enableChunking,
                            maxConcurrentChunks: config.maxConcurrentChunks || 3,
                            chunkSize: config.chunkSize || 800
                        }
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
                onAIExtract={() => {
                    const targetChapters = selectedChapters.length > 0
                        ? filtered.filter(c => selectedChapters.includes(c.id!))
                        : currentChapters;
                    const combinedText = targetChapters.map(c => c.content_original).join("\n\n---\n\n");
                    setTempScanText(combinedText);
                    setScanConfigOpen(true);
                }}
                isAIExtracting={isAIExtracting}
                workspaceId={workspaceId}
                lastReadChapterId={workspace?.lastReadChapterId}
                onReadContinue={(id) => setReadingChapterId(id)}
            />

            <ErrorBoundary name="ChapterListView">
                {viewMode === "grid" ? (
                    <ChapterCardGrid
                        chapters={currentChapters}
                        selectedChapters={selectedChapters}
                        toggleSelect={toggleSingleSelection}
                        onRead={(id) => {
                            setReadingChapterId(id);
                            db.workspaces.update(workspaceId, { lastReadChapterId: id });
                        }}
                        onInspect={handleInspect}
                        onClearTranslation={handleClearTranslationAction}
                        onImport={() => fileInputRef.current?.click()}
                        lastReadChapterId={workspace?.lastReadChapterId}
                    />
                ) : (
                    <ChapterTable
                        chapters={currentChapters}
                        selectedChapters={selectedChapters}
                        setSelectedChapters={setSelectedChapters}
                        toggleSelect={toggleSingleSelection}
                        onSelectPage={() => {
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
                        onClearTranslation={handleClearTranslationAction}
                        onApplyCorrections={handleApplyCorrections}
                        lastReadChapterId={workspace?.lastReadChapterId}
                    />
                )}
            </ErrorBoundary>

            {/* Dialogs */}
            {inspectingChapter && (
                <InspectionDialog
                    open={isInspectOpen}
                    onOpenChange={setIsInspectOpen}
                    chapterTitle={inspectingChapter.title}
                    issues={inspectingChapter.issues}
                    onNavigateToIssue={() => { }}
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

            <HistoryDialog workspaceId={workspaceId} open={historyOpen} onOpenChange={setHistoryOpen} />


            <ScanConfigDialog
                open={scanConfigOpen}
                onOpenChange={setScanConfigOpen}
                onStart={(types) => {
                    handleAIExtractChapter(tempScanText, types);
                    setTempScanText("");
                }}
            />

            <ReviewDialog
                open={isReviewOpen}
                onOpenChange={setIsReviewOpen}
                characters={pendingCharacters}
                terms={pendingTerms}
                onSave={handleConfirmSaveAI}
            />
        </div>
    );
}
