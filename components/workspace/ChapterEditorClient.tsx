"use client";

import React, { useState, useEffect, use } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Sparkles, Settings, ArrowRight, ArrowLeft as ArrowPrev, BookOpen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { SettingsDialog } from "@/components/editor/SettingsDialog";
import { DictionaryEditDialog } from "@/components/editor/DictionaryEditDialog";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";

import { translateChapter, TranslationLog, extractGlossary } from "@/lib/gemini";
import { Loader2, Terminal, X, CheckCircle2, AlertCircle, Copy, FileSearch } from "lucide-react";
import { ReviewDialog } from "@/components/workspace/ReviewDialog";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DictionaryManager } from "@/lib/dictionary-manager";
import { CharacterSidebar } from "@/components/workspace/CharacterSidebar";
import { Users } from "lucide-react";

export interface ChapterEditorClientProps {
    id: string;
    chapterId: string;
}

export default function ChapterEditorClient({ id, chapterId }: ChapterEditorClientProps) {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const router = useRouter();

    const workspace = useLiveQuery(() => db.workspaces.get(id), [id]);
    const chapter = useLiveQuery(() => db.chapters.get(parseInt(chapterId)), [chapterId]);
    const dictEntries = useLiveQuery(() => db.dictionary.toArray());
    const allChapters = useLiveQuery(() => db.chapters.where("workspaceId").equals(id).sortBy("order"), [id]);

    const currentIndex = allChapters?.findIndex(c => c.id === parseInt(chapterId)) ?? -1;
    const prevChapterId = currentIndex > 0 ? allChapters?.[currentIndex - 1]?.id : null;
    const nextChapterId = (allChapters && currentIndex < allChapters.length - 1) ? allChapters?.[currentIndex + 1]?.id : null;

    // Layout State
    const [viewMode, setViewMode] = useState<'vi' | 'zh' | 'parallel'>('parallel');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [highlightedChar, setHighlightedChar] = useState<string>("");

    // State for content
    const [translatedContent, setTranslatedContent] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Auto-resize textarea
    useEffect(() => {
        const resize = () => {
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 500)}px`;
            }
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, [translatedContent, viewMode, sidebarOpen]);

    // Dictionary State
    const [dicOpen, setDicOpen] = useState(false);
    const [selectedText, setSelectedText] = useState("");
    const [selectedTranslatedText, setSelectedTranslatedText] = useState("");

    // Reader Mode
    const [isReaderMode, setIsReaderMode] = useState(false);

    // Manager
    const [dictManager, setDictManager] = useState<DictionaryManager | null>(null);

    // Initialize Manager when dictionary loads
    useEffect(() => {
        if (dictEntries) {
            setDictManager(new DictionaryManager(dictEntries));
        }
    }, [dictEntries]);

    useEffect(() => {
        if (chapter && chapter.content_translated) {
            setTranslatedContent(chapter.content_translated);
        }
    }, [chapter]);

    if (!workspace || !chapter) return <div className="h-screen flex items-center justify-center text-white/50">Loading...</div>;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await db.chapters.update(parseInt(chapterId), {
                content_translated: translatedContent,
                wordCountTranslated: translatedContent.length,
                status: translatedContent.length > 0 ? 'translated' : 'draft'
            });
            await db.workspaces.update(id, { updatedAt: new Date() });
        } catch (e) {
            console.error(e);
            alert("Failed to save");
        } finally {
            setIsSaving(false);
        }
    };

    const handleContextMenu = () => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
            setSelectedText(selection.toString().trim());
        }
    };

    const handleDictionarySave = async (original: string, translated: string, oldTranslated?: string) => {
        if (translatedContent) {
            let newContent = translatedContent;
            let replaced = false;

            if (oldTranslated && oldTranslated !== translated) {
                const escapedOld = oldTranslated.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(escapedOld, 'g');

                if (regex.test(newContent)) {
                    newContent = newContent.replace(regex, translated);
                    replaced = true;
                }
            }

            if (!replaced && !oldTranslated) {
                alert(`Đã lưu "${original}" = "${translated}".\nLưu ý: Bạn nên bấm "AI Translate" lại để áp dụng cho toàn bộ văn bản.`);
            } else if (replaced) {
                setTranslatedContent(newContent);
                try {
                    await db.chapters.update(parseInt(chapterId), {
                        content_translated: newContent,
                        wordCountTranslated: newContent.length,
                        status: 'translated'
                    });
                    await db.workspaces.update(id, { updatedAt: new Date() });
                } catch (e) {
                    console.error("Failed to auto-save replaced content", e);
                }
            }
        }
    };

    const handleAIExtractChapter = async () => {
        if (!chapter?.content_original) return;
        setIsAIExtracting(true);
        try {
            toast.info("Đang quét chương này...");
            const result = await extractGlossary(chapter.content_original);
            if (result) {
                const existingOriginals = new Set(dictEntries?.map(d => d.original) || []);
                const newChars = result.characters.map((c: any) => ({
                    ...c,
                    isExisting: existingOriginals.has(c.original)
                }));
                const newTerms = result.terms.map((t: any) => ({
                    ...t,
                    isExisting: existingOriginals.has(t.original)
                }));
                setPendingCharacters(newChars);
                setPendingTerms(newTerms);
                setIsReviewOpen(true);
            }
        } catch (e: any) {
            console.error(e);
            toast.error("Lỗi khi quét AI: " + e.message);
        } finally {
            setIsAIExtracting(false);
        }
    };

    const handleConfirmSaveAI = async (selectedChars: any[], selectedTerms: any[]) => {
        try {
            let addedCount = 0;
            let updatedCount = 0;

            for (const char of selectedChars) {
                const existing = await db.dictionary.where("original").equals(char.original).first();
                if (existing) {
                    await db.dictionary.update(existing.id!, {
                        translated: char.translated,
                        gender: char.gender,
                        role: char.role,
                        description: char.description
                    });
                    updatedCount++;
                } else {
                    await db.dictionary.add({
                        workspaceId: id,
                        original: char.original,
                        translated: char.translated,
                        type: 'name',
                        gender: char.gender,
                        role: char.role,
                        description: char.description,
                        createdAt: new Date()
                    });
                    addedCount++;
                }
            }

            for (const term of selectedTerms) {
                const existing = await db.dictionary.where("original").equals(term.original).first();
                if (existing) {
                    await db.dictionary.update(existing.id!, { translated: term.translated, type: term.type as any });
                    updatedCount++;
                } else {
                    await db.dictionary.add({ workspaceId: id, original: term.original, translated: term.translated, type: term.type as any, createdAt: new Date() });
                    addedCount++;
                }
            }
            toast.success(`Đã lưu ${addedCount + updatedCount} mục! (Thêm mới: ${addedCount}, Cập nhật: ${updatedCount})`);
            setIsReviewOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi lưu kết quả");
        }
    };

    const handleTranslate = async () => {
        if (!chapter.content_original) return;

        setIsTranslating(true);
        setStatusOpen(true);
        setLogs([]);

        const addLog = (log: TranslationLog) => {
            setLogs(prev => [...prev, log]);
        };

        await translateChapter(
            id,
            chapter.content_original,
            addLog,
            (result) => {
                const text = result.translatedText;
                setTranslatedContent(text);
                db.chapters.update(parseInt(chapterId), {
                    content_translated: text,
                    wordCountTranslated: text.length,
                    status: 'translated'
                });
            }
        );

        setIsTranslating(false);
    };

    // Translation State
    const [isTranslating, setIsTranslating] = useState(false);
    const [statusOpen, setStatusOpen] = useState(false);
    const [logs, setLogs] = useState<TranslationLog[]>([]);

    // AI Extraction State
    const [isAIExtracting, setIsAIExtracting] = useState(false);
    const [pendingCharacters, setPendingCharacters] = useState<any[]>([]);
    const [pendingTerms, setPendingTerms] = useState<any[]>([]);
    const [isReviewOpen, setIsReviewOpen] = useState(false);

    // Render Tokenized Original Text
    const renderOriginalText = () => {
        if (!dictManager || !chapter.content_original) return chapter.content_original;

        const tokens = dictManager.tokenize(chapter.content_original);
        return tokens.map((token, idx) => {
            const isHighlighted = highlightedChar && token.text === highlightedChar;

            if (token.isEntry) {
                return (
                    <span
                        key={idx}
                        className={cn(
                            "cursor-pointer rounded px-0.5 border-b border-dashed transition-all",
                            isHighlighted
                                ? "bg-purple-500 text-white border-white animate-pulse font-bold"
                                : "text-amber-400 border-amber-400/50 hover:bg-white/10"
                        )}
                        title={`Nghĩa: ${token.translation}`}
                        onContextMenu={(e) => {
                            setSelectedText(token.text);
                            setSelectedTranslatedText("");
                        }}
                        onClick={() => {
                            setSelectedText(token.text);
                            setSelectedTranslatedText("");
                            setDicOpen(true);
                        }}
                    >
                        {token.text}
                    </span>
                );
            }

            return <span key={idx} className={isHighlighted ? "bg-purple-500 text-white" : ""}>{token.text}</span>;
        });
    };

    return (
        <main className="fixed inset-0 flex flex-col bg-[#1a0b2e] overflow-hidden selection:bg-primary/30">
            {/* Top Bar */}
            <header className="h-14 border-b border-white/10 bg-[#1e1e2e] flex items-center justify-between px-4 shrink-0 transition-all">
                <div className="flex items-center gap-4">
                    <Link href={`/workspace/${id}?tab=chapters`}>
                        <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 px-2 h-9">
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Trở lại</span>
                        </Button>
                    </Link>
                    <div className="flex items-center bg-[#2b2b40] rounded-lg p-0.5 border border-white/5">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white/60 hover:text-white disabled:opacity-30"
                            disabled={!prevChapterId}
                            onClick={() => router.push(`/workspace/${id}/chapter/${prevChapterId}`)}
                        >
                            <ArrowPrev className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white/60 hover:text-white disabled:opacity-30"
                            disabled={!nextChapterId}
                            onClick={() => router.push(`/workspace/${id}/chapter/${nextChapterId}`)}
                        >
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white max-w-[200px] md:max-w-[300px] truncate">{chapter.title}</h1>
                        <div className="flex items-center gap-2 text-[10px] text-white/40">
                            <span>{workspace.title}</span>
                            <span>•</span>
                            <span>Chương {currentIndex + 1}/{allChapters?.length || 0}</span>
                            <span className="hidden md:inline text-white/20">|</span>
                            <span className="hidden md:inline" title="Từ gốc / Từ dịch">
                                {chapter.wordCountOriginal?.toLocaleString()} / {translatedContent.length.toLocaleString()} từ
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex bg-[#2b2b40] rounded-lg p-1 gap-1 border border-white/5">
                    <Button
                        size="sm"
                        variant="ghost"
                        className={cn("h-7 px-2 text-xs hover:bg-white/10", viewMode === 'zh' && "bg-primary/20 text-primary")}
                        onClick={() => setViewMode('zh')}
                    >
                        Trung
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className={cn("h-7 px-2 text-xs hover:bg-white/10", viewMode === 'parallel' && "bg-primary/20 text-primary")}
                        onClick={() => setViewMode('parallel')}
                    >
                        Song Song
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className={cn("h-7 px-2 text-xs hover:bg-white/10", viewMode === 'vi' && "bg-primary/20 text-primary")}
                        onClick={() => setViewMode('vi')}
                    >
                        Việt
                    </Button>
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    <Button
                        size="sm"
                        variant="ghost"
                        className={cn("h-7 px-2 text-xs hover:bg-white/10", isReaderMode && "bg-emerald-500/20 text-emerald-400")}
                        onClick={() => {
                            const nextState = !isReaderMode;
                            setIsReaderMode(nextState);
                            if (nextState) {
                                setViewMode('vi');
                            }
                        }}
                        title="Reader Mode"
                    >
                        <BookOpen className="h-4 w-4 mr-1" /> Reader
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        disabled={isSaving}
                        onClick={handleSave}
                        variant="ghost"
                        size="sm"
                        className={cn("text-white/70 hover:text-white", isSaving && "opacity-50")}
                    >
                        <Save className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">{isSaving ? "Saving..." : "Lưu"}</span>
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleAIExtractChapter}
                        disabled={isAIExtracting || isTranslating}
                        variant="outline"
                        className="bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 transition-all"
                    >
                        {isAIExtracting ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <FileSearch className="mr-2 h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">Quét AI chương này</span>
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleTranslate}
                        disabled={isTranslating || isAIExtracting}
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-0 transition-all"
                    >
                        {isTranslating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Dịch AI</span>
                            </>
                        )}
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("text-white/60 hover:text-white hover:bg-white/10", sidebarOpen && "text-primary bg-primary/10")}
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        title="Nhân vật"
                    >
                        <Users className="h-5 w-5" />
                    </Button>

                    <SettingsDialog workspaceId={id} defaultTab="ai" />
                </div>
            </header>

            <div
                className={cn(
                    "flex-1 min-h-0 overflow-hidden bg-[#1a0b2e] transition-all duration-300 ease-in-out",
                    "reader-container"
                )}
                style={{
                    display: 'grid',
                    gridTemplateColumns: sidebarOpen
                        ? (viewMode === 'parallel' ? "1fr 1fr 250px" : "1fr 300px")
                        : (viewMode === 'parallel' ? "1fr 1fr" : "1fr")
                }}
            >
                {(viewMode === 'zh' || viewMode === 'parallel') && (
                    <div className={cn("flex flex-col border-r border-white/10 min-h-0", "reader-column")}>
                        <div className="h-10 border-b border-white/5 flex items-center px-4 bg-[#1e1e2e]/50 shrink-0">
                            <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Original ({workspace.sourceLang})</span>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <ContextMenu>
                                <ContextMenuTrigger asChild>
                                    <div className={cn("w-full min-h-full p-6 md:p-10 pb-0 text-lg leading-loose tracking-wide text-white/90 font-lora whitespace-pre-wrap", "reader-text")}>
                                        {renderOriginalText()}
                                    </div>
                                </ContextMenuTrigger>
                                <ContextMenuContent className="bg-[#2b2b40] border-white/10 text-white">
                                    <ContextMenuItem
                                        className="focus:bg-primary focus:text-white cursor-pointer"
                                        onSelect={() => {
                                            setSelectedTranslatedText("");
                                            setDicOpen(true);
                                        }}
                                    >
                                        Sửa nghĩa (Vietphrase)
                                    </ContextMenuItem>
                                </ContextMenuContent>
                            </ContextMenu>
                        </div>
                    </div>
                )}

                {(viewMode === 'vi' || viewMode === 'parallel') && (
                    <div className={cn("flex flex-col min-h-0", "reader-column")}>
                        <div className="h-10 border-b border-white/5 flex items-center px-4 bg-[#1e1e2e]/50 shrink-0">
                            <span className="text-xs font-bold text-emerald-500/80 uppercase tracking-wider">Translation ({workspace.targetLang})</span>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <ContextMenu>
                                <ContextMenuTrigger asChild>
                                    <div className="w-full min-h-full p-6 md:p-10 pb-0">
                                        {isReaderMode ? (
                                            <div className={cn("max-w-7xl mx-auto w-full min-h-full text-lg leading-loose tracking-wide text-white/90 font-lora pb-0", "reader-text")}>
                                                <div className="mb-8 text-center">
                                                    <h2 className="text-3xl font-bold text-white mb-2">{chapter.title}</h2>
                                                    <div className="w-16 h-1 bg-primary/30 mx-auto" />
                                                </div>
                                                {translatedContent.split('\n').map((line, idx) => {
                                                    const isDialogLine = line.trim().startsWith("-");
                                                    return (
                                                        <p key={idx} className={cn(
                                                            "mb-6 min-h-[1em]",
                                                            isDialogLine && "italic text-white/80 font-serif"
                                                        )}>
                                                            {line.split(/(".*?")/g).map((part, i) => (
                                                                part.startsWith('"') && part.endsWith('"')
                                                                    ? <span key={i} className="italic text-white/80 font-serif">{part}</span>
                                                                    : <span key={i}>{part}</span>
                                                            ))}
                                                        </p>
                                                    );
                                                })}
                                                <div className="h-20" />

                                                <div className="mt-20 flex flex-col items-center gap-6 pb-20 border-t border-white/5 pt-12">
                                                    <p className="text-white/30 text-sm">Hết chương {currentIndex + 1}</p>
                                                    <div className="flex gap-4">
                                                        <Button
                                                            variant="outline"
                                                            disabled={!prevChapterId}
                                                            onClick={() => router.push(`/workspace/${id}/chapter/${prevChapterId}`)}
                                                            className="border-white/10 bg-white/5"
                                                        >
                                                            Chương trước
                                                        </Button>
                                                        <Button
                                                            variant="default"
                                                            disabled={!nextChapterId}
                                                            onClick={() => router.push(`/workspace/${id}/chapter/${nextChapterId}`)}
                                                            className="bg-primary hover:bg-primary/80"
                                                        >
                                                            Chương sau
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full min-h-full flex-1 pb-0">
                                                <textarea
                                                    ref={textareaRef}
                                                    className="w-full h-auto bg-transparent text-lg leading-loose tracking-wide text-white/90 font-lora focus:outline-none resize-none overflow-hidden"
                                                    placeholder="Bản dịch sẽ hiện ở đây..."
                                                    value={translatedContent}
                                                    onChange={(e) => setTranslatedContent(e.target.value)}
                                                    onContextMenu={handleContextMenu}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </ContextMenuTrigger>
                                <ContextMenuContent className="bg-[#2b2b40] border-white/10 text-white">
                                    <ContextMenuItem
                                        className="focus:bg-primary focus:text-white cursor-pointer"
                                        onSelect={() => {
                                            setSelectedTranslatedText(selectedText);
                                            setSelectedText("");
                                            setDicOpen(true);
                                        }}
                                    >
                                        Thêm vào Từ điển
                                    </ContextMenuItem>
                                </ContextMenuContent>
                            </ContextMenu>
                        </div>
                    </div>
                )}

                <CharacterSidebar
                    workspaceId={id}
                    chapterId={chapterId}
                    chapterContent={chapter.content_original}
                    isOpen={sidebarOpen}
                    onToggle={() => setSidebarOpen(!sidebarOpen)}
                    onHighlight={(name) => setHighlightedChar(prev => prev === name ? "" : name)}
                    currentHighlight={highlightedChar}
                />
            </div>

            <DictionaryEditDialog
                workspaceId={id}
                open={dicOpen}
                onOpenChange={setDicOpen}
                initialOriginal={selectedText}
                initialTranslated={selectedTranslatedText}
                onSaveSuccess={handleDictionarySave}
            />

            <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
                <DialogContent className="sm:max-w-[600px] bg-[#1e1e2e] border-white/10 text-white p-0 overflow-hidden">
                    <DialogHeader className="p-4 border-b border-white/10 bg-[#2b2b40]">
                        <DialogTitle className="flex items-center gap-2 text-sm font-mono">
                            <Terminal className="h-4 w-4 text-emerald-500" />
                            AI Translation Log
                        </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[300px] p-4 font-mono text-xs space-y-2">
                        {logs.map((log, i) => (
                            <div key={i} className={cn(
                                "flex gap-2 items-start opacity-90",
                                log.type === 'error' && "text-red-400",
                                log.type === 'success' && "text-emerald-400",
                                log.type === 'info' && "text-white/70"
                            )}>
                                <span className="text-white/30 shrink-0">[{log.timestamp.toLocaleTimeString()}]</span>
                                <span>{log.message}</span>
                            </div>
                        ))}
                        {logs.length === 0 && <span className="text-white/30 italic">Waiting...</span>}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
            <ReviewDialog
                open={isReviewOpen}
                onOpenChange={setIsReviewOpen}
                characters={pendingCharacters}
                terms={pendingTerms}
                onSave={handleConfirmSaveAI}
            />
        </main>
    );
}
