"use client";

import React, { useState, useRef } from "react";
import {
    ChevronLeft,
    ChevronRight,
    SplitSquareHorizontal,
    Edit3,
    BookOpen,
    Type,
    AlignLeft,
    AlignCenter,
    AlignJustify,
    ShieldCheck,
    Sparkles,
    X,
    Eraser,
    Loader2
} from "lucide-react";
import { VIETNAMESE_VOICES } from "@/lib/tts";
import { Chapter } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InspectionIssue } from "@/lib/types";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

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
}

/* ===================== SMALL COMPONENTS ===================== */

function HeaderIconButton({
    icon,
    onClick,
    disabled,
    className,
    title,
    children
}: {
    icon: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    title?: string;
    children?: React.ReactNode;
}) {
    const button = (
        <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "w-11 h-11 rounded-xl border border-border transition-all duration-300 relative",
                className
            )}
        >
            {icon}
            {children}
        </Button>
    );

    if (!title) return button;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                {button}
            </TooltipTrigger>
            <TooltipContent>{title}</TooltipContent>
        </Tooltip>
    );
}

function TabSwitch({
    activeTab,
    setActiveTab
}: {
    activeTab: "translated" | "original";
    setActiveTab: (t: "translated" | "original") => void;
}) {
    return (
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border">
            <button
                onClick={() => setActiveTab("translated")}
                className={cn(
                    "px-5 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2",
                    activeTab === "translated"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted"
                )}
            >
                <Edit3 className="w-4 h-4" />
                <span className="hidden sm:inline">Bản dịch</span>
            </button>

            <button
                onClick={() => setActiveTab("original")}
                className={cn(
                    "px-5 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2",
                    activeTab === "original"
                        ? "bg-secondary text-secondary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted"
                )}
            >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Bản gốc</span>
            </button>
        </div>
    );
}

interface TTSControlsProps {
    isTTSPlaying: boolean;
    isTTSLoading: boolean;
    handleTTSPlay: () => void;
    handleTTSStop: () => void;
    showTTSSettings: boolean;
    setShowTTSSettings: (v: boolean) => void;
    selectedVoice: string;
    setSelectedVoice: (v: string) => void;
    ttsPitch: number;
    setTtsPitch: (v: number) => void;
    ttsRate: number;
    setTtsRate: (v: number) => void;
}

function TTSControls({
    isTTSPlaying,
    isTTSLoading,
    handleTTSPlay,
    handleTTSStop,
    showTTSSettings,
    setShowTTSSettings,
    selectedVoice,
    setSelectedVoice,
    ttsPitch,
    setTtsPitch,
    ttsRate,
    setTtsRate
}: TTSControlsProps) {
    return (
        <div className="flex items-center bg-muted/50 rounded-xl border border-border p-1 mx-1">
            <div className="relative group">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleTTSPlay}
                    disabled={isTTSLoading}
                    className={cn(
                        "h-9 rounded-lg px-3 transition-all duration-300",
                        isTTSPlaying ? "bg-emerald-600 text-white shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-background"
                    )}
                >
                    {isTTSLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", isTTSPlaying ? "bg-white animate-pulse" : "bg-muted-foreground/30")} />
                            <span className="text-xs font-bold uppercase tracking-tight">TTS</span>
                        </div>
                    )}
                </Button>

                {isTTSPlaying && (
                    <Button
                        size="icon"
                        variant="ghost"
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-lg scale-0 group-hover:scale-100 transition-transform duration-200"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleTTSStop();
                        }}
                    >
                        <X className="w-2.5 h-2.5" />
                    </Button>
                )}
            </div>

            <div className="relative">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowTTSSettings(!showTTSSettings)}
                    className={cn(
                        "w-9 h-9 rounded-lg transition-all duration-300",
                        showTTSSettings ? "text-emerald-600 bg-emerald-500/10" : "text-muted-foreground hover:text-foreground hover:bg-background"
                    )}
                >
                    <span className="text-[10px] scale-75">▼</span>
                </Button>

                {showTTSSettings && (
                    <div className="absolute top-full right-0 mt-3 w-56 bg-popover border border-border text-popover-foreground rounded-2xl shadow-xl p-4 z-200 space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="text-xs text-muted-foreground/70 uppercase font-black tracking-widest">TTS Settings</div>
                        <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                            {VIETNAMESE_VOICES.map((voice) => (
                                <button
                                    key={voice.value}
                                    onClick={() => {
                                        setSelectedVoice(voice.value);
                                        setShowTTSSettings(false);
                                    }}
                                    className={cn(
                                        "w-full px-3 py-2 rounded-xl text-sm text-left transition-all font-medium",
                                        selectedVoice === voice.value
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    {voice.name}
                                </button>
                            ))}
                        </div>
                        <div className="h-px bg-border/50" />
                        <div className="space-y-3 pt-1">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground/70 uppercase tracking-tighter">
                                    <span>Pitch</span>
                                    <span className="text-emerald-600">{ttsPitch > 0 ? `+${ttsPitch}` : ttsPitch}</span>
                                </div>
                                <input type="range" min="-20" max="20" value={ttsPitch} onChange={(e) => setTtsPitch(parseInt(e.target.value))} className="w-full h-1 bg-muted rounded-full appearance-none accent-primary" />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground/70 uppercase tracking-tighter">
                                    <span>Rate</span>
                                    <span className="text-emerald-600">{ttsRate > 0 ? `+${ttsRate}` : ttsRate}%</span>
                                </div>
                                <input type="range" min="-50" max="50" value={ttsRate} onChange={(e) => setTtsRate(parseInt(e.target.value))} className="w-full h-1 bg-muted rounded-full appearance-none accent-primary" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

interface ReaderSettingsPanelProps {
    showSettings: boolean;
    setShowSettings: (v: boolean) => void;
    readerConfig: ReaderConfig;
    setReaderConfig: React.Dispatch<React.SetStateAction<ReaderConfig>>;
}

function ReaderSettingsPanel({
    showSettings,
    setShowSettings,
    readerConfig,
    setReaderConfig
}: ReaderSettingsPanelProps) {
    const bgInputRef = useRef<HTMLInputElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);

    if (!showSettings) return null;

    return (
        <div className="absolute top-full right-0 mt-3 w-80 bg-popover border border-border text-popover-foreground rounded-2xl shadow-xl p-5 z-200 space-y-5 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between pb-1 border-b border-border/50">
                <div className="text-xs text-muted-foreground/80 uppercase font-black tracking-widest">Cài đặt hiển thị</div>
                <X className="w-4 h-4 text-muted-foreground/30 cursor-pointer hover:text-destructive" onClick={() => setShowSettings(false)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest block">Nền</label>
                    <div className="relative group/picker">
                        <div
                            className="h-10 w-full rounded-lg border border-border cursor-pointer shadow-sm transition-transform active:scale-95"
                            style={{ backgroundColor: readerConfig.backgroundColor || "#ffffff" }}
                            onClick={(e) => {
                                const el = e.currentTarget.nextElementSibling as HTMLElement;
                                el.classList.toggle('hidden');
                            }}
                        />
                        <div className="hidden absolute top-full left-0 mt-2 p-2 bg-popover border border-border rounded-xl shadow-2xl z-210 grid-cols-4 gap-2 w-48 animate-in zoom-in-95 duration-100 data-[state=visible]:grid">
                            {["#ffffff", "#f8fafc", "#f1f5f9", "#fdfcf0", "#f5f5f4", "#faf7ed", "#f3f4f6", "#ecfdf5"].map((color) => (
                                <button
                                    key={color}
                                    className={cn(
                                        "w-8 h-8 rounded-md border border-border/50 transition-all hover:scale-110",
                                        readerConfig.backgroundColor === color && "ring-2 ring-primary ring-offset-2 ring-offset-popover"
                                    )}
                                    style={{ backgroundColor: color }}
                                    onClick={() => {
                                        setReaderConfig({ ...readerConfig, backgroundColor: color });
                                        document.querySelectorAll('.group\\/picker > div:last-child').forEach(el => el.classList.add('hidden'));
                                    }}
                                />
                            ))}
                            <div className="col-span-4 h-px bg-border/50 my-1" />
                            <button className="col-span-4 text-[10px] text-center text-muted-foreground hover:text-foreground h-6 transition-colors" onClick={() => bgInputRef.current?.click()}>Khác...</button>
                            <input type="color" ref={bgInputRef} className="invisible absolute w-0 h-0" value={readerConfig.backgroundColor || "#ffffff"} onChange={(e) => setReaderConfig({ ...readerConfig, backgroundColor: e.target.value })} />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest block">Màu chữ</label>
                    <div className="relative group/picker">
                        <div
                            className="h-10 w-full rounded-lg border border-border cursor-pointer shadow-sm transition-transform active:scale-95"
                            style={{ backgroundColor: readerConfig.textColor || "#262626" }}
                            onClick={(e) => {
                                const el = e.currentTarget.nextElementSibling as HTMLElement;
                                el.classList.toggle('hidden');
                            }}
                        />
                        <div className="hidden absolute top-full right-0 mt-2 p-2 bg-popover border border-border rounded-xl shadow-2xl z-210 grid-cols-4 gap-2 w-48 animate-in zoom-in-95 duration-100 data-[state=visible]:grid">
                            {["#171717", "#262626", "#404040", "#525252", "#7c2d12", "#1e3a8a", "#064e3b", "#701a75"].map((color) => (
                                <button
                                    key={color}
                                    className={cn(
                                        "w-8 h-8 rounded-md border border-border/50 transition-all hover:scale-110",
                                        readerConfig.textColor === color && "ring-2 ring-primary ring-offset-2 ring-offset-popover"
                                    )}
                                    style={{ backgroundColor: color }}
                                    onClick={() => {
                                        setReaderConfig({ ...readerConfig, textColor: color });
                                        document.querySelectorAll('.group\\/picker > div:last-child').forEach(el => el.classList.add('hidden'));
                                    }}
                                />
                            ))}
                            <div className="col-span-4 h-px bg-border/50 my-1" />
                            <button className="col-span-4 text-[10px] text-center text-muted-foreground hover:text-foreground h-6 transition-colors" onClick={() => textInputRef.current?.click()}>Khác...</button>
                            <input type="color" ref={textInputRef} className="invisible absolute w-0 h-0" value={readerConfig.textColor || "#262626"} onChange={(e) => setReaderConfig({ ...readerConfig, textColor: e.target.value })} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest block">Font chữ</label>
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { name: "Bookerly", value: "'Bookerly', serif" },
                        { name: "Merriweather", value: "'Merriweather', serif" },
                        { name: "Georgia", value: "Georgia, serif" },
                        { name: "Inter", value: "'Inter', sans-serif" },
                    ].map((font) => (
                        <button
                            key={font.name}
                            onClick={() => setReaderConfig((prev: ReaderConfig) => ({ ...prev, fontFamily: font.value }))}
                            className={cn(
                                "px-3 py-2 rounded-xl text-sm transition-all border font-medium text-left",
                                readerConfig.fontFamily === font.value
                                    ? "bg-primary/10 border-primary text-primary shadow-sm"
                                    : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
                            )}
                            style={{ fontFamily: font.value }}
                        >
                            {font.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] text-muted-foreground/40 uppercase font-black tracking-widest">
                        Độ rộng: {
                            readerConfig.maxWidth < 700 ? "Hẹp" :
                                readerConfig.maxWidth < 1000 ? "Tiêu chuẩn" :
                                    readerConfig.maxWidth < 1400 ? "Rộng" : "Full"
                        }
                    </label>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground/40 uppercase font-black tracking-widest">Kẻ lời thoại</span>
                        <button
                            onClick={() => setReaderConfig((prev: ReaderConfig) => ({ ...prev, showDialogueLines: !prev.showDialogueLines }))}
                            className={cn(
                                "w-8 h-4 rounded-full transition-all relative",
                                readerConfig.showDialogueLines ? "bg-primary" : "bg-muted"
                            )}
                        >
                            <div className={cn(
                                "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm",
                                readerConfig.showDialogueLines ? "left-[18px]" : "left-0.5"
                            )} />
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-muted/30 p-1 rounded-xl border border-border/50">
                    <button onClick={() => setReaderConfig((prev: ReaderConfig) => ({ ...prev, maxWidth: Math.max(500, prev.maxWidth - 50) }))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background text-muted-foreground transition-colors">-</button>
                    <input type="range" min="500" max="1400" step="10" value={readerConfig.maxWidth} onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setReaderConfig((prev: ReaderConfig) => ({ ...prev, maxWidth: val }));
                    }} className="flex-1 h-1 bg-background rounded-full appearance-none accent-primary" />
                    <button onClick={() => setReaderConfig((prev: ReaderConfig) => ({ ...prev, maxWidth: Math.min(1400, prev.maxWidth + 50) }))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background text-muted-foreground transition-colors">+</button>
                </div>
            </div>

            <div className="space-y-3">
                <div className="text-[10px] text-muted-foreground/40 uppercase font-black tracking-widest">
                    Cỡ chữ: {
                        readerConfig.fontSize < 18 ? "Nhỏ" :
                            readerConfig.fontSize < 24 ? "Vừa" :
                                readerConfig.fontSize < 30 ? "Lớn" : "Rất lớn"
                    } ({readerConfig.fontSize}px)
                </div>
                <div className="flex items-center gap-3 bg-muted/30 p-1 rounded-xl border border-border/50">
                    <button onClick={() => setReaderConfig((prev: ReaderConfig) => ({ ...prev, fontSize: Math.max(14, prev.fontSize - 1) }))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background text-muted-foreground transition-colors">A-</button>
                    <input type="range" min="14" max="32" value={readerConfig.fontSize} onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setReaderConfig((prev: ReaderConfig) => ({ ...prev, fontSize: val }));
                    }} className="flex-1 h-1 bg-background rounded-full appearance-none accent-primary" />
                    <button onClick={() => setReaderConfig((prev: ReaderConfig) => ({ ...prev, fontSize: Math.min(32, prev.fontSize + 1) }))} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background text-muted-foreground transition-colors">A+</button>
                </div>
            </div>

            <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                    <div className="text-[10px] text-muted-foreground/40 uppercase font-black tracking-widest">
                        Dòng: {
                            readerConfig.lineHeight < 1.5 ? "Chặt" :
                                readerConfig.lineHeight < 1.9 ? "Dễ đọc" : "Thoáng"
                        }
                    </div>
                    <div className="flex items-center bg-muted/30 p-1 rounded-xl border border-border/50 overflow-hidden">
                        <button onClick={() => setReaderConfig((prev: ReaderConfig) => ({ ...prev, lineHeight: Math.max(1.2, prev.lineHeight - 0.1) }))} className="flex-1 h-8 text-muted-foreground hover:bg-background hover:text-foreground transition-all">-</button>
                        <button onClick={() => setReaderConfig((prev: ReaderConfig) => ({ ...prev, lineHeight: Math.min(2.5, prev.lineHeight + 0.1) }))} className="flex-1 h-8 text-muted-foreground hover:bg-background hover:text-foreground transition-all">+</button>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="text-[10px] text-muted-foreground/40 uppercase font-black tracking-widest text-center">Căn lề</div>
                    <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-border/50">
                        {[{ v: "left", i: AlignLeft }, { v: "center", i: AlignCenter }, { v: "justify", i: AlignJustify }].map((a) => (
                            <button
                                key={a.v}
                                onClick={() => setReaderConfig((prev: ReaderConfig) => ({ ...prev, textAlign: a.v as ReaderConfig["textAlign"] }))}
                                className={cn(
                                    "p-2 rounded-lg transition-all",
                                    readerConfig.textAlign === a.v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-background"
                                )}
                            >
                                <a.i className="w-4 h-4" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ===================== MAIN ===================== */

export function ReaderHeader(props: ReaderHeaderProps) {
    const {
        activeTab,
        setActiveTab,
        chapter,
        isParallel,
        setIsParallel,
        isInspecting,
        handleInspect,
        inspectionIssues,
        showSettings,
        setShowSettings,
        readerConfig,
        setReaderConfig,
        onPrev,
        onNext,
        hasPrev,
        hasNext,
        onClose,
        isTTSPlaying,
        isTTSLoading,
        handleTTSPlay,
        handleTTSStop,
        selectedVoice,
        setSelectedVoice,
        ttsPitch,
        setTtsPitch,
        ttsRate,
        setTtsRate,
        onClearTranslation,
        onAIExtract,
        scrollProgress = 0
    } = props;

    const [showTTSSettings, setShowTTSSettings] = useState(false);

    if (!chapter) return null;

    return (
        <header className="h-[72px] border-b bg-background flex flex-col z-60 shrink-0 select-none relative">
            <div className="flex-1 flex items-center justify-between px-8">
                {/* LEFT: Context & Progress */}
                <div className="flex items-center gap-4">
                    {activeTab === "translated" && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsParallel(!isParallel)}
                            className={cn(
                                "rounded-xl h-11 px-4 border transition-all",
                                isParallel
                                    ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
                                    : "text-muted-foreground hover:bg-muted border-border"
                            )}
                        >
                            <SplitSquareHorizontal className="w-4 h-4 mr-2" />
                            <span className="hidden lg:inline text-xs font-bold uppercase tracking-tight">
                                {isParallel ? "Đang song song" : "Song song"}
                            </span>
                        </Button>
                    )}
                </div>

                {/* Middle: Tab Switch ONLY (Cleaned) */}
                <div className="absolute left-1/2 -translate-x-1/2">
                    <TabSwitch activeTab={activeTab} setActiveTab={setActiveTab} />
                </div>

                {/* RIGHT: Tools & Nav */}
                <div className="flex items-center gap-2">
                    <HeaderIconButton
                        icon={<Sparkles className="w-5 h-5 text-purple-500" />}
                        title="Quét thuật ngữ AI"
                        className="text-muted-foreground hover:text-purple-600 hover:bg-purple-500/5"
                        onClick={onAIExtract}
                    />

                    <HeaderIconButton
                        icon={isInspecting ? <Sparkles className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                        onClick={handleInspect}
                        disabled={isInspecting}
                        title="Soi lỗi bằng AI"
                        className={cn(
                            isInspecting ? "bg-amber-500/10 text-amber-600" : "text-muted-foreground hover:text-amber-600 hover:bg-amber-500/5"
                        )}
                    >
                        {inspectionIssues.length > 0 && (
                            <span className="absolute -top-1 -right-1 h-4 w-4 text-[10px] rounded-full bg-red-500 text-white flex items-center justify-center font-bold ring-2 ring-background">
                                {inspectionIssues.length}
                            </span>
                        )}
                    </HeaderIconButton>

                    {activeTab === "translated" && (
                        <HeaderIconButton
                            icon={<Eraser className="w-5 h-5" />}
                            title="Xóa bản dịch (giữ bản gốc)"
                            onClick={onClearTranslation}
                            className="text-muted-foreground hover:text-amber-500 hover:bg-amber-500/5"
                        />
                    )}

                    {/* TTS Section */}
                    <TTSControls
                        isTTSPlaying={isTTSPlaying}
                        isTTSLoading={isTTSLoading}
                        handleTTSPlay={handleTTSPlay}
                        handleTTSStop={handleTTSStop}
                        showTTSSettings={showTTSSettings}
                        setShowTTSSettings={setShowTTSSettings}
                        selectedVoice={selectedVoice}
                        setSelectedVoice={setSelectedVoice}
                        ttsPitch={ttsPitch}
                        setTtsPitch={setTtsPitch}
                        ttsRate={ttsRate}
                        setTtsRate={setTtsRate}
                    />

                    {/* Display Settings */}
                    <div className="relative">
                        <HeaderIconButton
                            icon={<Type className="w-5 h-5" />}
                            title="Tùy chỉnh giao diện"
                            onClick={() => setShowSettings(!showSettings)}
                            className={cn(
                                showSettings ? "bg-primary/10 text-primary border-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        />
                        <ReaderSettingsPanel
                            showSettings={showSettings}
                            setShowSettings={setShowSettings}
                            readerConfig={readerConfig}
                            setReaderConfig={setReaderConfig}
                        />
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center bg-muted/50 rounded-xl border border-border p-1 mx-1">
                        <Button variant="ghost" size="icon" disabled={!hasPrev} onClick={onPrev} className="w-10 h-10 rounded-lg"><ChevronLeft className="w-5 h-5" /></Button>
                        <Button variant="ghost" size="icon" disabled={!hasNext} onClick={onNext} className="w-10 h-10 rounded-lg"><ChevronRight className="w-5 h-5" /></Button>
                    </div>

                    <HeaderIconButton
                        icon={<X className="w-5 h-5" />}
                        onClick={onClose}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    />
                </div>
            </div>

            {/* SLEEK PROGRESS BAR (Bottom of header) */}
            <div className="absolute bottom-0 left-0 h-[2px] bg-primary/20 w-full overflow-hidden">
                <div
                    className="h-full bg-primary transition-all duration-300 ease-out shadow-[0_0_8px_rgba(var(--primary),0.5)]"
                    style={{ width: `${Math.round(scrollProgress)}%` }}
                />
            </div>
        </header>
    );
}
