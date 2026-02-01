"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, clearChapterTranslation, type Chapter } from "@/lib/db";
import { toast } from "sonner";

// Components
import { ReaderHeader } from "./ReaderHeader";
import { ReaderContent } from "./ReaderContent";
import { ReaderDialogs } from "./ReaderDialogs";
import { ReviewDialog } from "./ReviewDialog";
import { TextSelectionMenu } from "./TextSelectionMenu";
import { ReaderContextMenu } from "./ReaderContextMenu";
import { FloatingProgressPill } from "./FloatingProgressPill";
import { BackToTop } from "./BackToTop";

// Hooks
import { useReaderSettings } from "./hooks/useReaderSettings";
import { useReaderTTS } from "./hooks/useReaderTTS";
import { useReaderKeybinds } from "./hooks/useReaderKeybinds";
import { useReaderNavigation } from "./hooks/useReaderNavigation";
import { useReaderSelection } from "./hooks/useReaderSelection";
import { useCorrections } from "./hooks/useCorrections";
import { useReaderInspection } from "./hooks/useReaderInspection";
import { useAIExtraction } from "./editor/hooks/useAIExtraction";
import { type ExtractedCharacter, type ExtractedTerm } from "@/lib/gemini/types";

// Utils
import { formatChapterToParagraphs } from "./utils/formatChapter";

const ReaderSkeleton = () => (
    <div className="animate-pulse space-y-8 p-12 max-w-[720px] mx-auto w-full">
        <div className="h-10 bg-muted/40 rounded-xl w-3/4 mx-auto mb-16" />
        {[...Array(12)].map((_, i) => (
            <div key={i} className="space-y-3">
                <div className="h-4 bg-muted/30 rounded-lg w-full" />
                <div className="h-4 bg-muted/30 rounded-lg w-11/12" />
                <div className="h-4 bg-muted/30 rounded-lg w-4/5" />
            </div>
        ))}
    </div>
);

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
    // 1. DATA LAYER
    const chapter = useLiveQuery(() => db.chapters.get(chapterId), [chapterId]);
    const dictEntries = useLiveQuery(() => db.dictionary.where("workspaceId").equals(chapter?.workspaceId || "").toArray(), [chapter?.workspaceId]);
    const corrections = useLiveQuery(() => db.corrections.where("workspaceId").equals(chapter?.workspaceId || "").toArray(), [chapter?.workspaceId]);

    // 2. CORE UI STATE
    const [activeTab, setActiveTab] = useState<"translated" | "original">("translated");
    const [isParallel, setIsParallel] = useState(false);
    const [editContent, setEditContent] = useState("");
    const [showSettings, setShowSettings] = useState(false);
    const [isDisabled, setIsDisabled] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // 3. UI PROGRESS STATE
    const [scrollProgress, setScrollProgress] = useState(0);
    const [showBackToTop, setShowBackToTop] = useState(false);

    // 4. FEATURE HOOKS
    const { readerConfig, setReaderConfig } = useReaderSettings();
    const {
        isTTSPlaying, isTTSLoading, activeTTSIndex, toggleTTS, stopTTS
    } = useReaderTTS(chapterId, chapter?.content_translated || "", readerConfig);

    const handleActionStart = useCallback(() => {
        setIsDisabled(true);
        const timer = setTimeout(() => setIsDisabled(false), 1500);
        return () => clearTimeout(timer);
    }, []);

    const {
        scrollViewportRef,
        isHeaderVisible,
        handleScroll,
        handleWheel
    } = useReaderNavigation({
        chapterId,
        hasNext: !!hasNext,
        onNext,
        stopTTS,
        isDisabled
    });

    const {
        menuPosition, setMenuPosition,
        contextMenuPosition, setContextMenuPosition,
        selectedText,
        editorRef,
        handleTextSelection,
        handleContextMenu,
        clearSelection
    } = useReaderSelection();

    const {
        isInspecting, inspectionIssues, activeIssue, setActiveIssue, handleInspect, handleApplyFix
    } = useReaderInspection(chapterId, chapter);

    const {
        pendingCharacters, pendingTerms, isReviewOpen, setIsReviewOpen, handleAIExtractChapter, handleConfirmSaveAI
    } = useAIExtraction(chapter?.workspaceId || "", dictEntries || []);

    const {
        correctionOpen, setCorrectionOpen, correctionType, setCorrectionType,
        correctionOriginal, setCorrectionOriginal, correctionReplacement, setCorrectionReplacement,
        correctionField3, setCorrectionField3, handleSaveCorrection, openCorrection,
        dictDialogOpen, setDictDialogOpen, dictOriginal, setDictOriginal,
        dictTranslated, setDictTranslated, handleSaveDictionary, openDictionary
    } = useCorrections({
        chapterId, chapter, editContent, setEditContent,
        onActionStart: () => { handleActionStart(); clearSelection(); }
    });

    useReaderKeybinds({ onClose, onNext, onPrev, hasPrev, hasNext, scrollViewportRef });

    // 5. EFFECTS & HANDLERS

    useEffect(() => {
        if (chapter) {
            const content = chapter.content_translated || "";
            setTimeout(() => setEditContent(content), 0);
        }
    }, [chapter?.id, chapter]);

    useEffect(() => {
        if (!chapter) return;
        const timer = setTimeout(async () => {
            if (editContent !== chapter.content_translated) {
                await db.chapters.update(chapterId, { content_translated: editContent });
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [editContent, chapterId, chapter]);

    const paragraphsData = useMemo(() => formatChapterToParagraphs({
        text: editContent,
        activeTTSIndex,
        inspectionIssues,
        corrections: corrections || [],
        glossary: dictEntries || []
    }), [editContent, activeTTSIndex, inspectionIssues, corrections, dictEntries]);

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
                break;
            case "dictionary":
                openDictionary(selectedText);
                break;
            case "correction":
                openCorrection(selectedText);
                break;
            case "blacklist":
                if (!chapter.workspaceId) return;
                await db.blacklist.add({
                    workspaceId: chapter.workspaceId,
                    word: selectedText, translated: selectedText,
                    source: 'manual', createdAt: new Date()
                });
                toast.success(`Đã thêm vào Blacklist`);
                break;
        }
        clearSelection();
    };

    const scrollToTop = useCallback(() => {
        if (scrollViewportRef.current) {
            scrollViewportRef.current.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }
    }, [scrollViewportRef]);

    return (
        <div className="fixed inset-x-0 bottom-[28px] top-[32px] z-100 flex items-center justify-center bg-transparent animate-in slide-in-from-bottom-8 duration-500 ease-out">
            <div className="w-full h-full bg-background rounded-t-[32px] overflow-hidden flex flex-col border-t border-border shadow-2xl relative">
                <div className="relative flex-1 flex flex-col overflow-hidden">
                    <ReaderHeader
                        isHeaderVisible={isHeaderVisible}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        chapter={chapter || { id: chapterId, workspaceId: "", title: "Loading...", content_original: "", content_translated: "", order: 0, status: "draft" } as unknown as Chapter}
                        isParallel={isParallel}
                        setIsParallel={setIsParallel}
                        isInspecting={isInspecting}
                        handleInspect={() => handleInspect(editContent)}
                        inspectionIssues={inspectionIssues}
                        showSettings={showSettings}
                        setShowSettings={setShowSettings}
                        isEditing={isEditing}
                        setIsEditing={setIsEditing}
                        readerConfig={readerConfig}
                        setReaderConfig={setReaderConfig}
                        onPrev={onPrev}
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
                        onAIExtract={() => handleAIExtractChapter(chapter?.content_original || "")}
                        scrollProgress={scrollProgress}
                    />

                    {chapter ? (
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
                            isEditing={isEditing}
                            handleTextSelection={handleTextSelection}
                            handleContextMenu={handleContextMenu}
                            setActiveIssue={setActiveIssue}
                            scrollViewportRef={scrollViewportRef}
                            editorRef={editorRef}
                            handleScroll={(e) => {
                                handleScroll(e);
                                const target = e.currentTarget;
                                const progress = (target.scrollTop / (target.scrollHeight - target.clientHeight)) * 100;
                                setScrollProgress(progress);

                                setShowBackToTop(target.scrollTop > target.clientHeight * 1.5);

                                if (menuPosition) setMenuPosition(null);
                                if (contextMenuPosition) setContextMenuPosition(null);
                            }}
                            handleWheel={handleWheel}
                            onNext={onNext}
                            hasNext={hasNext}
                        />
                    ) : (
                        <ReaderSkeleton />
                    )}
                </div>

                {/* MODULAR FLOATING UI STACK */}
                <FloatingProgressPill
                    progress={scrollProgress}
                    className="bottom-20 right-6" // Shift up to avoid overlap
                />

                <BackToTop
                    isVisible={showBackToTop}
                    onClick={scrollToTop}
                    color={readerConfig.textColor}
                />

                {/* SLIM PERSISTENT BOTTOM PROGRESS BAR */}
                <div className="absolute bottom-0 left-0 w-full h-px bg-border/20 z-50">
                    <div
                        className="h-full bg-primary/40 transition-all duration-300 ease-out"
                        style={{ width: `${Math.round(scrollProgress)}%` }}
                    />
                </div>
            </div>

            <TextSelectionMenu position={menuPosition} selectedText={selectedText} onAction={handleMenuAction} onClose={() => setMenuPosition(null)} />
            <ReaderContextMenu position={contextMenuPosition} selectedText={selectedText} onAction={handleMenuAction} onClose={() => setContextMenuPosition(null)} />
            <ReaderDialogs
                correctionOpen={correctionOpen} setCorrectionOpen={setCorrectionOpen} correctionType={correctionType} setCorrectionType={setCorrectionType}
                correctionOriginal={correctionOriginal} setCorrectionOriginal={setCorrectionOriginal} correctionReplacement={correctionReplacement} setCorrectionReplacement={setCorrectionReplacement}
                correctionField3={correctionField3} setCorrectionField3={setCorrectionField3} handleSaveCorrection={handleSaveCorrection}
                dictDialogOpen={dictDialogOpen} setDictDialogOpen={setDictDialogOpen} dictOriginal={dictOriginal} setDictOriginal={setDictOriginal}
                dictTranslated={dictTranslated} setDictTranslated={setDictTranslated} handleSaveDictionary={handleSaveDictionary}
                activeIssue={activeIssue} setActiveIssue={setActiveIssue} handleApplyFix={(issue, save) => handleApplyFix(issue, editContent, save, setEditContent)}
            />
            <ReviewDialog open={isReviewOpen} onOpenChange={setIsReviewOpen} characters={pendingCharacters as ExtractedCharacter[]} terms={pendingTerms as ExtractedTerm[]} onSave={handleConfirmSaveAI} />
        </div>
    );
}
