"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { X, ChevronLeft, ChevronRight, SplitSquareHorizontal, Edit3, BookOpen, FileText, Settings, Type, AlignLeft, AlignCenter, AlignRight, AlignJustify, Search, ShieldCheck, Sparkles, AlertTriangle } from "lucide-react";
import { inspectChapter, InspectionIssue } from "@/lib/gemini";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TextSelectionMenu } from "./TextSelectionMenu";
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

const formatReaderText = (text: string, issues: InspectionIssue[] = []) => {
    if (!text) return "";

    let paragraphs = text.split('\n');

    // Smart paragraph splitting: If a paragraph is too long (>500 chars) and has no breaks,
    // split it at sentence boundaries
    paragraphs = paragraphs.flatMap(para => {
        if (para.length > 500 && !para.includes('\n')) {
            // Split at sentence endings followed by space
            const sentences = para.split(/([.!?。！？]\s+)/);
            const smartParas: string[] = [];
            let currentPara = '';

            for (let i = 0; i < sentences.length; i++) {
                currentPara += sentences[i];
                // If we hit a sentence ending and current para is long enough, break
                if (sentences[i].match(/[.!?。！？]\s+/) && currentPara.length > 200) {
                    smartParas.push(currentPara.trim());
                    currentPara = '';
                }
            }
            if (currentPara.trim()) smartParas.push(currentPara.trim());
            return smartParas;
        }
        return [para];
    });

    return paragraphs.map((para) => {
        if (!para.trim()) return "";
        let formattedPara = para;

        // 1. Quotes: "Hello" -> <i>"Hello"</i>
        formattedPara = formattedPara.replace(/"([^"]+)"/g, '<i>"$1"</i>');

        // 2. Dashes: - Hello -> - <i>Hello</i>
        if (formattedPara.trim().startsWith('-') || formattedPara.trim().startsWith('—')) {
            formattedPara = formattedPara.replace(/^([-—])\s*(.*)/, '$1 <i>$2</i>');
        }

        // 3. Apply Issues Highlighting (AFTER other formatting to avoid breaking HTML)
        issues.sort((a, b) => b.original.length - a.original.length).forEach(issue => {
            if (formattedPara.includes(issue.original)) {
                // We wrap it in a custom span that we can target with clicks
                formattedPara = formattedPara.split(issue.original).join(
                    `<span class="bg-yellow-500/20 underline decoration-yellow-500 decoration-wavy cursor-pointer hover:bg-yellow-500/30 transition-colors" data-issue-original="${issue.original}">
                        ${issue.original}
                      </span>`
                );
            }
        });

        return `<p class="mb-6">${formattedPara}</p>`;
    }).join('');
};

export function ReaderModal({ chapterId, onClose, onNext, onPrev, hasPrev, hasNext }: ReaderModalProps) {
    const chapter = useLiveQuery(() => db.chapters.get(chapterId), [chapterId]);
    const [activeTab, setActiveTab] = useState<"translated" | "original">("translated");
    const [isParallel, setIsParallel] = useState(false);
    const [editContent, setEditContent] = useState("");

    // Selection Menu State
    const [menuPosition, setMenuPosition] = useState<{ x: number, y: number } | null>(null);
    const [selectedText, setSelectedText] = useState("");
    const editorRef = useRef<HTMLDivElement>(null);

    // Correction Dialog State
    const [correctionOpen, setCorrectionOpen] = useState(false);
    const [correctionOriginal, setCorrectionOriginal] = useState("");
    const [correctionReplacement, setCorrectionReplacement] = useState("");

    // Reader Settings
    const [showSettings, setShowSettings] = useState(false);
    const [readerConfig, setReaderConfig] = useState<ReaderConfig>({
        fontFamily: "'Bookerly', serif",
        fontSize: 18,
        lineHeight: 1.8,
        textAlign: "justify",
        textColor: "#e2e8f0",
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
    }, [chapterId]);

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
        };
        window.addEventListener("scroll", handleScroll, true);
        window.addEventListener("resize", handleScroll);
        return () => {
            window.removeEventListener("scroll", handleScroll, true);
            window.removeEventListener("resize", handleScroll);
        };
    }, [menuPosition]);

    const handleMenuAction = async (action: "dictionary" | "blacklist" | "correction") => {
        if (!selectedText) return;

        if (action === "dictionary") {
            // Quick add to dictionary (defaults)
            const existing = await db.dictionary.where("original").equals(selectedText).first();
            if (!existing) {
                await db.dictionary.add({
                    original: selectedText,
                    translated: selectedText, // Default to same, user can edit later
                    type: 'general',
                    createdAt: new Date()
                });
                toast.success(`Đã thêm "${selectedText}" vào từ điển`);
            } else {
                toast.info(`"${selectedText}" đã có trong từ điển`);
            }
            setMenuPosition(null);
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
        } else if (action === "correction") {
            setCorrectionOriginal(selectedText);
            setCorrectionReplacement(selectedText); // Pre-fill with original
            setCorrectionOpen(true);
            setMenuPosition(null); // Hide menu but keep selection if possible (or just logic state)
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
                                    onMouseUp={handleTextSelection}
                                    onKeyUp={handleTextSelection}
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
                                    dangerouslySetInnerHTML={{
                                        __html: formatReaderText((chapter.content_translated || "").normalize('NFC'), inspectionIssues)
                                    }}
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

            <Dialog open={correctionOpen} onOpenChange={setCorrectionOpen}>
                <DialogContent className="bg-[#1e1e2e] border-white/10 text-white sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Sửa lỗi & Tự động thay thế</DialogTitle>
                        <DialogDescription className="text-white/50">
                            Quy tắc này sẽ được lưu lại và tự động áp dụng cho các chương sau.
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
