"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useReaderConfig } from "../hooks/useReaderConfig";
import { InspectionIssue } from "@/lib/types";
import { useReaderTTS } from "../hooks/useReaderTTS";
import { useReaderInspection } from "../hooks/useReaderInspection";
import { useReaderSelection } from "../hooks/useReaderSelection";

interface ReaderContextValue {
    // Config
    readerConfig: ReturnType<typeof useReaderConfig>["readerConfig"];
    setReaderConfig: ReturnType<typeof useReaderConfig>["setReaderConfig"];
    updateConfig: ReturnType<typeof useReaderConfig>["updateConfig"];
    showSettings: boolean;
    setShowSettings: (show: boolean) => void;

    // TTS
    isTTSPlaying: boolean;
    isTTSLoading: boolean;
    activeTTSIndex: number | null;
    ttsSegments: string[];
    handleTTSPlay: (index: number) => Promise<void>;
    handleTTSStop: () => void;
    handleTTSToggle: () => void;

    // Inspection
    isInspecting: boolean;
    inspectionIssues: InspectionIssue[];
    setInspectionIssues: (issues: InspectionIssue[]) => void;
    activeIssue: InspectionIssue | null;
    setActiveIssue: (issue: InspectionIssue | null) => void;
    handleInspect: (content: string) => Promise<InspectionIssue[] | null | undefined>;
    handleApplyFix: (issue: InspectionIssue, content: string, save: boolean, update: (c: string) => void) => Promise<void>;

    // Selection
    menuPosition: { x: number, y: number } | null;
    setMenuPosition: (pos: { x: number, y: number } | null) => void;
    contextMenuPosition: { x: number, y: number } | null;
    setContextMenuPosition: (pos: { x: number, y: number } | null) => void;
    selectedText: string;
    setSelectedText: (text: string) => void;
    editorRef: React.RefObject<HTMLDivElement | null>;
    handleTextSelection: () => void;
    handleContextMenu: (e: React.MouseEvent) => void;
    clearSelection: () => void;

    // Chapter data
    chapter: any;
    chapterId: number;
}

const ReaderContext = createContext<ReaderContextValue | null>(null);

export function useReaderContext() {
    const context = useContext(ReaderContext);
    if (!context) {
        throw new Error("useReaderContext must be used within ReaderProvider");
    }
    return context;
}

interface ReaderProviderProps {
    children: ReactNode;
    chapterId: number;
    chapter: any;
}

export function ReaderProvider({ children, chapterId, chapter }: ReaderProviderProps) {
    const config = useReaderConfig();
    const selection = useReaderSelection();
    const inspection = useReaderInspection(chapterId, chapter);
    const tts = useReaderTTS(
        chapterId,
        chapter?.content_translated,
        config.readerConfig
    );

    const value: ReaderContextValue = {
        // Config
        readerConfig: config.readerConfig,
        setReaderConfig: config.setReaderConfig,
        updateConfig: config.updateConfig,
        showSettings: config.showSettings,
        setShowSettings: config.setShowSettings,

        // TTS
        isTTSPlaying: tts.isTTSPlaying,
        isTTSLoading: tts.isTTSLoading,
        activeTTSIndex: tts.activeTTSIndex,
        ttsSegments: [],
        handleTTSPlay: async () => { },
        handleTTSStop: tts.stopTTS,
        handleTTSToggle: tts.toggleTTS,

        // Inspection
        isInspecting: inspection.isInspecting,
        inspectionIssues: inspection.inspectionIssues,
        setInspectionIssues: inspection.setInspectionIssues,
        activeIssue: inspection.activeIssue,
        setActiveIssue: inspection.setActiveIssue,
        handleInspect: inspection.handleInspect,
        handleApplyFix: inspection.handleApplyFix,

        // Selection
        menuPosition: selection.menuPosition,
        setMenuPosition: selection.setMenuPosition,
        contextMenuPosition: selection.contextMenuPosition,
        setContextMenuPosition: selection.setContextMenuPosition,
        selectedText: selection.selectedText,
        setSelectedText: selection.setSelectedText,
        editorRef: selection.editorRef,
        handleTextSelection: selection.handleTextSelection,
        handleContextMenu: selection.handleContextMenu,
        clearSelection: selection.clearSelection,

        // Chapter data
        chapter,
        chapterId,
    };

    return (
        <ReaderContext.Provider value={value}>
            {children}
        </ReaderContext.Provider>
    );
}
