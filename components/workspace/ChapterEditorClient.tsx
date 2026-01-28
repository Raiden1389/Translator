"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";

// Components
import { DictionaryEditDialog } from "@/components/editor/DictionaryEditDialog";
import { ReviewDialog } from "@/components/workspace/ReviewDialog";
import { CharacterSidebar } from "@/components/workspace/CharacterSidebar";
import { EditorHeader } from "./editor/components/EditorHeader";
import { OriginalPane } from "./editor/components/OriginalPane";
import { TranslationPane } from "./editor/components/TranslationPane";
import { TranslationLogDialog } from "./editor/components/TranslationLogDialog";

// Hooks
import { useChapterEditorData } from "./editor/hooks/useChapterEditorData";
import { useAITranslation } from "./editor/hooks/useAITranslation";
import { useAIExtraction } from "./editor/hooks/useAIExtraction";
import { useDictionaryEngine } from "./editor/hooks/useDictionaryEngine";
import { useEditorState } from "./editor/hooks/useEditorState";

export interface ChapterEditorClientProps {
    id: string;
    chapterId: string;
}

export default function ChapterEditorClient({ id, chapterId }: ChapterEditorClientProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const router = useRouter();

    // 1. Data Layer
    const {
        workspace,
        chapter,
        dictEntries,
        currentIndex,
        totalChapters,
        prevChapterId,
        nextChapterId,
        isLoading
    } = useChapterEditorData(id, chapterId);

    // 2. UI State Layer
    const {
        viewMode, setViewMode,
        sidebarOpen, setSidebarOpen,
        highlightedChar, setHighlightedChar,
        isReaderMode, setIsReaderMode,
        translatedContent, setTranslatedContent,
        isSaving, setIsSaving,
        dicOpen, setDicOpen,
        selectedText, setSelectedText,
        selectedTranslatedText, setSelectedTranslatedText
    } = useEditorState();

    // 3. AI Translation Layer
    const {
        isTranslating,
        statusOpen,
        setStatusOpen,
        logs,
        handleTranslate: runTranslate
    } = useAITranslation(id, chapterId);

    // 4. AI Extraction Layer
    const {
        isAIExtracting,
        pendingCharacters,
        pendingTerms,
        isReviewOpen,
        setIsReviewOpen,
        handleAIExtractChapter: runExtract,
        handleConfirmSaveAI
    } = useAIExtraction(id, dictEntries || []);

    // 5. Dictionary Engine Layer
    const { dictManager, tokenize } = useDictionaryEngine(dictEntries);

    // Track current chapterId to detect real navigation
    const lastChapterIdRef = useRef(chapterId);

    // Sync content from DB to state (ONLY on initial load or navigation)
    useEffect(() => {
        const isNewChapter = lastChapterIdRef.current !== chapterId;

        if (isNewChapter || !translatedContent) {
            if (chapter?.content_translated) {
                setTranslatedContent(chapter.content_translated);
            } else if (isNewChapter) {
                setTranslatedContent(""); // Reset if navigating to untranslated chapter
            }
        }

        lastChapterIdRef.current = chapterId;
    }, [chapter, chapterId, setTranslatedContent, translatedContent]);

    // Auto-resize textarea with high performance
    useEffect(() => {
        let rafId: number;
        const resize = () => {
            if (textareaRef.current && !isReaderMode) {
                const currentHeight = textareaRef.current.style.height;
                const newHeight = `${Math.max(textareaRef.current.scrollHeight, 500)}px`;

                // Only update DOM if height actually changed
                if (currentHeight !== newHeight) {
                    textareaRef.current.style.height = 'auto';
                    textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, 500)}px`;
                }
            }
        };

        const debouncedResize = () => {
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(resize);
        };

        resize();
        window.addEventListener('resize', debouncedResize);
        return () => {
            window.removeEventListener('resize', debouncedResize);
            cancelAnimationFrame(rafId);
        };
    }, [translatedContent, viewMode, sidebarOpen, isReaderMode]);

    // Render Tokenized Original Text
    const renderedOriginalText = useMemo(() => {
        if (!dictManager || !chapter?.content_original) return chapter?.content_original || "";

        const tokens = tokenize(chapter.content_original);
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
                        onContextMenu={() => {
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
    }, [dictManager, chapter?.content_original, highlightedChar, tokenize, setSelectedText, setSelectedTranslatedText, setDicOpen]);

    if (isLoading || !workspace || !chapter) return <div className="h-screen flex items-center justify-center text-white/50">Loading...</div>;

    // Handlers
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
            toast.error("Lỗi khi lưu chương");
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
                toast.success(`Đã lưu "${original}" = "${translated}"`, {
                    description: "Bạn nên bấm 'AI Translate' lại để áp dụng cho toàn bộ văn bản."
                });
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


    const handleTranslate = () => runTranslate(chapter.content_original || "", setTranslatedContent);
    const handleAIExtractChapter = () => runExtract(chapter.content_original || "");

    return (
        <main className="fixed inset-0 flex flex-col bg-[#1a0b2e] overflow-hidden selection:bg-primary/30">
            <EditorHeader
                workspaceId={id}
                workspace={workspace}
                chapter={chapter}
                currentIndex={currentIndex}
                totalChapters={totalChapters}
                viewMode={viewMode}
                setViewMode={setViewMode}
                isReaderMode={isReaderMode}
                setIsReaderMode={setIsReaderMode}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                isSaving={isSaving}
                onSave={handleSave}
                translationLength={translatedContent.length}
                isAIExtracting={isAIExtracting}
                handleAIExtractChapter={handleAIExtractChapter}
                isTranslating={isTranslating}
                handleTranslate={handleTranslate}
                prevChapterId={prevChapterId ?? null}
                nextChapterId={nextChapterId ?? null}
            />

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
                    <OriginalPane
                        sourceLang={workspace.sourceLang}
                        renderedText={renderedOriginalText}
                        onSetDictionary={setSelectedText}
                        onOpenDictionary={() => setDicOpen(true)}
                    />
                )}

                {(viewMode === 'vi' || viewMode === 'parallel') && (
                    <TranslationPane
                        targetLang={workspace.targetLang}
                        isReaderMode={isReaderMode}
                        chapter={chapter}
                        translatedContent={translatedContent}
                        setTranslatedContent={setTranslatedContent}
                        prevChapterId={prevChapterId ?? null}
                        nextChapterId={nextChapterId ?? null}
                        currentIndex={currentIndex}
                        onPrevChapter={() => router.push(`/workspace/${id}/chapter/${prevChapterId}`)}
                        onNextChapter={() => router.push(`/workspace/${id}/chapter/${nextChapterId}`)}
                        onContextMenu={handleContextMenu}
                        onOpenDictionary={() => setDicOpen(true)}
                        setSelectedTranslatedText={setSelectedTranslatedText}
                        selectedText={selectedText}
                        textareaRef={textareaRef}
                    />
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

            <TranslationLogDialog
                open={statusOpen}
                onOpenChange={setStatusOpen}
                logs={logs}
            />

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
