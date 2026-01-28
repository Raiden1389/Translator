"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    Save,
    Sparkles,
    ArrowRight,
    ArrowLeft as ArrowPrev,
    BookOpen,
    Loader2,
    FileSearch,
    Users
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { SettingsDialog } from "@/components/editor/SettingsDialog";
import { Workspace, Chapter } from "@/lib/db";

interface EditorHeaderProps {
    workspaceId: string;
    workspace: Workspace;
    chapter: Chapter;
    currentIndex: number;
    totalChapters: number;
    viewMode: 'vi' | 'zh' | 'parallel';
    setViewMode: (v: 'vi' | 'zh' | 'parallel') => void;
    isReaderMode: boolean;
    setIsReaderMode: (v: boolean) => void;
    sidebarOpen: boolean;
    setSidebarOpen: (v: boolean) => void;
    isSaving: boolean;
    onSave: () => void;
    translationLength: number;
    isAIExtracting: boolean;
    handleAIExtractChapter: () => void;
    isTranslating: boolean;
    handleTranslate: () => void;
    prevChapterId: number | null;
    nextChapterId: number | null;
}

export function EditorHeader({
    workspaceId,
    workspace,
    chapter,
    currentIndex,
    totalChapters,
    viewMode,
    setViewMode,
    isReaderMode,
    setIsReaderMode,
    sidebarOpen,
    setSidebarOpen,
    isSaving,
    onSave,
    translationLength,
    isAIExtracting,
    handleAIExtractChapter,
    isTranslating,
    handleTranslate,
    prevChapterId,
    nextChapterId
}: EditorHeaderProps) {
    const router = useRouter();

    return (
        <header className="h-14 border-b border-white/10 bg-[#1e1e2e] flex items-center justify-between px-4 shrink-0 transition-all">
            <div className="flex items-center gap-4">
                <Link href={`/workspace/${workspaceId}?tab=chapters`}>
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
                        onClick={() => router.push(`/workspace/${workspaceId}/chapter/${prevChapterId}`)}
                    >
                        <ArrowPrev className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white/60 hover:text-white disabled:opacity-30"
                        disabled={!nextChapterId}
                        onClick={() => router.push(`/workspace/${workspaceId}/chapter/${nextChapterId}`)}
                    >
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
                <div>
                    <h1 className="text-sm font-bold text-white max-w-[200px] md:max-w-[300px] truncate">{chapter.title}</h1>
                    <div className="flex items-center gap-2 text-[10px] text-white/40">
                        <span>{workspace.title}</span>
                        <span>•</span>
                        <span>Chương {currentIndex + 1}/{totalChapters}</span>
                        <span className="hidden md:inline text-white/20">|</span>
                        <span className="hidden md:inline" title="Từ gốc / Từ dịch">
                            {chapter.wordCountOriginal?.toLocaleString()} / {translationLength.toLocaleString()} từ
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
                    onClick={onSave}
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
                    className="bg-linear-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-0 transition-all"
                >
                    {isTranslating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <div className="flex items-center">
                            <Sparkles className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Dịch AI</span>
                        </div>
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

                <SettingsDialog workspaceId={workspaceId} defaultTab="ai" />
            </div>
        </header>
    );
}
