"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, clearChapterTranslation } from "@/lib/db";
import { toast } from "sonner";

// Components
import { ReaderHeader } from "./ReaderHeader";
import { ReaderContent } from "./ReaderContent";
import { ReaderDialogs } from "./ReaderDialogs";
import { ReviewDialog } from "./ReviewDialog";
import { TextSelectionMenu } from "./TextSelectionMenu";
import { ReaderContextMenu } from "./ReaderContextMenu";

// Hooks
import { useReaderSettings } from "./hooks/useReaderSettings";
import { useReaderTTS } from "./hooks/useReaderTTS";
import { useReaderKeybinds } from "./hooks/useReaderKeybinds";
import { useReaderNavigation } from "./hooks/useReaderNavigation";
import { useReaderSelection } from "./hooks/useReaderSelection";
import { useCorrections } from "./hooks/useCorrections";
import { useReaderInspection } from "./hooks/useReaderInspection";
import { useAIExtraction } from "./editor/hooks/useAIExtraction";

// Utils
import { formatChapterToParagraphs } from "./utils/formatChapter";

interface ReaderModalProps {
    chapterId: number;
    isOpen: boolean;
    onClose: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    hasPrev?: boolean;
    hasNext?: boolean;
}

export function ReaderModal({
    chapterId,
    onClose,
    onNext,
    onPrev,
    hasPrev,
    hasNext
}: ReaderModalProps) {
    // 1. DATA LAYER (External Sync)
    const chapter = useLiveQuery(() => db.chapters.get(chapterId), [chapterId]);
    const dictEntries = useLiveQuery(() => db.dictionary.where("workspaceId").equals(chapter?.workspaceId || "").toArray(), [chapter?.workspaceId]);

    // 2. CORE UI STATE
    const [activeTab, setActiveTab] = useState<"translated" | "original">("translated");
    const [isParallel, setIsParallel] = useState(false);
    const [editContent, setEditContent] = useState("");
    const [showSettings, setShowSettings] = useState(false);
    const [isDisabled, setIsDisabled] = useState(false);

    // 3. FEATURE HOOKS
    const { readerConfig, setReaderConfig } = useReaderSettings();
    const {
        isTTSPlaying, isTTSLoading, activeTTSIndex, toggleTTS, stopTTS
    } = useReaderTTS(chapterId, chapter?.content_translated || "", readerConfig);

    // Cooldown logic for actions
    const handleActionStart = useCallback(() => {
        setIsDisabled(true);
        const timer = setTimeout(() => {
            setIsDisabled(false);
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    // 3.1. Navigation & Scroll
    const {
        scrollViewportRef,
        handleScroll,
        handleWheel
    } = useReaderNavigation({
        chapterId,
        hasNext: !!hasNext,
        onNext,
        stopTTS,
        isDisabled // Cooldown from actions
    });

    // 3.2. Text Selection & Menu
    const {
        menuPosition, setMenuPosition,
        contextMenuPosition, setContextMenuPosition,
        selectedText,
        editorRef,
        handleTextSelection,
        handleContextMenu,
        clearSelection
    } = useReaderSelection();

    // 3.3. Inspection
    const {
        isInspecting,
        inspectionIssues,
        activeIssue,
        setActiveIssue,
        handleInspect,
        handleApplyFix
    } = useReaderInspection(chapterId, chapter);

    const {
        isAIExtracting,
        pendingCharacters,
        pendingTerms,
        isReviewOpen,
        setIsReviewOpen,
        handleAIExtractChapter,
        handleConfirmSaveAI
    } = useAIExtraction(chapter?.workspaceId || "", dictEntries || []);

    // 3.4. Corrections & Dictionary
    const {
        correctionOpen, setCorrectionOpen,
        correctionType, setCorrectionType,
        correctionOriginal, setCorrectionOriginal,
        correctionReplacement, setCorrectionReplacement,
        correctionField3, setCorrectionField3,
        handleSaveCorrection,
        openCorrection,
        dictDialogOpen, setDictDialogOpen,
        dictOriginal, setDictOriginal,
        dictTranslated, setDictTranslated,
        handleSaveDictionary,
        openDictionary
    } = useCorrections({
        chapterId,
        chapter,
        editContent,
        setEditContent,
        onActionStart: () => {
            handleActionStart();
            clearSelection();
        }
    });

    // 3.5. Keybinds
    useReaderKeybinds({ onClose, onNext, onPrev, hasPrev, hasNext, scrollViewportRef });

    // 4. EFFECTS & LOGIC

    // Sync DB -> Local State
    useEffect(() => {
        if (chapter) {
            const timer = setTimeout(() => {
                setEditContent(chapter.content_translated || "");
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [chapter?.id, chapter]);

    // Auto-Save
    useEffect(() => {
        if (!chapter) return;
        const timer = setTimeout(async () => {
            if (editContent !== chapter.content_translated) {
                await db.chapters.update(chapterId, { content_translated: editContent });
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [editContent, chapterId, chapter]);

    // Format Logic
    const paragraphsData = useMemo(() => formatChapterToParagraphs({
        text: editContent,
        activeTTSIndex,
        inspectionIssues
    }), [editContent, activeTTSIndex, inspectionIssues]);

    // Reader Actions Handlers
    const handleClearTranslation = async () => {
        if (!confirm("Xóa bản dịch của chương này để dịch lại?")) return;
        await clearChapterTranslation(chapterId);
        toast.success("Đã xóa bản dịch.");
    };

    const handleMenuAction = async (action: "dictionary" | "blacklist" | "correction" | "copy") => {
        if (!selectedText || !chapter) return;

        switch (action) {
            case "copy":
                await navigator.clipboard.writeText(selectedText);
                toast.success("Đã sao chép!");
                clearSelection();
                break;
            case "dictionary":
                openDictionary(selectedText);
                clearSelection();
                break;
            case "correction":
                openCorrection(selectedText);
                clearSelection();
                break;
            case "blacklist":
                if (!chapter.workspaceId) return;
                await db.blacklist.add({
                    workspaceId: chapter.workspaceId,
                    word: selectedText,
                    translated: selectedText,
                    source: 'manual',
                    createdAt: new Date()
                });
                toast.success(`Đã thêm vào Blacklist`);
                clearSelection();
                break;
        }
    };

    if (!chapter) return null;

    return (
        <div className="fixed inset-x-0 bottom-0 top-[31px] z-[100] flex items-center justify-center bg-transparent animate-in slide-in-from-bottom-8 duration-500 ease-out">
            <div className="w-full h-full bg-background rounded-t-[32px] overflow-hidden flex flex-col border-t border-border shadow-2xl relative">
                <ReaderHeader
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    chapter={chapter}
                    isParallel={isParallel}
                    setIsParallel={setIsParallel}
                    isInspecting={isInspecting}
                    handleInspect={() => handleInspect(editContent)}
                    inspectionIssues={inspectionIssues}
                    showSettings={showSettings}
                    setShowSettings={setShowSettings}
                    readerConfig={readerConfig}
                    setReaderConfig={setReaderConfig}
                    onNext={onNext}
                    hasPrev={hasPrev}
                    hasNext={hasNext}
                    onClose={onClose}
                    isTTSPlaying={isTTSPlaying}
                    isTTSLoading={isTTSLoading}
                    handleTTSPlay={toggleTTS}
                    handleTTSStop={stopTTS}
                    selectedVoice={readerConfig.ttsVoice}
                    setSelectedVoice={(voice) => setReaderConfig(prev => ({ ...prev, ttsVoice: voice }))}
                    ttsPitch={readerConfig.ttsPitch}
                    setTtsPitch={(pitch) => setReaderConfig(prev => ({ ...prev, ttsPitch: pitch }))}
                    ttsRate={readerConfig.ttsRate}
                    setTtsRate={(rate) => setReaderConfig(prev => ({ ...prev, ttsRate: rate }))}
                    onClearTranslation={handleClearTranslation}
                    onAIExtract={() => handleAIExtractChapter(chapter.content_original || "")}
                />

                <ReaderContent
                    key={chapter.id}
                    activeTab={activeTab}
                    isParallel={isParallel}
                    readerConfig={readerConfig}
                    chapter={chapter}
                    inspectionIssues={inspectionIssues}
                    activeTTSIndex={activeTTSIndex}
                    paragraphsData={paragraphsData}
                    setEditContent={setEditContent}
                    handleTextSelection={handleTextSelection}
                    handleContextMenu={handleContextMenu}
                    setActiveIssue={setActiveIssue}
                    scrollViewportRef={scrollViewportRef}
                    editorRef={editorRef}
                    handleScroll={(e) => {
                        handleScroll(e);
                        if (menuPosition) setMenuPosition(null);
                        if (contextMenuPosition) setContextMenuPosition(null);
                    }}
                    handleWheel={handleWheel}
                    onNext={onNext}
                    hasNext={hasNext}
                />
            </div>

            <TextSelectionMenu
                position={menuPosition}
                selectedText={selectedText}
                onAction={handleMenuAction}
                onClose={() => setMenuPosition(null)}
            />

            <ReaderContextMenu
                position={contextMenuPosition}
                selectedText={selectedText}
                onAction={handleMenuAction}
                onClose={() => setContextMenuPosition(null)}
            />

            <ReaderDialogs
                correctionOpen={correctionOpen}
                setCorrectionOpen={setCorrectionOpen}
                correctionType={correctionType}
                setCorrectionType={setCorrectionType}
                correctionOriginal={correctionOriginal}
                setCorrectionOriginal={setCorrectionOriginal}
                correctionReplacement={correctionReplacement}
                setCorrectionReplacement={setCorrectionReplacement}
                correctionField3={correctionField3}
                setCorrectionField3={setCorrectionField3}
                handleSaveCorrection={handleSaveCorrection}

                dictDialogOpen={dictDialogOpen}
                setDictDialogOpen={setDictDialogOpen}
                dictOriginal={dictOriginal}
                setDictOriginal={setDictOriginal}
                dictTranslated={dictTranslated}
                setDictTranslated={setDictTranslated}
                handleSaveDictionary={handleSaveDictionary}

                activeIssue={activeIssue}
                setActiveIssue={setActiveIssue}
                handleApplyFix={(issue, save) => handleApplyFix(issue, editContent, save, setEditContent)}
            />

            <ReviewDialog
                open={isReviewOpen}
                onOpenChange={setIsReviewOpen}
                characters={pendingCharacters as any}
                terms={pendingTerms as any}
                onSave={handleConfirmSaveAI}
            />
        </div>
    );
}
