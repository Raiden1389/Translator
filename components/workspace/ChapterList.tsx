"use client";

import React from "react";
import { ChapterListHeader } from "./ChapterListHeader";
import { ChapterTable } from "./ChapterTable";
import { ChapterCardGrid } from "./ChapterCardGrid";
import { ImportProgressOverlay } from "./ImportProgressOverlay";
import { ChapterListDialogs } from "./ChapterListDialogs";
import { ChapterSelectionDock } from "./ChapterSelectionDock";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { type Chapter } from "@/lib/db";
import { useChapterList } from "./hooks/useChapterList";
import { BatchTranslateHandlerProps } from "./hooks/useChapterList.types";
import { toast } from "sonner";
import { useRaiden } from "@/components/theme/RaidenProvider";

interface ChapterListProps {
    workspaceId: string;
    onTranslate: (props: BatchTranslateHandlerProps) => void;
    onTabChange?: (tab: string) => void;
}

export function ChapterList({ workspaceId, onTranslate, onTabChange }: ChapterListProps) {
    const { isRaidenMode } = useRaiden();
    const { state, actions } = useChapterList(workspaceId);

    const {
        workspace, chapters,
        search, filterStatus, currentPage, itemsPerPage, viewMode,
        filtered, currentChapters, totalPages,
        selectedChapters, importing, importProgress, importStatus,
        fileInputRef, isProcessing, isFixingTitles,
        isAIExtracting
    } = state;

    const {
        setSearch, setFilterStatus, setCurrentPage, setItemsPerPage, setViewMode,
        setTranslateDialogOpen, setHistoryOpen,
        setSelectedChapters, handleSelect, handleInspect,
        handleApplyCorrections, handleClearTranslationAction, handleBulkClearTranslation, handleExport,
        handleFileUpload,
        setScanConfigOpen, setTempScanText, setClearCacheConfirmOpen, setBulkDeleteConfirmOpen,
        handleFixTitles, handleRead
    } = actions;

    if (!chapters) return <div className="p-10 text-center text-white/50 animate-pulse">Loading workspace...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative pb-20">
            <ImportProgressOverlay importing={importing} progress={importProgress} importStatus={importStatus} />

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
                onExport={handleExport}
                fileInputRef={fileInputRef}
                onFileUpload={handleFileUpload}
                importing={importing}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
                lastReadChapterId={workspace?.lastReadChapterId}
                onReadContinue={handleRead}
                onHistoryOpen={() => setHistoryOpen(true)}
                onScan={() => setScanConfigOpen(true)}
                onApplyCorrections={handleApplyCorrections}
                onClearCache={() => setClearCacheConfirmOpen(true)}
                onImportJSON={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = (e: Event) => actions.handleImportJSON(e as unknown as React.ChangeEvent<HTMLInputElement>);
                    input.click();
                }}
                onRefresh={async () => {
                    setSearch("");
                    setFilterStatus("all");
                    toast.success("Đã làm mới dữ liệu và bộ lọc.");
                }}
                processing={isProcessing || isFixingTitles}
                onSelectRange={(start, end) => {
                    const targetChapters = filtered.slice(start - 1, end);
                    const ids = targetChapters.map((c: Chapter) => c.id!).filter(Boolean);
                    setSelectedChapters(ids);
                    if (ids.length > 0) toast.success(`Đã chọn ${ids.length} chương`);
                }}
                onFixTitles={handleFixTitles}
            />

            <ErrorBoundary name="ChapterListView">
                {viewMode === "grid" ? (
                    <ChapterCardGrid
                        chapters={currentChapters as Chapter[]}
                        selectedChapters={selectedChapters}
                        onSelect={handleSelect}
                        onRead={handleRead}
                        onInspect={handleInspect}
                        onClearTranslation={handleClearTranslationAction}
                        onImport={() => fileInputRef.current?.click()}
                        lastReadChapterId={workspace?.lastReadChapterId}
                    />
                ) : (
                    <ChapterTable
                        chapters={currentChapters as Chapter[]}
                        selectedChapters={selectedChapters}
                        setSelectedChapters={setSelectedChapters}
                        onSelect={handleSelect}
                        onSelectPage={() => {
                            const pageIds = currentChapters.map((c: Chapter) => c.id!);
                            const newSet = new Set([...selectedChapters, ...pageIds]);
                            setSelectedChapters(Array.from(newSet));
                        }}
                        onSelectGlobal={() => setSelectedChapters(filtered.map((c: Chapter) => c.id!))}
                        onDeselectAll={() => setSelectedChapters([])}
                        onRead={handleRead}
                        onInspect={handleInspect}
                        onClearTranslation={handleClearTranslationAction}
                        onApplyCorrections={handleApplyCorrections}
                        lastReadChapterId={workspace?.lastReadChapterId}
                    />
                )}
            </ErrorBoundary>

            <ChapterSelectionDock
                selectedChapters={selectedChapters}
                isRaidenMode={isRaidenMode}
                setSelectedChapters={setSelectedChapters}
                setTranslateDialogOpen={setTranslateDialogOpen}
                filtered={filtered as Chapter[]}
                setTempScanText={setTempScanText}
                setScanConfigOpen={setScanConfigOpen}
                isAIExtracting={isAIExtracting}
                handleBulkClearTranslation={handleBulkClearTranslation}
                setBulkDeleteConfirmOpen={setBulkDeleteConfirmOpen}
            />

            <ChapterListDialogs
                workspaceId={workspaceId}
                state={state}
                actions={actions}
                onTranslate={onTranslate}
                onTabChange={onTabChange}
            />
        </div>
    );
}
