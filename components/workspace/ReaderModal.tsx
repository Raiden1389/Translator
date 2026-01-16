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

interface ReaderModalProps {
    chapterId: number;
    onClose: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    hasPrev?: boolean;
    hasNext?: boolean;
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
    const [activeTab, setActiveTab] = useState<"translated" | "original" | "summary">("translated");
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
    const [readerConfig, setReaderConfig] = useState({
        fontFamily: "'Bookerly', serif",
        fontSize: 19,
        lineHeight: 1.8,
        textAlign: "left" as "left" | "right" | "center" | "justify",
        color: "#cbd5e1", // slate-300
    });
    const [configLoaded, setConfigLoaded] = useState(false);

    // AI Inspector State
    const [isInspecting, setIsInspecting] = useState(false);
    const [inspectionIssues, setInspectionIssues] = useState<InspectionIssue[]>([]);
    const [activeIssue, setActiveIssue] = useState<InspectionIssue | null>(null);

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
            {/* Modal Container: 95% Screen */}
            <div className="w-[95vw] h-[95vh] bg-[#1a0b2e] rounded-xl shadow-2xl border border-white/10 flex flex-col overflow-hidden relative">

                {/* Header */}
                <header className="h-14 border-b border-white/10 bg-[#1e1e2e] flex items-center justify-between px-4 shrink-0 select-none">
                    <div className="flex items-center gap-4">
                        <div className="flex bg-black/20 p-1 rounded-lg">
                            <button
                                onClick={() => setActiveTab("translated")}
                                className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", activeTab === "translated" ? "bg-[#6c5ce7] text-white shadow-md" : "text-white/50 hover:text-white")}
                            >
                                <Edit3 className="w-3 h-3 inline-block mr-2" />
                                Bản dịch (Sửa)
                            </button>
                            <button
                                onClick={() => setActiveTab("original")}
                                className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", activeTab === "original" ? "bg-[#6c5ce7] text-white shadow-md" : "text-white/50 hover:text-white")}
                            >
                                <BookOpen className="w-3 h-3 inline-block mr-2" />
                                Bản gốc
                            </button>
                            <button
                                onClick={() => setActiveTab("summary")}
                                className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", activeTab === "summary" ? "bg-[#6c5ce7] text-white shadow-md" : "text-white/50 hover:text-white")}
                            >
                                <FileText className="w-3 h-3 inline-block mr-2" />
                                Tóm tắt
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <h2 className="text-white/70 font-bold max-w-md truncate mr-4" title={chapter.title}>
                            {chapter.title_translated || chapter.title}
                        </h2>

                        <Button
                            size="sm"
                            variant="ghost"
                            className={cn("text-white/50 hover:text-white border border-transparent hover:border-white/10", isParallel && "bg-white/10 text-white border-white/20")}
                            onClick={() => setIsParallel(!isParallel)}
                            title="Hiển thị song song bản dịch và bản gốc"
                        >
                            <SplitSquareHorizontal className="w-4 h-4 mr-2" /> Song song
                        </Button>

                        <div className="h-6 w-px bg-white/10 mx-2" />

                        <Button
                            size="sm"
                            variant="ghost"
                            className={cn("text-white/50 hover:text-white border border-transparent hover:border-white/10", isInspecting && "animate-pulse text-amber-500")}
                            onClick={handleInspect}
                            disabled={isInspecting}
                            title="Soi lỗi bản dịch bằng AI"
                        >
                            {isInspecting ? <Sparkles className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                            <span className="hidden md:inline">Soi lỗi</span>
                            {inspectionIssues.length > 0 && (
                                <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{inspectionIssues.length}</span>
                            )}
                        </Button>

                        <div className="relative">
                            <Button
                                size="sm"
                                variant="ghost"
                                className={cn("text-white/50 hover:text-white", showSettings && "bg-white/10 text-white")}
                                onClick={() => setShowSettings(!showSettings)}
                                title="Tùy chỉnh giao diện đọc truyện"
                            >
                                <Type className="w-5 h-5 mr-2" />
                                <span className="hidden md:inline">Giao diện</span>
                            </Button>

                            {/* Settings Popup */}
                            {showSettings && (
                                <div className="absolute top-full right-0 mt-2 w-72 bg-[#1e1e2e] border border-white/10 rounded-xl shadow-2xl p-4 z-[200] space-y-4 animate-in fade-in slide-in-from-top-2">
                                    {/* Font Family */}
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { name: "Bookerly", value: "'Bookerly', serif" },
                                                { name: "Merriweather", value: "'Merriweather', serif" },
                                                { name: "Georgia", value: "Georgia, serif" },
                                                { name: "Lora", value: "'Lora', serif" },
                                            ].map((font) => (
                                                <button
                                                    key={font.name}
                                                    onClick={() => setReaderConfig({ ...readerConfig, fontFamily: font.value })}
                                                    className={cn(
                                                        "px-2 py-1.5 rounded text-sm transition-all border",
                                                        readerConfig.fontFamily === font.value
                                                            ? "bg-[#6c5ce7] border-[#6c5ce7] text-white"
                                                            : "bg-white/5 border-transparent text-white/60 hover:bg-white/10"
                                                    )}
                                                    style={{ fontFamily: font.value }}
                                                >
                                                    {font.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Font Size */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs text-white/40 uppercase font-bold tracking-wider">Cỡ chữ ({readerConfig.fontSize}px)</div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/5">
                                            <button
                                                onClick={() => setReaderConfig(p => ({ ...p, fontSize: Math.max(14, p.fontSize - 1) }))}
                                                className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded"
                                            >
                                                A-
                                            </button>
                                            <input
                                                type="range" min="14" max="32"
                                                value={readerConfig.fontSize}
                                                onChange={(e) => setReaderConfig({ ...readerConfig, fontSize: parseInt(e.target.value) })}
                                                className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                            />
                                            <button
                                                onClick={() => setReaderConfig(p => ({ ...p, fontSize: Math.min(32, p.fontSize + 1) }))}
                                                className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded"
                                            >
                                                A+
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs text-white/40 uppercase font-bold tracking-wider">Dãn dòng & Căn lề</div>
                                        </div>
                                        <div className="flex gap-2">
                                            {/* Line Height Control */}
                                            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/5 flex-1">
                                                <button
                                                    onClick={() => setReaderConfig(p => ({ ...p, lineHeight: Math.max(1.2, p.lineHeight - 0.1) }))}
                                                    className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded"
                                                >
                                                    -
                                                </button>
                                                <div className="flex-1 text-center text-xs text-white/70">{readerConfig.lineHeight.toFixed(1)}</div>
                                                <button
                                                    onClick={() => setReaderConfig(p => ({ ...p, lineHeight: Math.min(2.5, p.lineHeight + 0.1) }))}
                                                    className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded"
                                                >
                                                    +
                                                </button>
                                            </div>

                                            {/* Alignment Control */}
                                            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
                                                {[
                                                    { value: "left", icon: AlignLeft },
                                                    { value: "center", icon: AlignCenter },
                                                    { value: "right", icon: AlignRight },
                                                    { value: "justify", icon: AlignJustify },
                                                ].map((align) => (
                                                    <button
                                                        key={align.value}
                                                        onClick={() => setReaderConfig({ ...readerConfig, textAlign: align.value as any })}
                                                        className={cn(
                                                            "p-1.5 rounded transition-all",
                                                            readerConfig.textAlign === align.value
                                                                ? "bg-[#6c5ce7] text-white"
                                                                : "text-white/40 hover:text-white hover:bg-white/10"
                                                        )}
                                                    >
                                                        <align.icon className="w-4 h-4" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Color */}
                                    <div className="space-y-2">
                                        <div className="text-xs text-white/40 uppercase font-bold tracking-wider">Màu chữ</div>
                                        <div className="flex items-center gap-3">
                                            {[
                                                { color: "#cbd5e1", label: "Mặc định (Xám)" }, // slate-300
                                                { color: "#ffffff", label: "Trắng" },
                                                { color: "#e2e8f0", label: "Sáng" },
                                                { color: "#ddd6fe", label: "Tím nhạt" },
                                                { color: "#fcd34d", label: "Vàng" }, // amber-300
                                            ].map((c) => (
                                                <button
                                                    key={c.color}
                                                    onClick={() => setReaderConfig({ ...readerConfig, color: c.color })}
                                                    className={cn(
                                                        "w-8 h-8 rounded-full border-2 transition-all",
                                                        readerConfig.color === c.color ? "border-amber-500 scale-110" : "border-transparent opacity-50 hover:opacity-100 scale-100"
                                                    )}
                                                    style={{ backgroundColor: c.color }}
                                                    title={c.label}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-6 w-px bg-white/10 mx-2" />

                        <Button size="icon" variant="ghost" disabled={!hasPrev} onClick={onPrev} className="hover:bg-white/10 text-white/70"><ChevronLeft className="w-5 h-5" /></Button>
                        <Button size="icon" variant="ghost" disabled={!hasNext} onClick={onNext} className="hover:bg-white/10 text-white/70"><ChevronRight className="w-5 h-5" /></Button>

                        <div className="h-6 w-px bg-white/10 mx-2" />

                        <Button size="icon" variant="destructive" className="bg-red-500/20 text-red-400 hover:bg-red-600 hover:text-white" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </header>

                {/* Body Content */}
                <div className="flex-1 overflow-hidden relative flex">

                    {/* Main Content Area */}
                    <div className={cn("flex-1 h-full overflow-y-auto custom-scrollbar p-0", isParallel && "grid grid-cols-2 divide-x divide-white/10")}>

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
                                        color: readerConfig.color
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

                    {/* Summary Tab Content */}
                    {activeTab === 'summary' && !isParallel && (
                        <div className="min-h-full p-8 md:p-12 flex items-center justify-center text-white/40 italic">
                            Tính năng tóm tắt đang phát triển...
                        </div>
                    )}

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
