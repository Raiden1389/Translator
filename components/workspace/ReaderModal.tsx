"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { X, ChevronLeft, ChevronRight, SplitSquareHorizontal, Edit3, BookOpen, FileText, Settings, Type, AlignLeft, AlignCenter, AlignRight, AlignJustify, ShieldCheck, Sparkles, AlertTriangle } from "lucide-react";
import { inspectChapter, InspectionIssue } from "@/lib/gemini";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TextSelectionMenu } from "./TextSelectionMenu";
import { speak, prefetchTTS, VIETNAMESE_VOICES } from "@/lib/tts";

import { ReaderContextMenu } from "./ReaderContextMenu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReaderHeader, ReaderConfig } from "./ReaderHeader";

interface ReaderModalProps {
    chapterId: number;
    isOpen: boolean;
    onClose: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    hasPrev?: boolean;
    hasNext?: boolean;
    workspaceChapters?: any[];
}

// Shared logic for both UI rendering and TTS segmenting
const splitIntoParagraphs = (text: string): string[] => {
    if (!text) return [];

    // 1. Initial split by newlines
    let paragraphs = text.split('\n').map(p => p.trim()).filter(p => p.length > 0);

    // 2. Smart splitting for very long blocks (often happens in AI translations)
    return paragraphs.flatMap(para => {
        if (para.length > 600) {
            // Split at sentence endings followed by space
            const sentences = para.split(/([.!?。！？]\s*)/);
            const smartParas: string[] = [];
            let currentPara = '';

            for (let i = 0; i < sentences.length; i++) {
                currentPara += sentences[i];
                if (sentences[i].match(/[.!?。！？]\s*/) && currentPara.length > 300) {
                    smartParas.push(currentPara.trim());
                    currentPara = '';
                }
            }
            if (currentPara.trim()) smartParas.push(currentPara.trim());
            return smartParas;
        }
        return [para];
    });
};

const formatReaderText = (text: string, issues: InspectionIssue[] = [], activeTTSIndex: number | null = null) => {
    if (!text) return "";

    const paragraphs = splitIntoParagraphs(text);

    return paragraphs.map((para, index) => {
        let formattedPara = para;

        // 1. Quotes: "Hello" -> <i>"Hello"</i>
        formattedPara = formattedPara.replace(/"([^"]+)"/g, '<i>"$1"</i>');

        // 2. Dashes: - Hello -> - <i>Hello</i>
        if (formattedPara.trim().startsWith('-') || formattedPara.trim().startsWith('—')) {
            formattedPara = formattedPara.replace(/^([-—])\s*(.*)/, '$1 <i>$2</i>');
        }

        // 3. Apply Issues Highlighting
        issues.sort((a, b) => b.original.length - a.original.length).forEach(issue => {
            if (formattedPara.includes(issue.original)) {
                formattedPara = formattedPara.split(issue.original).join(
                    `<span class="bg-yellow-500/20 underline decoration-yellow-500 decoration-wavy cursor-pointer hover:bg-yellow-500/30 transition-colors" data-issue-original="${issue.original}">
                        ${issue.original}
                      </span>`
                );
            }
        });

        const isHighlighted = activeTTSIndex === index;
        const isTTSMode = activeTTSIndex !== null;

        const highlightClass = isHighlighted
            ? "opacity-100 bg-white/[0.04] px-6 -mx-6 py-4 rounded-xl border-l-2 border-emerald-400 mb-8 transition-all duration-300 ease-out"
            : `mb-8 transition-all duration-500 ${isTTSMode ? "opacity-50 hover:opacity-100" : "opacity-100"}`;
        return `<p id="tts-para-${index}" class="${highlightClass}">${formattedPara}</p>`;
    }).join('');
};

export function ReaderModal({ chapterId, onClose, onNext, onPrev, hasPrev, hasNext }: ReaderModalProps) {
    const chapter = useLiveQuery(() => db.chapters.get(chapterId), [chapterId]);
    const [activeTab, setActiveTab] = useState<"translated" | "original">("translated");
    const [isParallel, setIsParallel] = useState(false);
    const [editContent, setEditContent] = useState("");

    // Selection Menu State
    const [menuPosition, setMenuPosition] = useState<{ x: number, y: number } | null>(null);
    const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number, y: number } | null>(null);
    const [selectedText, setSelectedText] = useState("");
    const editorRef = useRef<HTMLDivElement>(null);

    const [correctionOpen, setCorrectionOpen] = useState(false);
    const [correctionOriginal, setCorrectionOriginal] = useState("");
    const [correctionReplacement, setCorrectionReplacement] = useState("");

    // Quick Dictionary Dialog State
    const [dictDialogOpen, setDictDialogOpen] = useState(false);
    const [dictOriginal, setDictOriginal] = useState("");
    const [dictTranslated, setDictTranslated] = useState("");


    // Reader Settings
    const [showSettings, setShowSettings] = useState(false);
    const [readerConfig, setReaderConfig] = useState<ReaderConfig>({
        fontFamily: "'Bookerly', serif",
        fontSize: 18,
        lineHeight: 1.8,
        textAlign: "justify",
        textColor: "#e2e8f0",
        ttsPitch: 0,
        ttsRate: 0,
        ttsVoice: VIETNAMESE_VOICES[0].value,
    });
    const [configLoaded, setConfigLoaded] = useState(false);

    // AI Inspector State
    const [isInspecting, setIsInspecting] = useState(false);
    const [inspectionIssues, setInspectionIssues] = useState<InspectionIssue[]>([]);
    const [activeIssue, setActiveIssue] = useState<InspectionIssue | null>(null);

    const scrollViewportRef = useRef<HTMLDivElement>(null);

    // Load settings from localStorage on mount
    useEffect(() => {
        const savedConfig = localStorage.getItem("readerConfig");
        if (savedConfig) {
            try {
                setReaderConfig(JSON.parse(savedConfig));
            } catch (e) {
                console.error("Failed to parse reader config", e);
            }
        }
        setConfigLoaded(true);
    }, []);

    // Save settings to localStorage whenever they change (but only after initial load)
    useEffect(() => {
        if (configLoaded) {
            localStorage.setItem("readerConfig", JSON.stringify(readerConfig));
        }
    }, [readerConfig, configLoaded]);

    // TTS State
    const [isTTSPlaying, setIsTTSPlaying] = useState(false);
    const [isTTSLoading, setIsTTSLoading] = useState(false);
    const [activeTTSIndex, setActiveTTSIndex] = useState<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const ttsSegments = useMemo(() => {
        const text = (chapter?.content_translated || "").normalize('NFC');
        return splitIntoParagraphs(text);
    }, [chapter?.content_translated]);

    const htmlContent = useMemo(() => ({
        __html: formatReaderText((chapter?.content_translated || "").normalize('NFC'), inspectionIssues, activeTTSIndex)
    }), [chapter?.content_translated, inspectionIssues, activeTTSIndex]);

    // Sync inspection issues from DB on load
    useEffect(() => {
        if (chapter?.inspectionResults) {
            setInspectionIssues(chapter.inspectionResults);
        }

        // Cleanup on unmount to prevent memory leaks
        return () => {
            setInspectionIssues([]);
        };
    }, [chapter]);

    // Scroll to top when chapter changes
    useEffect(() => {
        if (scrollViewportRef.current) {
            scrollViewportRef.current.scrollTo(0, 0);
        }
        // Reset TTS on chapter change
        handleTTSStop();
    }, [chapterId]);

    // Warm up TTS cache for the first 3 segments of this chapter
    useEffect(() => {
        if (chapterId && ttsSegments.length > 0) {
            const pitchStr = `${readerConfig.ttsPitch >= 0 ? '+' : ''}${readerConfig.ttsPitch}Hz`;
            const rateStr = `${readerConfig.ttsRate >= 0 ? '+' : ''}${readerConfig.ttsRate}%`;

            ttsSegments.slice(0, 3).forEach(seg => {
                prefetchTTS(chapterId, seg, readerConfig.ttsVoice, pitchStr, rateStr);
            });
        }
    }, [chapterId, ttsSegments, readerConfig.ttsVoice, readerConfig.ttsPitch, readerConfig.ttsRate]);

    // Auto-scroll to highlighted TTS paragraph
    useEffect(() => {
        if (activeTTSIndex !== null) {
            const element = document.getElementById(`tts-para-${activeTTSIndex}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [activeTTSIndex]);

    // Cleanup TTS on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowLeft' && hasPrev) {
                onPrev?.();
            } else if (e.key === 'ArrowRight' && hasNext) {
                onNext?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, onPrev, onNext, hasPrev, hasNext]);

    const handleTextSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0 && editorRef.current?.contains(selection.anchorNode)) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            // Show menu centered above selection
            setMenuPosition({
                x: rect.left + rect.width / 2,
                y: rect.top
            });
            setSelectedText(selection.toString().trim());
        } else {
            setMenuPosition(null);
            setSelectedText("");
        }
    };

    // Clear selection menu when scrolling or resizing
    useEffect(() => {
        const handleScroll = () => {
            if (menuPosition) setMenuPosition(null);
            if (contextMenuPosition) setContextMenuPosition(null);
        };
        window.addEventListener("scroll", handleScroll, true);
        window.addEventListener("resize", handleScroll);
        return () => {
            window.removeEventListener("scroll", handleScroll, true);
            window.removeEventListener("resize", handleScroll);
        };
    }, [menuPosition, contextMenuPosition]);

    const handleContextMenu = (e: React.MouseEvent) => {
        const selection = window.getSelection();
        console.log("Context Menu Triggered", selection?.toString());
        if (selection && selection.toString().trim().length > 0) {
            e.preventDefault();
            setSelectedText(selection.toString().trim());
            setContextMenuPosition({ x: e.clientX, y: e.clientY });
            setMenuPosition(null); // Hide standard selection menu if showing
        } else {
            console.log("No selection found for context menu");
        }
    };

    const handleTTSPlay = async () => {
        if (isTTSPlaying && audioRef.current) {
            audioRef.current.pause();
            setIsTTSPlaying(false);
            return;
        }

        if (activeTTSIndex === null) {
            setActiveTTSIndex(0);
            playSegment(0);
        } else {
            if (audioRef.current) {
                audioRef.current.play();
                setIsTTSPlaying(true);
            } else {
                playSegment(activeTTSIndex);
            }
        }
    };

    const handleTTSStop = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setIsTTSPlaying(false);
        setActiveTTSIndex(null);
    };

    const playSegment = async (index: number) => {
        if (index >= ttsSegments.length) {
            handleTTSStop();
            return;
        }

        // Prefetch logic for next chapter when starting current chapter
        if (index === 0 && hasNext && chapter?.workspaceId && chapter?.order !== undefined) {
            db.chapters
                .where('workspaceId').equals(chapter.workspaceId)
                .and(c => c.order > chapter.order)
                .sortBy('order')
                .then(list => {
                    const next = list[0];
                    if (next && next.content_translated) {
                        const segments = splitIntoParagraphs(next.content_translated);
                        if (segments.length > 0) {
                            const pitchStr = `${readerConfig.ttsPitch >= 0 ? '+' : ''}${readerConfig.ttsPitch}Hz`;
                            const rateStr = `${readerConfig.ttsRate >= 0 ? '+' : ''}${readerConfig.ttsRate}%`;
                            prefetchTTS(next.id, segments[0], readerConfig.ttsVoice, pitchStr, rateStr);
                        }
                    }
                });
        }

        try {
            setIsTTSLoading(true);
            const text = ttsSegments[index];

            const pitchStr = `${readerConfig.ttsPitch >= 0 ? '+' : ''}${readerConfig.ttsPitch}Hz`;
            const rateStr = `${readerConfig.ttsRate >= 0 ? '+' : ''}${readerConfig.ttsRate}%`;

            const audioUrl = await speak(chapterId, text, readerConfig.ttsVoice, pitchStr, rateStr);

            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            // Trigger proactive pre-fetching for the next 2 segments
            [index + 1, index + 2].forEach(nextIdx => {
                if (nextIdx < ttsSegments.length) {
                    prefetchTTS(chapterId, ttsSegments[nextIdx], readerConfig.ttsVoice, pitchStr, rateStr);
                }
            });

            audio.onended = () => {
                const nextIndex = index + 1;
                setActiveTTSIndex(nextIndex);
                playSegment(nextIndex);
            };

            audio.onerror = (e) => {
                console.error("Audio Error:", e);
                setIsTTSPlaying(false);
                toast.error("Lỗi khi phát âm thanh!");
            };

            await audio.play();
            setIsTTSPlaying(true);
            setIsTTSLoading(false);

        } catch (error) {
            console.error("TTS Error:", error);
            toast.error("Lỗi tạo giọng đọc");
            setIsTTSLoading(false);
            setIsTTSPlaying(false);
        }
    };

    const handleMenuAction = async (action: "dictionary" | "blacklist" | "correction" | "copy") => {
        if (!selectedText) return;

        if (action === "copy") {
            navigator.clipboard.writeText(selectedText);
            toast.success("Đã sao chép!");
            setContextMenuPosition(null);
            setMenuPosition(null);
            return;
        }



        if (action === "dictionary") {
            // Quick add to dictionary - Open Dialog instead of instant save
            setDictOriginal(selectedText);
            setDictTranslated(selectedText); // Default to selected text
            setDictDialogOpen(true);
            setMenuPosition(null);
            setContextMenuPosition(null);

        } else if (action === "blacklist") {
            const existing = await db.blacklist.where("word").equals(selectedText).first();
            if (!existing) {
                await db.blacklist.add({
                    word: selectedText,
                    translated: selectedText,
                    source: 'manual',
                    createdAt: new Date()
                });
                toast.success(`Đã thêm "${selectedText}" vào Blacklist`);
            }
            setMenuPosition(null);
            setContextMenuPosition(null);
        } else if (action === "correction") {
            setCorrectionOriginal(selectedText);
            setCorrectionReplacement(selectedText); // Pre-fill with original
            setCorrectionOpen(true);
            setMenuPosition(null);
            setContextMenuPosition(null);
        }
    };

    const handleSaveCorrection = async () => {
        if (!correctionOriginal || !correctionReplacement) return;

        // 1. Save to DB
        await db.corrections.add({
            original: correctionOriginal,
            replacement: correctionReplacement,
            createdAt: new Date()
        });

        // 2. Apply to current text immediately
        if (editContent) {
            // Simple replace all occurrences
            // Note: This operates on the RAW text (editContent), not the HTML.
            // Since editContent is kept in sync via onInput logic (innerText), we have the plain text.
            // But wait, the editor is uncontrolled now with dangerouslySetInnerHTML.
            // 'editContent' state might be stale if we relied on contentEditable's onInput?
            // Yes, onInput={(e) => setEditContent(e.currentTarget.innerText)} updates it.
            // But updating 'editContent' state WON'T re-render the uncontrolled div unless key changes or we manually manipulate DOM.
            // Since we key={chapter.id}, updating 'editContent' *state* doesn't force re-render of innerHTML if we don't pass it back.
            // Actually, we ONLY pass `dangerouslySetInnerHTML` on mount (key change).
            // So we must manually update the DOM content.

            const newText = editContent.split(correctionOriginal).join(correctionReplacement);

            // Update DB chapter immediately (for persistence)
            await db.chapters.update(chapterId, { content_translated: newText });

            // Update State
            setEditContent(newText);

            // Force re-render of content by manipulating DOM directly or triggering a "soft" reload?
            // Or just let the auto-save logic handle it?
            // The contentEditable div is showing `formatReaderText(chapter.content_translated)`. 
            // If we update chapter in DB, `useLiveQuery` will trigger a re-render!
            // `chapter` prop will update.
            // `key={chapter.id}` won't change, so component re-uses.
            // But `dangerouslySetInnerHTML` is a prop. Does React update it if it changes?
            // Yes, React reconciles changes to dangerouslySetInnerHTML.
            // So if `chapter.content_translated` updates in DB -> `chapter` object updates -> component re-renders -> `dangerouslySetInnerHTML` gets new HTML.
            // Validated.
        }

        toast.success("Đã lưu quy tắc sửa lỗi và áp dụng!");
        setCorrectionOpen(false);
    };

    // Sync content when chapter changes
    useEffect(() => {
        if (chapter) {
            setEditContent(chapter.content_translated || "");
        }
    }, [chapter]);

    // Auto-save debounced
    useEffect(() => {
        if (!chapter) return;
        const timer = setTimeout(async () => {
            if (editContent !== chapter.content_translated) {
                await db.chapters.update(chapterId, { content_translated: editContent });
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [editContent, chapterId]);

    // Inspector Logic
    const handleInspect = async () => {
        if (!editContent || isInspecting) return;
        setIsInspecting(true);
        try {
            const issues = await inspectChapter(editContent);
            setInspectionIssues(issues);
            await db.chapters.update(chapterId, { inspectionResults: issues });
            if (issues.length === 0) toast.success("Không tìm thấy lỗi nào!");
            else toast.warning(`Tìm thấy ${issues.length} vấn đề cần xem xét.`);
        } catch (error) {
            toast.error("Lỗi khi kiểm tra: " + (error as any).message);
        } finally {
            setIsInspecting(false);
        }
    };

    const handleApplyFix = async (issue: InspectionIssue, saveToCorrections: boolean) => {
        if (!editContent) return;

        // 1. Save to Corrections if requested
        if (saveToCorrections) {
            await db.corrections.add({
                original: issue.original,
                replacement: issue.suggestion,
                createdAt: new Date()
            });
        }

        // 2. Apply fix to content
        // Note: Using split/join is risky for short words, but fast. 
        // For stricter replacement, we might need regex escaped.
        const newText = editContent.split(issue.original).join(issue.suggestion);
        setEditContent(newText);
        await db.chapters.update(chapterId, { content_translated: newText });

        // 3. Remove this issue from list
        const newIssues = inspectionIssues.filter(i => i.original !== issue.original);
        setInspectionIssues(newIssues);
        await db.chapters.update(chapterId, { inspectionResults: newIssues });
        setActiveIssue(null);
        toast.success("Đã sửa lỗi!");
    };

    const handleAutoFixAll = async (type: string) => {
        const targetIssues = inspectionIssues.filter(i => i.type === type);
        if (targetIssues.length === 0) return;

        let newText = editContent;
        targetIssues.forEach(issue => {
            newText = newText.split(issue.original).join(issue.suggestion);
        });

        setEditContent(newText);
        await db.chapters.update(chapterId, { content_translated: newText });

        const remainingIssues = inspectionIssues.filter(i => i.type !== type);
        setInspectionIssues(remainingIssues);
        await db.chapters.update(chapterId, { inspectionResults: remainingIssues });
        toast.success(`Đã tự động sửa ${targetIssues.length} lỗi ${type}!`);
    };

    if (!chapter) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">

            {/* Close Button - Always Visible at Top Right */}
            <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
                className="absolute top-4 right-4 z-[200] hover:bg-red-500/30 bg-black/40 backdrop-blur-sm text-white/90 hover:text-white rounded-full w-10 h-10 border border-white/10"
                title="Đóng cửa sổ (ESC)"
            >
                <X className="w-5 h-5" />
            </Button>

            {/* Modal Container: 95% Screen */}
            <div className="w-[95vw] h-[95vh] bg-[#1a0b2e] rounded-xl shadow-2xl border border-white/10 flex flex-col overflow-hidden relative">

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
                    handleTTSPlay={handleTTSPlay}
                    handleTTSStop={handleTTSStop}
                    selectedVoice={readerConfig.ttsVoice}
                    setSelectedVoice={(voice) => setReaderConfig({ ...readerConfig, ttsVoice: voice })}
                    ttsPitch={readerConfig.ttsPitch}
                    setTtsPitch={(pitch) => setReaderConfig({ ...readerConfig, ttsPitch: pitch })}
                    ttsRate={readerConfig.ttsRate}
                    setTtsRate={(rate) => setReaderConfig({ ...readerConfig, ttsRate: rate })}
                />

                {/* Body Content */}
                <div className="flex-1 overflow-hidden relative flex">

                    {/* Main Content Area */}
                    <div
                        ref={scrollViewportRef}
                        className={cn("flex-1 h-full overflow-y-auto custom-scrollbar p-0", isParallel && "grid grid-cols-2 divide-x divide-white/10")}
                    >

                        {/* Column 1: Based on Active Tab or Always Original in Parallel */}
                        {(activeTab === 'original' || isParallel) && (
                            <div className="min-h-full p-8 md:p-12 pb-20">
                                {isParallel && <div className="mb-4 text-xs font-bold text-white/30 uppercase tracking-widest sticky top-0">Original Source</div>}
                                <div className="text-lg leading-loose text-white/80 font-serif whitespace-pre-wrap">
                                    {chapter.content_original}
                                </div>
                            </div>
                        )}

                        {(activeTab === 'translated' || isParallel) && (
                            <div className="min-h-full flex flex-col relative bg-[#1a0b2e]">
                                {isParallel && <div className="px-8 md:px-12 pt-8 text-xs font-bold text-emerald-500 uppercase tracking-widest shrink-0">Translation</div>}

                                <div className={cn(
                                    "font-bold text-3xl text-amber-500 font-serif mb-8 text-center", // Enhanced style
                                    "max-w-[850px] mx-auto px-6", // Match body width
                                    isParallel ? "pt-4" : "pt-12 md:pt-20"
                                )}
                                    style={{ fontFamily: readerConfig.fontFamily }}
                                >
                                    {(chapter.title_translated || chapter.title).normalize('NFC')}
                                </div>

                                <div
                                    key={chapter.id} // Re-mount component only when switching chapters to reset content
                                    contentEditable
                                    suppressContentEditableWarning
                                    onInput={(e) => setEditContent(e.currentTarget.innerText)}
                                    onSelect={handleTextSelection}
                                    onContextMenu={handleContextMenu}
                                    className={cn(
                                        "w-full h-full flex-1 bg-transparent focus:outline-none outline-none font-serif",
                                        "max-w-[850px] mx-auto px-6 pb-24"
                                    )}
                                    style={{
                                        fontFamily: readerConfig.fontFamily,
                                        fontSize: `${readerConfig.fontSize}px`,
                                        lineHeight: readerConfig.lineHeight,
                                        textAlign: readerConfig.textAlign,
                                        color: readerConfig.textColor
                                    }}
                                    spellCheck={false}
                                    ref={editorRef}
                                    onClick={(e) => {
                                        // Event Delegation for Inspector Issues
                                        const target = e.target as HTMLElement;
                                        const issueOriginal = target.getAttribute('data-issue-original');
                                        if (issueOriginal) {
                                            const issue = inspectionIssues.find(i => i.original === issueOriginal);
                                            if (issue) setActiveIssue(issue);
                                        }
                                    }}
                                    dangerouslySetInnerHTML={htmlContent}

                                />
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Extras */}
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

            <Dialog open={correctionOpen} onOpenChange={setCorrectionOpen}>
                <DialogContent className="bg-[#1e1e2e] border-white/10 text-white sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Sửa lỗi & Tự động thay thế</DialogTitle>
                        <DialogDescription className="text-white/50">
                            Quy tắc này sẽ được lưu lại để dùng cho tính năng sửa lỗi tự động sau này.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Từ sai (Đang chọn)</Label>
                            <Input value={correctionOriginal} disabled className="bg-white/5 border-white/10" />
                        </div>
                        <div className="flex justify-center text-white/20">⬇</div>
                        <div className="space-y-2">
                            <Label>Từ đúng (Thay thế)</Label>
                            <Input
                                value={correctionReplacement}
                                onChange={(e) => setCorrectionReplacement(e.target.value)}
                                className="bg-[#2b2b40] border-white/10"
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setCorrectionOpen(false)}>Hủy</Button>
                        <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleSaveCorrection}>Lưu & Áp dụng</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Quick Dictionary Dialog */}
            <Dialog open={dictDialogOpen} onOpenChange={setDictDialogOpen}>
                <DialogContent className="bg-[#1e1e2e] border-white/10 text-white sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-blue-400" />
                            Thêm vào Từ điển
                        </DialogTitle>
                        <DialogDescription className="text-white/50">
                            Thêm từ mới để AI dịch chuẩn hơn trong tương lai.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Từ gốc (Trung/Việt)</Label>
                            <Input
                                value={dictOriginal}
                                onChange={(e) => setDictOriginal(e.target.value)}
                                className="bg-[#2b2b40] border-white/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Nghĩa (Dịch)</Label>
                            <Input
                                value={dictTranslated}
                                onChange={(e) => setDictTranslated(e.target.value)}
                                className="bg-[#2b2b40] border-white/10"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDictDialogOpen(false)}>Hủy</Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={async () => {
                                if (!dictOriginal || !dictTranslated) return;
                                const existing = await db.dictionary.where("original").equals(dictOriginal).first();
                                if (!existing) {
                                    await db.dictionary.add({
                                        original: dictOriginal,
                                        translated: dictTranslated,
                                        type: 'general',
                                        createdAt: new Date()
                                    });
                                    toast.success(`Đã thêm "${dictOriginal}" = "${dictTranslated}"`);
                                } else {
                                    // Update existing?
                                    if (confirm(`"${dictOriginal}" đã có nghĩa là "${existing.translated}". Bạn có muốn cập nhật thành "${dictTranslated}" không?`)) {
                                        await db.dictionary.update(existing.id!, { translated: dictTranslated });
                                        toast.success("Đã cập nhật từ điển!");
                                    }
                                }
                                setDictDialogOpen(false);
                            }}
                        >
                            Lưu từ
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            <Dialog open={!!activeIssue} onOpenChange={(v) => !v && setActiveIssue(null)}>
                <DialogContent className="bg-[#1e1e2e] border-white/10 text-white sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-500">
                            <AlertTriangle className="w-5 h-5" />
                            Phát hiện vấn đề
                        </DialogTitle>
                        <DialogDescription className="text-white/50">
                            AI phát hiện nội dung có thể cần chỉnh sửa.
                        </DialogDescription>
                    </DialogHeader>
                    {activeIssue && (
                        <div className="space-y-4 py-4">
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <div className="text-xs text-red-400 font-bold uppercase mb-1">Nguyên văn (Lỗi)</div>
                                <div className="text-lg font-serif">{activeIssue.original}</div>
                            </div>

                            <div className="flex justify-center text-white/20">⬇</div>

                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                <div className="text-xs text-emerald-400 font-bold uppercase mb-1">Gợi ý sửa</div>
                                <div className="text-lg font-bold text-emerald-300">{activeIssue.suggestion}</div>
                            </div>

                            <div className="text-sm text-white/60 italic border-l-2 border-white/20 pl-3">
                                "{activeIssue.reason}"
                            </div>

                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
                                <Button
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() => handleApplyFix(activeIssue, false)}
                                >
                                    Sửa ngay
                                </Button>
                                <Button
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => handleApplyFix(activeIssue, true)}
                                >
                                    Sửa & Lưu luật
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
