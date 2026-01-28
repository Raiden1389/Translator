"use client";

import React from "react";
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
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { TermType } from "@/lib/services/name-hunter/types";
import { NameHunterDialog } from "../name-hunter/NameHunterDialog";
import { TranslationSettings } from "@/lib/types";
import { useChapterList } from "./hooks/useChapterList";
import { parseRangeString } from "@/lib/services/chapter-list.service";
import { toast } from "sonner";

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
        historyOpen, nameHunterOpen, filtered, currentChapters, totalPages,
        selectedChapters, importing, importProgress, importStatus,
        fileInputRef, importInputRef
    } = state;

    const {
        setSearch, setFilterStatus, setCurrentPage, setItemsPerPage, setViewMode,
        setReadingChapterId, setTranslateDialogOpen, setIsInspectOpen, setHistoryOpen, setNameHunterOpen,
        setSelectedChapters, toggleSingleSelection, handleSelectRange, handleInspect,
        handleApplyCorrections, handleClearTranslationAction, handleExport,
        handleFileUpload, handleImportJSON
    } = actions;

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
                onScan={() => setNameHunterOpen(true)}
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

            <NameHunterDialog
                isOpen={nameHunterOpen}
                onOpenChange={setNameHunterOpen}
                textToScan=""
                workspaceId={workspaceId}
                totalChapters={chapters.length}
                selectedCount={selectedChapters.length}
                onScanRequest={async (config) => {
                    let targetChapters: Chapter[] = [];
                    if (config.scope === 'range' && config.range) {
                        const orders = parseRangeString(config.range);
                        targetChapters = await db.chapters.where('[workspaceId+order]')
                            .anyOf([...orders].map(o => [workspaceId, o]))
                            .toArray();
                    } else if (config.scope === 'selected_chapters') {
                        targetChapters = await db.chapters.where('id').anyOf(selectedChapters).toArray();
                    } else {
                        targetChapters = await db.chapters.where('workspaceId').equals(workspaceId).toArray();
                    }
                    const texts = targetChapters.map(c => c.content_original).filter(t => t && t.trim().length > 0);
                    if (texts.length === 0) {
                        toast.error("Không tìm thấy nội dung.");
                        return [];
                    }
                    return texts;
                }}
                onAddTerm={async (candidate) => {
                    try {
                        const existing = await db.dictionary.where('[workspaceId+original]').equals([workspaceId, candidate.original]).first();
                        if (existing) { toast.warning(`"${candidate.original}" đã có.`); return; }
                        await db.dictionary.add({
                            workspaceId,
                            original: candidate.chinese || candidate.original,
                            translated: candidate.original,
                            type: (candidate.type === TermType.Person) ? 'name' : (candidate.type === TermType.Location) ? 'location' : 'general',
                            description: candidate.metadata?.description || `Added via Name Hunter`,
                            role: candidate.metadata?.role || 'mob',
                            gender: (candidate.metadata?.gender === 'Female') ? 'female' : 'male',
                            createdAt: new Date()
                        });
                        toast.success(`Đã thêm "${candidate.original}".`);
                    } catch (err) { toast.error("Lỗi khi thêm từ."); }
                }}
            />
        </div>
    );
}
