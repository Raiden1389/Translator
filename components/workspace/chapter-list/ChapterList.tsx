"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Dexie from "dexie";
import { toast } from "sonner";

import { db, type Chapter } from "@/lib/db";
import { ReviewData, GlossaryCharacter, GlossaryTerm, TranslationSettings } from "@/lib/types";

import { usePersistedState } from "@/lib/hooks/usePersistedState";
import { useChapterSelection } from "../hooks/useChapterSelection";
import { useChapterImport } from "../hooks/useChapterImport";
import { useAIExtraction } from "../editor/hooks/useAIExtraction";
import { useAiQueueStats } from "../hooks/useAiQueueStatus";

import { useChapterActions } from "./hooks/useChapterActions";
import { useCorrections } from "./hooks/useCorrections";
import { useDialogStates } from "./hooks/useDialogStates";
import { useScanConfig } from "./hooks/useScanConfig";
import { useReaderNavigation } from "./hooks/useReaderNavigation";

import { ChapterListHeader } from "../shared/ChapterListHeader";
import { ImportProgressOverlay } from "./ImportProgressOverlay";
import { ChapterSelectionDock } from "../ChapterSelectionDock";
import { ChapterListDialogs } from "./components/ChapterListDialogs";
import { ChapterListContent } from "./components/ChapterListContent";
import { useWorkspaceShortcuts } from "../hooks/useWorkspaceShortcuts";
import { DEFAULT_TRANSLATION_CONFIG } from "./TranslateConfigDialog";
import { AuditResultDialog } from "./AuditResultDialog";
import { auditTranslation, type AuditResult } from "@/lib/gemini/translation/audit";
import { migrateModelId, DEFAULT_MODEL } from "@/lib/ai-models";

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
    const [auditDialogOpen, setAuditDialogOpen] = useState(false);
    const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
    const [auditChapterNames, setAuditChapterNames] = useState<string[]>([]);

    // NEW: Use all extracted hooks
    const {
        handleExport,
        handleInspect,
        handleRetranslate,
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

    // Workspace keyboard shortcuts
    useWorkspaceShortcuts({
        onTranslateSelected: () => {
            // Ctrl+T: Translate immediately with default settings from dialog
            if (selectedChapters.length > 0 && workspace) {
                const defaultSettings: TranslationSettings = {
                    apiKey: '', // Will use global API key
                    model: 'gemini-2.0-flash-exp',
                    temperature: 0.3,
                };

                onTranslate({
                    workspaceId,
                    chapters: filtered,
                    selectedChapters,
                    currentSettings: defaultSettings,
                    translateConfig: DEFAULT_TRANSLATION_CONFIG,
                    onReviewNeeded: (chars, terms) => onShowScanResults({ chars, terms }),
                });

                toast.success(`Translating ${selectedChapters.length} chapter(s)`, {
                    description: 'Using default settings',
                });
            }
        },
        onOpenSettings: () => {
            // Ctrl+Shift+T: Open settings dialog
            setTranslateDialogOpen(true);
        },
        onSelectAll: () => {
            setSelectedChapters(allChapterIds);
        },
        onDeselectAll: () => {
            setSelectedChapters([]);
        },
        hasSelection: selectedChapters.length > 0,
    });

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const currentChapters = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filtered.slice(start, start + itemsPerPage);
    }, [filtered, currentPage, itemsPerPage]);


    // Reset to page 1 when filters change
    useEffect(() => {
        const timer = setTimeout(() => setCurrentPage(1), 0);
        return () => clearTimeout(timer);
    }, [search, filterStatus]);

    const handleAuditQuality = async () => {
        if (selectedChapters.length === 0) {
            toast.error("Vui lòng chọn ít nhất 1 chương để audit");
            return;
        }

        if (!chapters) return;

        const selectedChapterData = chapters.filter(c => selectedChapters.includes(c.id));
        const results: AuditResult[] = [];
        const names: string[] = [];

        for (const chapter of selectedChapterData) {
            if (!chapter.content_translated) {
                toast.warning(`Chương ${chapter.order} chưa được dịch, bỏ qua`);
                continue;
            }

            const result = auditTranslation(
                chapter.content_translated,
                "Bùi Khiêm" // TODO: Make this configurable
            );
            results.push(result);
            names.push(`Chương ${chapter.order}`);
        }

        if (results.length === 0) {
            toast.error("Không có chương nào đã dịch để audit");
            return;
        }

        setAuditResults(results);
        setAuditChapterNames(names);
        setAuditDialogOpen(true);
    };

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
                onAuditQuality={handleAuditQuality}
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
                handleRetranslate={async (id) => {
                    console.log('[ChapterList] handleRetranslate called for ID:', id);
                    if (!workspace) {
                        console.error('[ChapterList] No workspace found!');
                        return;
                    }
                    await handleRetranslate(id, async (ids) => {
                        console.log('[ChapterList] translateFn called with IDs:', ids);
                        // Load current settings from IndexedDB (same as TranslateConfigDialog)
                        const key = await db.settings.get("apiKey");
                        const model = await db.settings.get("model");
                        const lastPrompt = await db.settings.get("customPrompt");
                        const lastConcurrency = await db.settings.get("maxConcurrency");
                        const lastFixPunctuation = await db.settings.get("fixPunctuation");
                        const lastEnableChunking = await db.settings.get("enableChunking");
                        const lastEnableTurbo = await db.settings.get("enableTurbo");
                        const lastMaxConcurrentChunks = await db.settings.get("maxConcurrentChunks");
                        const lastChunkSize = await db.settings.get("chunkSize");
                        const lastTemperature = await db.settings.get("temperature");
                        const lastEnableBatch = await db.settings.get("enableBatch");
                        const lastBatchSize = await db.settings.get("batchSize");
                        const lastMaxCharsPerBatch = await db.settings.get("maxCharsPerBatch");

                        const currentSettings: TranslationSettings = {
                            apiKey: (key?.value as string) || '',
                            model: migrateModelId((model?.value as string) || DEFAULT_MODEL),
                            temperature: (lastTemperature?.value as number) ?? 0.1,
                        };

                        const translateConfig = {
                            customPrompt: (lastPrompt?.value as string) || "",
                            autoExtract: false,
                            maxConcurrency: (lastConcurrency?.value as number) || 5,
                            fixPunctuation: (lastFixPunctuation?.value as boolean) || false,
                            enableChunking: (lastEnableChunking?.value as boolean) || false,
                            enableTurbo: lastEnableTurbo ? (lastEnableTurbo.value as boolean) : true,
                            maxConcurrentChunks: (lastMaxConcurrentChunks?.value as number) || 3,
                            chunkSize: (lastChunkSize?.value as number) || 800,
                            temperature: (lastTemperature?.value as number) ?? 0.1,
                            enableBatch: (lastEnableBatch?.value as boolean) || false,
                            batchSize: (lastBatchSize?.value as number) || 3,
                            maxCharsPerBatch: (lastMaxCharsPerBatch?.value as number) || 25000,
                        };

                        // 🔥 CRITICAL: Reload chapters from DB to get fresh data after clear
                        // Without reload, `filtered` still has old content_translated
                        // → TranslationProvider filters it out → No translation happens
                        const freshChapters = await db.chapters
                            .where('workspaceId')
                            .equals(workspaceId)
                            .toArray();

                        console.log('[ChapterList] Calling onTranslate with settings:', currentSettings, translateConfig);
                        onTranslate({
                            workspaceId,
                            chapters: freshChapters, // Use fresh data from DB
                            selectedChapters: ids,
                            currentSettings,
                            translateConfig,
                            onReviewNeeded: (chars, terms) => onShowScanResults({ chars, terms }),
                        });
                        console.log('[ChapterList] onTranslate called successfully');
                    });
                }}
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
                setSelectedChapters={setSelectedChapters}
                setTranslateDialogOpen={setTranslateDialogOpen}
                filtered={filtered}
                setTempScanText={() => { }}
                setScanConfigOpen={setScanConfigOpen}
                isAIExtracting={false}
                handleBulkClearTranslation={handleBulkClearTranslation}
                setBulkDeleteConfirmOpen={() => handleBulkDelete()}
            />

            <AuditResultDialog
                open={auditDialogOpen}
                onOpenChange={setAuditDialogOpen}
                results={auditResults}
                chapterNames={auditChapterNames}
            />
        </div>
    );
}
