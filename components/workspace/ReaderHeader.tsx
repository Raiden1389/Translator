"use client";

import React, { useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    SplitSquareHorizontal,
    Edit3,
    BookOpen,
    Type,
    ShieldCheck,
    Sparkles,
    X,
    Eraser,
    BrainCircuit
} from "lucide-react";
import { Chapter } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InspectionIssue } from "@/lib/types";

// Extracted Components
import { HeaderIconButton } from "./reader/components/HeaderIconButton";
import { TabSwitch } from "./reader/components/TabSwitch";
import { TTSControls } from "./reader/components/TTSControls";
import { DisplaySettings } from "./reader/components/DisplaySettings";

/* ===================== TYPES ===================== */

export interface ReaderConfig {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    textAlign: "left" | "center" | "right" | "justify";
    textColor: string;
    backgroundColor: string;
    maxWidth: number;
    showDialogueLines: boolean;
    indentText: boolean;
    ttsPitch: number;
    ttsRate: number;
    ttsVoice: string;
}

interface ReaderHeaderProps {
    activeTab: "translated" | "original";
    setActiveTab: (tab: "translated" | "original") => void;
    chapter: Chapter;
    isParallel: boolean;
    setIsParallel: (v: boolean) => void;
    isInspecting: boolean;
    handleInspect: () => void;
    inspectionIssues: InspectionIssue[];
    showSettings: boolean;
    setShowSettings: (v: boolean) => void;
    readerConfig: ReaderConfig;
    setReaderConfig: React.Dispatch<React.SetStateAction<ReaderConfig>>;
    onPrev?: () => void;
    onNext?: () => void;
    hasPrev?: boolean;
    hasNext?: boolean;
    onClose: () => void;
    scrollProgress?: number;

    isTTSPlaying: boolean;
    isTTSLoading: boolean;
    handleTTSPlay: () => void;
    handleTTSStop: () => void;
    selectedVoice: string;
    setSelectedVoice: (v: string) => void;
    ttsPitch: number;
    setTtsPitch: (v: number) => void;
    ttsRate: number;
    setTtsRate: (v: number) => void;

    onClearTranslation: () => void;
    onAIExtract?: () => void;
    isHeaderVisible?: boolean;

    isEditing: boolean;
    setIsEditing: (v: boolean) => void;
    onJumpToHub?: () => void;
}

/* ===================== MAIN ===================== */

export function ReaderHeader(props: ReaderHeaderProps) {
    const {
        activeTab, setActiveTab, chapter,
        isParallel, setIsParallel,
        isInspecting, handleInspect, inspectionIssues,
        showSettings, setShowSettings,
        readerConfig, setReaderConfig,
        onPrev, onNext, hasPrev, hasNext, onClose,
        isTTSPlaying, isTTSLoading, handleTTSPlay, handleTTSStop,
        selectedVoice, setSelectedVoice, ttsPitch, setTtsPitch, ttsRate, setTtsRate,
        onClearTranslation, onAIExtract,
        scrollProgress = 0, isHeaderVisible = true,
        isEditing, setIsEditing, onJumpToHub
    } = props;

    const [showTTSSettings, setShowTTSSettings] = useState(false);

    if (!chapter) return null;

    return (
        <header className={cn(
            "h-14 border-b bg-background flex flex-col z-60 absolute top-0 left-0 w-full select-none transition-all duration-300 ease-in-out",
            !isHeaderVisible && "-translate-y-full opacity-0"
        )}>
            <div className="flex-1 flex items-center justify-between px-6">

                {/* LEFT SOCIAL: Chapter Info & Navigation */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-muted/20 border border-border/40 rounded-none p-0.5">
                        <Button variant="ghost" size="icon" disabled={!hasPrev} onClick={onPrev} className="w-8 h-8 rounded-none hover:bg-muted/40 transition-colors"><ChevronLeft className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" disabled={!hasNext} onClick={onNext} className="w-8 h-8 rounded-none hover:bg-muted/40 transition-colors"><ChevronRight className="w-4 h-4" /></Button>
                    </div>

                    <div className="h-4 w-px bg-border/40 mx-1" />

                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate max-w-[150px]">
                            {chapter.title_translated || chapter.title}
                        </span>
                    </div>
                </div>

                {/* MIDDLE: Tab Switch (Floating Minimalist) */}
                <div className="absolute left-1/2 -translate-x-1/2">
                    <TabSwitch activeTab={activeTab} setActiveTab={setActiveTab} />
                </div>

                {/* RIGHT: Tools & Settings */}
                <div className="flex items-center gap-3">
                    {/* Mode Toggle */}
                    {activeTab === "translated" && (
                        <HeaderIconButton
                            icon={<SplitSquareHorizontal className="w-4 h-4" />}
                            title={isParallel ? "Tắt song song" : "Bật song song"}
                            onClick={() => setIsParallel(!isParallel)}
                            active={isParallel}
                        />
                    )}

                    <HeaderIconButton
                        icon={<BrainCircuit className="w-4 h-4 text-primary animate-pulse" />}
                        title="Vào Intelligence Hub"
                        onClick={onJumpToHub}
                    />

                    <div className="h-6 w-px bg-border/20 mx-1" />

                    {/* AI Tools */}
                    <div className="flex items-center gap-1">
                        <HeaderIconButton
                            icon={<Sparkles className="w-4 h-4 text-purple-500" />}
                            title="Quét AI"
                            onClick={onAIExtract}
                        />

                        <HeaderIconButton
                            icon={isInspecting ? <Sparkles className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                            onClick={handleInspect}
                            disabled={isInspecting}
                            active={isInspecting}
                            title="Soi lỗi AI"
                        >
                            {inspectionIssues.length > 0 && (
                                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 text-[8px] bg-red-500 text-white flex items-center justify-center font-bold">
                                    {inspectionIssues.length}
                                </span>
                            )}
                        </HeaderIconButton>
                    </div>

                    {activeTab === "translated" && (
                        <div className="flex items-center gap-1">
                            <HeaderIconButton
                                icon={isEditing ? <BookOpen className="w-4 h-4 text-emerald-500" /> : <Edit3 className="w-4 h-4" />}
                                title={isEditing ? "Đọc" : "Sửa nhanh"}
                                onClick={() => setIsEditing(!isEditing)}
                                active={isEditing}
                            />
                            <HeaderIconButton
                                icon={<Eraser className="w-4 h-4" />}
                                title="Xóa dịch"
                                onClick={onClearTranslation}
                            />
                        </div>
                    )}

                    <div className="h-6 w-px bg-border/20 mx-1" />

                    {/* Media & Config */}
                    <TTSControls
                        isTTSPlaying={isTTSPlaying} isTTSLoading={isTTSLoading}
                        handleTTSPlay={handleTTSPlay} handleTTSStop={handleTTSStop}
                        showTTSSettings={showTTSSettings} setShowTTSSettings={setShowTTSSettings}
                        selectedVoice={selectedVoice} setSelectedVoice={setSelectedVoice}
                        ttsPitch={ttsPitch} setTtsPitch={setTtsPitch}
                        ttsRate={ttsRate} setTtsRate={setTtsRate}
                    />

                    <div className="relative">
                        <HeaderIconButton
                            icon={<Type className="w-4 h-4" />}
                            title="Cài đặt"
                            onClick={() => setShowSettings(!showSettings)}
                            active={showSettings}
                        />
                        <DisplaySettings
                            showSettings={showSettings}
                            setShowSettings={setShowSettings}
                            readerConfig={readerConfig}
                            setReaderConfig={setReaderConfig}
                        />
                    </div>

                    <HeaderIconButton
                        icon={<X className="w-4 h-4" />}
                        onClick={onClose}
                        className="hover:bg-red-500/10 hover:text-red-500"
                    />
                </div>
            </div>

            {/* MINIMAL PROGRESS LINE */}
            <div className="absolute bottom-0 left-0 h-[1.5px] bg-border/20 w-full overflow-hidden">
                <div
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${Math.round(scrollProgress)}%` }}
                />
            </div>
        </header>
    );
}
