"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Chapter } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface TranslationPaneProps {
    targetLang?: string;
    isReaderMode: boolean;
    chapter: Chapter;
    translatedContent: string;
    setTranslatedContent: (v: string) => void;
    prevChapterId: number | null;
    nextChapterId: number | null;
    currentIndex: number;
    onPrevChapter: () => void;
    onNextChapter: () => void;
    onContextMenu: () => void;
    onOpenDictionary: () => void;
    setSelectedTranslatedText: (v: string) => void;
    selectedText: string;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function TranslationPane({
    targetLang,
    isReaderMode,
    chapter,
    translatedContent,
    setTranslatedContent,
    prevChapterId,
    nextChapterId,
    currentIndex,
    onPrevChapter,
    onNextChapter,
    onContextMenu,
    onOpenDictionary,
    setSelectedTranslatedText,
    selectedText,
    textareaRef
}: TranslationPaneProps) {
    return (
        <div className={cn("flex flex-col min-h-0", "reader-column")}>
            <div className="h-10 border-b border-white/5 flex items-center px-4 bg-[#1e1e2e]/50 shrink-0">
                <span className="text-xs font-bold text-emerald-500/80 uppercase tracking-wider">Translation ({targetLang})</span>
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
                                                onClick={onPrevChapter}
                                                className="border-white/10 bg-white/5"
                                            >
                                                Chương trước
                                            </Button>
                                            <Button
                                                variant="default"
                                                disabled={!nextChapterId}
                                                onClick={onNextChapter}
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
                                        onContextMenu={onContextMenu}
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
                                onOpenDictionary();
                            }}
                        >
                            Thêm vào Từ điển
                        </ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>
            </div>
        </div>
    );
}
