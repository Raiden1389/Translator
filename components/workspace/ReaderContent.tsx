"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ReaderConfig } from "./ReaderHeader";
import { InspectionIssue } from "@/lib/types";
import { Chapter } from "@/lib/db";

interface ParagraphData {
    id: string;
    text: string;
    isHighlighted: boolean;
    issues: InspectionIssue[];
}

interface ReaderContentProps {
    activeTab: "translated" | "original";
    isParallel: boolean;
    readerConfig: ReaderConfig;
    chapter: Chapter;
    inspectionIssues: InspectionIssue[];
    activeTTSIndex: number | null;
    paragraphsData: ParagraphData[];
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
    // Navigation
    onNext?: () => void;
    hasNext?: boolean;
}

import { useRaiden } from "@/components/theme/RaidenProvider";

// Memoized individual paragraph for snappiness.
const ParagraphItem = React.memo(({
    para,
    index,
    setActiveIssue,
    isRaidenMode
}: {
    para: ParagraphData,
    index: number,
    setActiveIssue: (i: InspectionIssue | null) => void,
    isRaidenMode: boolean
}) => {
    const isHighlighted = para.isHighlighted;

    const renderContent = () => {
        let text = para.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        para.issues.forEach(issue => {
            if (!issue.original) return;
            const regex = new RegExp(issue.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            text = text.replace(regex, `<span class="border-b-2 border-rose-400/50 bg-rose-400/10 cursor-help" data-issue-original="${issue.original}">${issue.original}</span>`);
        });

        return { __html: text };
    };

    return (
        <p
            id={`tts-para-${index}`}
            className={cn(
                "mb-[1.2em] transition-all duration-500 rounded-sm px-2 py-1 -mx-2 border border-transparent",
                isHighlighted
                    ? (isRaidenMode ? "bg-purple-500/10 border-purple-500/20" : "bg-amber-100/60 border-amber-200/50 shadow-sm")
                    : (isRaidenMode ? "hover:bg-slate-800/20" : "hover:bg-slate-50/50")
            )}
            dangerouslySetInnerHTML={renderContent()}
        />
    );
});

ParagraphItem.displayName = "ParagraphItem";

export const ReaderContent = React.memo(function ReaderContent({
    activeTab, isParallel, readerConfig, chapter,
    inspectionIssues, paragraphsData, setEditContent,
    handleTextSelection, handleContextMenu, setActiveIssue,
    scrollViewportRef, editorRef,
    handleScroll, handleWheel,
    onNext, hasNext
}: ReaderContentProps) {
    const { isRaidenMode } = useRaiden();

    const finalBgColor = isRaidenMode ? "#0F172A" : readerConfig.backgroundColor;
    const finalTextColor = isRaidenMode ? "#CBD5E1" : readerConfig.textColor;

    return (
        <div
            ref={scrollViewportRef}
            onScroll={handleScroll}
            onWheel={handleWheel}
            className="flex-1 h-full overflow-y-auto custom-scrollbar reader-content-area p-0 select-text"
            style={{ backgroundColor: finalBgColor }}
        >
            <div
                className={cn(
                    "min-h-full",
                    isParallel && (isRaidenMode ? "grid grid-cols-2 divide-x divide-slate-800" : "grid grid-cols-2 divide-x divide-border")
                )}
                style={{ backgroundColor: finalBgColor }}
            >
                {(activeTab === 'original' || isParallel) && (
                    <div className={cn(
                        "min-h-full p-8 md:p-12 pb-20 border-r",
                        isRaidenMode ? "border-slate-800/50" : "border-border/10"
                    )}>
                        {isParallel && (
                            <div className="mb-6 text-[10px] font-black opacity-50 uppercase tracking-[0.3em] sticky top-0 flex items-center gap-2"
                                style={{ color: isRaidenMode ? "#94A3B8" : readerConfig.textColor }}>
                                <div className="w-8 h-px bg-current opacity-20" /> Bản gốc (Trung)
                            </div>
                        )}
                        <div className="text-xl leading-loose font-serif whitespace-pre-wrap select-all"
                            style={{ color: isRaidenMode ? "#94A3B8" : readerConfig.textColor, fontFamily: readerConfig.fontFamily }}>
                            {chapter.content_original}
                        </div>
                    </div>
                )}

                {(activeTab === 'translated' || isParallel) && (
                    <div className="min-h-full flex flex-col relative" style={{ backgroundColor: finalBgColor }}>
                        {isParallel && (
                            <div className={cn(
                                "px-8 md:px-12 pt-8 text-xs font-black uppercase tracking-[0.2em] shrink-0",
                                isRaidenMode ? "text-purple-400" : "text-primary/50"
                            )}>Translation</div>
                        )}

                        <div className={cn(
                            "font-bold text-4xl font-serif mb-12 text-center",
                            "max-w-[800px] mx-auto px-6",
                            "drop-shadow-sm",
                            isRaidenMode ? "text-slate-100" : "text-primary",
                            isParallel ? "pt-6" : "pt-16 md:pt-24"
                        )}
                            style={{
                                fontFamily: readerConfig.fontFamily,
                                maxWidth: isParallel ? "none" : `${readerConfig.maxWidth}px`
                            }}
                        >
                            {(chapter.title_translated || chapter.title).normalize('NFC')}
                        </div>

                        {/* Rendering Paragraphs individually for snappiness */}
                        <div
                            contentEditable
                            suppressContentEditableWarning
                            onInput={(e) => setEditContent(e.currentTarget.innerText)}
                            onSelect={handleTextSelection}
                            onContextMenu={handleContextMenu}
                            className={cn(
                                "w-full flex-1 bg-transparent focus:outline-none outline-none",
                                "max-w-[800px] mx-auto px-8 pb-12 transition-colors duration-500"
                            )}
                            style={{
                                fontFamily: readerConfig.fontFamily,
                                fontSize: `${readerConfig.fontSize}px`,
                                lineHeight: readerConfig.lineHeight,
                                color: finalTextColor,
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
                        >
                            {paragraphsData.map((para, index) => (
                                <ParagraphItem
                                    key={para.id}
                                    para={para}
                                    index={index}
                                    setActiveIssue={setActiveIssue}
                                    isRaidenMode={isRaidenMode}
                                />
                            ))}
                        </div>

                        {/* Explicit Next Chapter Navigation */}
                        <div className="max-w-[800px] mx-auto px-8 pb-32 pt-8 w-full flex items-center justify-center">
                            {hasNext ? (
                                <button
                                    onClick={onNext}
                                    className={cn(
                                        "group relative inline-flex items-center justify-center px-8 py-4 font-bold transition-all duration-200 rounded-full hover:scale-105 hover:shadow-lg focus:outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 antialiased",
                                        isRaidenMode ? "bg-purple-600 text-white hover:bg-purple-500 shadow-purple-900/40" : "bg-primary text-white hover:bg-primary/90"
                                    )}
                                    style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", letterSpacing: "0.01em" }}
                                >
                                    <span>Chương Tiếp Theo &rarr;</span>
                                    <div className="absolute inset-0 rounded-full ring-2 ring-white/20 group-hover:ring-white/40 transition-all" />
                                </button>
                            ) : (
                                <div className={cn("italic antialiased", isRaidenMode ? "text-slate-600" : "text-muted-foreground/50")} style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>Hết chương</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});
