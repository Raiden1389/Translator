import { Chapter, Workspace } from "@/lib/db";
import { InspectionIssue, GlossaryCharacter, GlossaryTerm, TranslationSettings } from "@/lib/types";
import { MutableRefObject } from "react";

export interface ChapterListUIState {
    search: string;
    filterStatus: "all" | "draft" | "translated";
    currentPage: number;
    itemsPerPage: number;
    viewMode: "grid" | "table";
}

export interface ChapterListDialogState {
    readingChapterId: number | null;
    translateDialogOpen: boolean;
    inspectingChapter: { id: number, title: string, issues: InspectionIssue[] } | null;
    isInspectOpen: boolean;
    historyOpen: boolean;
    scanConfigOpen: boolean;
    tempScanText: string;
    isProcessing: boolean;
    isFixingTitles: boolean;
    clearCacheConfirmOpen: boolean;
    bulkDeleteConfirmOpen: boolean;
}

export interface ChapterListState extends ChapterListUIState, ChapterListDialogState {
    workspace: Workspace | undefined;
    chapters: Chapter[] | undefined;
    filtered: Chapter[];
    currentChapters: Chapter[];
    totalPages: number;
    selectedChapters: number[];
    importing: boolean;
    importProgress: number;
    importStatus: string;
    fileInputRef: MutableRefObject<HTMLInputElement | null>;
    isAIExtracting: boolean;
    pendingCharacters: GlossaryCharacter[];
    pendingTerms: GlossaryTerm[];
    isReviewOpen: boolean;
}

export interface ChapterListActions {
    // UI Actions
    setSearch: (search: string) => void;
    setFilterStatus: (status: "all" | "draft" | "translated") => void;
    setCurrentPage: (page: number) => void;
    setItemsPerPage: (count: number) => void;
    setViewMode: (mode: "grid" | "table") => void;

    // Dialog Actions
    setReadingChapterId: (id: number | null) => void;
    setTranslateDialogOpen: (open: boolean) => void;
    setIsInspectOpen: (open: boolean) => void;
    setHistoryOpen: (open: boolean) => void;
    setScanConfigOpen: (open: boolean) => void;
    setTempScanText: (text: string) => void;
    setClearCacheConfirmOpen: (open: boolean) => void;
    setBulkDeleteConfirmOpen: (open: boolean) => void;
    setIsReviewOpen: (open: boolean) => void;
    // Feature Actions
    setSelectedChapters: (ids: number[]) => void;
    handleSelect: (id: number) => void;
    handleSelectRange: (range: string) => void;
    handleRead: (id: number) => Promise<void>;
    handleInspect: (id: number) => Promise<void>;
    handleApplyCorrections: () => Promise<void>;
    handleClearTranslationAction: (id: number) => Promise<void>;
    handleBulkClearTranslation: () => Promise<void>;
    handleExport: () => Promise<void>;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleAIExtractChapter: (text: string, types: string[]) => Promise<void>;
    handleConfirmSaveAI: (chars: GlossaryCharacter[], terms: GlossaryTerm[], blacklistChars?: GlossaryCharacter[], blacklistTerms?: GlossaryTerm[]) => Promise<void>;
    handleFixTitles: () => Promise<void>;
    handleBulkDelete: () => Promise<void>;
}

export interface BatchTranslateHandlerProps {
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
        enableTurbo: boolean;
        maxConcurrentChunks: number;
        chunkSize?: number;
    };
}
