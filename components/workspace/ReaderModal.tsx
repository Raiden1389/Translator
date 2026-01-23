"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Chapter } from "@/lib/db";
import { inspectChapter, InspectionIssue } from "@/lib/gemini";
import { getErrorMessage } from "@/lib/types";
import { toast } from "sonner";
import { TextSelectionMenu } from "./TextSelectionMenu";

import { ReaderContextMenu } from "./ReaderContextMenu";
import { ReaderHeader, ReaderConfig } from "./ReaderHeader";
import { ReaderContent } from "./ReaderContent";
import { ReaderDialogs } from "./ReaderDialogs";
import { formatReaderText } from "./utils/readerFormatting";

import { useReaderSettings } from "./hooks/useReaderSettings";
import { useReaderTTS } from "./hooks/useReaderTTS";
import { useReaderKeybinds } from "./hooks/useReaderKeybinds";

interface ReaderModalProps {
    chapterId: number;
    isOpen: boolean;
    onClose: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    hasPrev?: boolean;
    hasNext?: boolean;
    workspaceChapters?: Chapter[];
}

export function ReaderModal({ chapterId, onClose, onNext, onPrev, hasPrev, hasNext }: ReaderModalProps) {
    const chapter = useLiveQuery(() => db.chapters.get(chapterId), [chapterId]);

    // UI State
    const [activeTab, setActiveTab] = useState<"translated" | "original">("translated");
    const [isParallel, setIsParallel] = useState(false);
    const [editContent, setEditContent] = useState("");
    const [showSettings, setShowSettings] = useState(false);

    // Custom Hooks
    const { readerConfig, setReaderConfig } = useReaderSettings();
    const { isTTSPlaying, isTTSLoading, activeTTSIndex, toggleTTS, stopTTS } = useReaderTTS(chapterId, chapter?.content_translated || "", readerConfig);

    const scrollViewportRef = useRef<HTMLDivElement>(null);
    useReaderKeybinds({ onClose, onNext, onPrev, hasPrev, hasNext, scrollViewportRef });

    // Selection & Menu State
    const [menuPosition, setMenuPosition] = useState<{ x: number, y: number } | null>(null);
    const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number, y: number } | null>(null);
    const [selectedText, setSelectedText] = useState("");
    const editorRef = useRef<HTMLDivElement>(null);

    // Dialog States
    const [correctionOpen, setCorrectionOpen] = useState(false);
    const [correctionOriginal, setCorrectionOriginal] = useState("");
    const [correctionReplacement, setCorrectionReplacement] = useState("");
    const [dictDialogOpen, setDictDialogOpen] = useState(false);
    const [dictOriginal, setDictOriginal] = useState("");
    const [dictTranslated, setDictTranslated] = useState("");
    const [isAutoNavigating, setIsAutoNavigating] = useState(false);

    // Inspection State
    const [isInspecting, setIsInspecting] = useState(false);
    const [inspectionIssues, setInspectionIssues] = useState<InspectionIssue[]>([]);
    const [activeIssue, setActiveIssue] = useState<InspectionIssue | null>(null);

    // Derived Logic
    // OPTIMIZATION: We exclude chapter.content_translated from dependencies to prevent 
    // cursor jumping when typing (which triggers DB save -> live query update).
    // The content only updates conceptually when:
    // 1. Chapter ID changes (Navigation)
    // 2. Inspection issues change (User runs inspect)
    // 3. TTS active index changes (Reading highlight)
    const htmlContent = useMemo(() => ({
        __html: formatReaderText((chapter?.content_translated || "").normalize('NFC'), inspectionIssues, activeTTSIndex)
    }), [chapter?.id, inspectionIssues, activeTTSIndex]); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync Edit Content
    useEffect(() => {
        if (chapter) {
            // Only sync from DB to local state on chapter change to default, 
            // or if we strictly want to support external updates (but that risks loops).
            // For now, simple sync on mount/id change is safest.
            setEditContent(chapter.content_translated || "");
            setInspectionIssues(chapter.inspectionResults || []);
        }
        return () => setInspectionIssues([]);
    }, [chapter?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-Save Content
    useEffect(() => {
        if (!chapter) return;
        const timer = setTimeout(async () => {
            if (editContent !== chapter.content_translated) {
                await db.chapters.update(chapterId, { content_translated: editContent });
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [editContent, chapterId, chapter]);

    // Reset Scroll on Chapter Change
    useEffect(() => {
        if (scrollViewportRef.current) scrollViewportRef.current.scrollTo(0, 0);
        stopTTS();
        setIsAutoNavigating(false);
        setIsReadyToNext(false);
    }, [chapterId, stopTTS]);

    // Handlers (Memoized for ReaderContent)
    const [isReadyToNext, setIsReadyToNext] = useState(false);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        if (menuPosition) setMenuPosition(null);
        if (contextMenuPosition) setContextMenuPosition(null);

        const target = e.currentTarget;
        const { scrollTop, scrollHeight, clientHeight } = target;
        const distanceToBottom = scrollHeight - scrollTop - clientHeight;

        // "Double Scroll" Logic
        if (distanceToBottom < 10) {
            if (hasNext && !isAutoNavigating && onNext) {
                if (!isReadyToNext) {
                    setIsReadyToNext(true);
                    toast("Cuộn thêm lần nữa để chuyển chương", {
                        position: "bottom-center",
                        duration: 1500,
                        className: "bg-primary text-primary-foreground font-bold"
                    });
                } else {
                    // Reduce sensitivity for the second confirm
                    // User must be REALLY at the bottom
                    setIsAutoNavigating(true);
                    onNext();
                }
            }
        } else if (distanceToBottom > 100) {
            // Reset if user scrolls up significantly
            if (isReadyToNext) setIsReadyToNext(false);
        }
    }, [hasNext, isAutoNavigating, onNext, menuPosition, contextMenuPosition, isReadyToNext]);

    const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
        // Removed auto-prev/next on wheel
    }, []);

    const handleTextSelection = useCallback(() => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0 && editorRef.current?.contains(selection.anchorNode)) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setMenuPosition({ x: rect.left + rect.width / 2, y: rect.top });
            setSelectedText(selection.toString().trim());
        } else {
            setMenuPosition(null);
            setSelectedText("");
        }
    }, []);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
            e.preventDefault();
            setSelectedText(selection.toString().trim());
            setContextMenuPosition({ x: e.clientX, y: e.clientY });
            setMenuPosition(null);
        }
    }, []);

    // Menu Actions
    const handleMenuAction = async (action: "dictionary" | "blacklist" | "correction" | "copy") => {
        if (!selectedText || !chapter) return;
        if (action === "copy") {
            navigator.clipboard.writeText(selectedText);
            toast.success("Đã sao chép!");
            setContextMenuPosition(null);
            setMenuPosition(null);
            return;
        }
        if (action === "dictionary") {
            setDictOriginal(selectedText);
            setDictTranslated(selectedText);
            setDictDialogOpen(true);
        } else if (action === "blacklist") {
            if (!chapter.workspaceId) return;
            const existing = await db.blacklist.where({ word: selectedText, workspaceId: chapter.workspaceId }).first();
            if (!existing) {
                await db.blacklist.add({
                    workspaceId: chapter.workspaceId,
                    word: selectedText,
                    translated: selectedText,
                    source: 'manual',
                    createdAt: new Date()
                });
                toast.success(`Đã thêm vào Blacklist`);
            }
        } else if (action === "correction") {
            setCorrectionOriginal(selectedText);
            setCorrectionReplacement(selectedText);
            setCorrectionOpen(true);
        }
        setMenuPosition(null);
        setContextMenuPosition(null);
    };

    // Dialog Handlers
    const handleSaveCorrection = async () => {
        if (!correctionOriginal || !correctionReplacement || !chapter) return;
        await db.corrections.add({
            workspaceId: chapter.workspaceId,
            original: correctionOriginal,
            replacement: correctionReplacement,
            createdAt: new Date()
        });
        const newText = editContent.split(correctionOriginal).join(correctionReplacement);
        await db.chapters.update(chapterId, { content_translated: newText });
        setEditContent(newText);
        toast.success("Đã lưu quy tắc sửa lỗi!");
        setCorrectionOpen(false);
    };

    const handleSaveDictionary = async () => {
        if (!dictOriginal || !dictTranslated || !chapter?.workspaceId) return;
        const existing = await db.dictionary.where({ original: dictOriginal, workspaceId: chapter.workspaceId }).first();
        if (!existing) {
            await db.dictionary.add({
                workspaceId: chapter.workspaceId,
                original: dictOriginal,
                translated: dictTranslated,
                type: 'general',
                createdAt: new Date()
            });
            toast.success("Đã thêm từ mới");
        } else {
            if (confirm(`"${dictOriginal}" đã có. Cập nhật nghĩa không?`)) {
                await db.dictionary.update(existing.id!, { translated: dictTranslated });
                toast.success("Đã cập nhật từ điển");
            }
        }
        setDictDialogOpen(false);
    };

    // Inspection
    const handleInspect = async () => {
        if (!editContent || isInspecting || !chapter) return;
        setIsInspecting(true);
        try {
            const issues = await inspectChapter(chapter.workspaceId, editContent);
            setInspectionIssues(issues);
            await db.chapters.update(chapterId, { inspectionResults: issues });
            if (issues.length === 0) toast.success("Không tìm thấy lỗi nào!");
            else toast.warning(`Tìm thấy ${issues.length} vấn đề.`);
        } catch (error) {
            toast.error("Lỗi kiểm tra: " + getErrorMessage(error));
        } finally {
            setIsInspecting(false);
        }
    };

    const handleApplyFix = async (issue: InspectionIssue, saveToCorrections: boolean) => {
        if (!editContent || !chapter) return;
        if (saveToCorrections) {
            await db.corrections.add({
                workspaceId: chapter.workspaceId,
                original: issue.original,
                replacement: issue.suggestion,
                createdAt: new Date()
            });
        }
        const newText = editContent.split(issue.original).join(issue.suggestion);
        setEditContent(newText);
        await db.chapters.update(chapterId, { content_translated: newText });

        const newIssues = inspectionIssues.filter(i => i.original !== issue.original);
        setInspectionIssues(newIssues);
        await db.chapters.update(chapterId, { inspectionResults: newIssues });
        setActiveIssue(null);
        toast.success("Đã sửa lỗi!");
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
                    handleInspect={handleInspect}
                    inspectionIssues={inspectionIssues}
                    showSettings={showSettings}
                    setShowSettings={setShowSettings}
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
                    setSelectedVoice={(voice) => setReaderConfig((prev: ReaderConfig) => ({ ...prev, ttsVoice: voice }))}
                    ttsPitch={readerConfig.ttsPitch}
                    setTtsPitch={(pitch) => setReaderConfig((prev: ReaderConfig) => ({ ...prev, ttsPitch: pitch }))}
                    ttsRate={readerConfig.ttsRate}
                    setTtsRate={(rate) => setReaderConfig((prev: ReaderConfig) => ({ ...prev, ttsRate: rate }))}
                />

                <ReaderContent
                    key={chapter.id}
                    activeTab={activeTab}
                    isParallel={isParallel}
                    readerConfig={readerConfig}
                    chapter={chapter}
                    inspectionIssues={inspectionIssues}
                    activeTTSIndex={activeTTSIndex}
                    htmlContent={htmlContent}
                    setEditContent={setEditContent}
                    handleTextSelection={handleTextSelection}
                    handleContextMenu={handleContextMenu}
                    setActiveIssue={setActiveIssue}
                    scrollViewportRef={scrollViewportRef}
                    editorRef={editorRef}
                    handleScroll={handleScroll}
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
                correctionOriginal={correctionOriginal}
                correctionReplacement={correctionReplacement}
                setCorrectionReplacement={setCorrectionReplacement}
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
                handleApplyFix={handleApplyFix}
            />
        </div>
    );
}
