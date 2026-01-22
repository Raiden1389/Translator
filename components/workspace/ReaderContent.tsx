"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ReaderConfig } from "./ReaderHeader";
import { InspectionIssue } from "@/lib/gemini";
import { Chapter } from "@/lib/db";

interface ReaderContentProps {
    activeTab: "translated" | "original";
    isParallel: boolean;
    readerConfig: ReaderConfig;
    chapter: Chapter;
    inspectionIssues: InspectionIssue[];
    activeTTSIndex: number | null;
    htmlContent: { __html: string };
    setEditContent: (content: string) => void;
    // Handlers
    handleTextSelection: () => void;
    handleContextMenu: (e: React.MouseEvent) => void;
    setActiveIssue: (issue: InspectionIssue | null) => void;
    // Refs
    scrollViewportRef: React.RefObject<HTMLDivElement | null>;
    editorRef: React.RefObject<HTMLDivElement | null>;
    // Scroll Handlers
    handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    handleWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
}

export const ReaderContent = React.memo(function ReaderContent({
    activeTab, isParallel, readerConfig, chapter,
    inspectionIssues, htmlContent, setEditContent,
    handleTextSelection, handleContextMenu, setActiveIssue,
    scrollViewportRef, editorRef,
    handleScroll, handleWheel
}: ReaderContentProps) {

    return (
        <div
            ref={scrollViewportRef}
            onScroll={handleScroll}
            onWheel={handleWheel}
            className="flex-1 h-full overflow-y-auto custom-scrollbar reader-content-area p-0"
            style={{ backgroundColor: readerConfig.backgroundColor }} // Keep bg here for overscroll/rubberbanding
        >
            <div
                className={cn(
                    "min-h-full",
                    isParallel && "grid grid-cols-2 divide-x divide-border"
                )}
                style={{ backgroundColor: readerConfig.backgroundColor }} // Also apply here for content coverage
            >
                {(activeTab === 'original' || isParallel) && (
                    <div className="min-h-full p-8 md:p-12 pb-20 border-r border-border/10" style={{ backgroundColor: readerConfig.backgroundColor }}>
                        {isParallel && (
                            <div className="mb-6 text-[10px] font-black opacity-50 uppercase tracking-[0.3em] sticky top-0 flex items-center gap-2"
                                style={{ color: readerConfig.textColor }}>
                                <div className="w-8 h-px bg-current opacity-20" /> Bản gốc (Trung)
                            </div>
                        )}
                        <div className="text-xl leading-loose font-serif whitespace-pre-wrap select-all"
                            style={{ color: readerConfig.textColor, fontFamily: readerConfig.fontFamily }}>
                            {chapter.content_original}
                        </div>
                    </div>
                )}

                {(activeTab === 'translated' || isParallel) && (
                    <div className="min-h-full flex flex-col relative" style={{ backgroundColor: readerConfig.backgroundColor }}>
                        {isParallel && (
                            <div className="px-8 md:px-12 pt-8 text-xs font-black text-primary/50 uppercase tracking-[0.2em] shrink-0">Translation</div>
                        )}

                        <div className={cn(
                            "font-bold text-4xl text-primary font-serif mb-12 text-center",
                            "max-w-[800px] mx-auto px-6",
                            "drop-shadow-sm",
                            isParallel ? "pt-6" : "pt-16 md:pt-24"
                        )}
                            style={{
                                fontFamily: readerConfig.fontFamily,
                                maxWidth: isParallel ? "none" : `${readerConfig.maxWidth}px`
                            }}
                        >
                            {(chapter.title_translated || chapter.title).normalize('NFC')}
                        </div>

                        <div
                            contentEditable
                            suppressContentEditableWarning
                            onInput={(e) => setEditContent(e.currentTarget.innerText)}
                            onSelect={handleTextSelection}
                            onContextMenu={handleContextMenu}
                            className={cn(
                                "w-full h-full flex-1 bg-transparent focus:outline-none outline-none",
                                "max-w-[800px] mx-auto px-8 pb-32 transition-colors duration-500"
                            )}
                            style={{
                                fontFamily: readerConfig.fontFamily,
                                fontSize: `${readerConfig.fontSize}px`,
                                lineHeight: readerConfig.lineHeight,
                                textAlign: readerConfig.textAlign,
                                color: readerConfig.textColor,
                                maxWidth: isParallel ? "none" : `${readerConfig.maxWidth}px`
                            }}
                            spellCheck={false}
                            ref={editorRef}
                            onClick={(e) => {
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
    );
});
