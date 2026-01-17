import React, { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, SplitSquareHorizontal, Edit3, BookOpen, Type, AlignLeft, AlignCenter, AlignRight, AlignJustify, Search, ShieldCheck, Sparkles, X, Volume2, VolumeX, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { speak, prefetchTTS, VIETNAMESE_VOICES } from "@/lib/tts";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InspectionIssue } from "@/lib/gemini";

export interface ReaderConfig {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    textAlign: "left" | "center" | "right" | "justify";
    textColor: string;
    ttsPitch: number;
    ttsRate: number;
    ttsVoice: string;
}

interface ReaderHeaderProps {
    activeTab: "translated" | "original";
    setActiveTab: (tab: "translated" | "original") => void;
    chapter: any;
    isParallel: boolean;
    setIsParallel: (v: boolean) => void;
    isInspecting: boolean;
    handleInspect: () => void;
    inspectionIssues: InspectionIssue[];
    showSettings: boolean;
    setShowSettings: (v: boolean) => void;
    readerConfig: ReaderConfig;
    setReaderConfig: (config: ReaderConfig) => void;
    onPrev?: () => void;
    onNext?: () => void;
    hasPrev?: boolean;
    hasNext?: boolean;
    onClose: () => void;
    // TTS Props
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
}

export function ReaderHeader({
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
    setTtsRate
}: ReaderHeaderProps) {
    if (!chapter) return null;

    // TTS Local UI State
    const [showTTSSettings, setShowTTSSettings] = useState(false);

    return (
        <header className="h-[72px] border-b border-white/5 bg-[#0f071a]/95 backdrop-blur-2xl flex items-center justify-between px-8 shrink-0 select-none z-[60]">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
                    <button
                        onClick={() => setActiveTab("translated")}
                        className={cn(
                            "relative px-5 py-2 rounded-lg text-sm font-bold transition-all duration-300",
                            activeTab === "translated"
                                ? "bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]"
                                : "text-white/40 hover:text-white/80 hover:bg-white/5"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <Edit3 className="w-4 h-4" />
                            <span className="hidden sm:inline">Bản dịch</span>
                        </div>
                    </button>

                    <button
                        onClick={() => setActiveTab("original")}
                        className={cn(
                            "relative px-5 py-2 rounded-lg text-sm font-bold transition-all duration-300",
                            activeTab === "original"
                                ? "bg-zinc-700 text-white shadow-lg"
                                : "text-white/40 hover:text-white/80 hover:bg-white/5"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            <span className="hidden sm:inline">Bản gốc</span>
                        </div>
                    </button>
                </div>

                {activeTab === 'translated' && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsParallel(!isParallel)}
                        className={cn(
                            "rounded-xl gap-2 h-11 px-4 transition-all duration-300 border border-white/5 ml-2",
                            isParallel ? "bg-purple-500/20 text-purple-400 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]" : "text-white/40 hover:text-white/80 hover:bg-white/5"
                        )}
                    >
                        <SplitSquareHorizontal className="w-4 h-4" />
                        <span className="hidden lg:inline text-xs font-bold uppercase tracking-widest">{isParallel ? "Đang song song" : "Song song"}</span>
                    </Button>
                )}
            </div>

            {/* Chapter Title - Floating in Center */}
            <div className="absolute left-1/2 -translate-x-1/2 max-w-[30%] hidden 2xl:block pointer-events-none">
                <div className="text-sm font-semibold text-white/40 truncate text-center font-serif italic">
                    {chapter.title_translated || chapter.title}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleInspect}
                    disabled={isInspecting}
                    className={cn(
                        "w-11 h-11 rounded-xl transition-all duration-300 border border-white/5 relative",
                        isInspecting ? "bg-amber-500/10 text-amber-500 animate-pulse" : "text-white/40 hover:text-amber-500 hover:bg-amber-500/10"
                    )}
                    title="Soi lỗi bằng AI"
                >
                    {isInspecting ? <Sparkles className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                    {inspectionIssues.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-[#0f071a]">
                            {inspectionIssues.length}
                        </span>
                    )}
                </Button>

                <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-1 mx-1">
                    <div className="relative group">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleTTSPlay}
                            disabled={isTTSLoading}
                            className={cn(
                                "h-9 rounded-lg px-3 transition-all duration-300",
                                isTTSPlaying ? "bg-emerald-500 text-white shadow-lg" : "text-white/60 hover:text-white hover:bg-white/5"
                            )}
                        >
                            {isTTSLoading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full", isTTSPlaying ? "bg-white animate-pulse" : "bg-white/20")} />
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
                                showTTSSettings ? "text-emerald-400 bg-emerald-500/10" : "text-white/40 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <span className="text-[10px] scale-75">▼</span>
                        </Button>

                        {showTTSSettings && (
                            <div className="absolute top-full right-0 mt-3 w-56 bg-[#1a1a2e]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 z-[200] space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="text-xs text-white/30 uppercase font-black tracking-widest">TTS Settings</div>
                                <div className="space-y-1">
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
                                                    ? "bg-purple-600 text-white shadow-inner"
                                                    : "text-white/60 hover:bg-white/5"
                                            )}
                                        >
                                            {voice.name}
                                        </button>
                                    ))}
                                </div>
                                <div className="h-px bg-white/5" />
                                <div className="space-y-3 pt-1">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-bold text-white/40 uppercase tracking-tighter">
                                            <span>Pitch</span>
                                            <span className="text-emerald-400">{ttsPitch > 0 ? `+${ttsPitch}` : ttsPitch}</span>
                                        </div>
                                        <input type="range" min="-20" max="20" value={ttsPitch} onChange={(e) => setTtsPitch(parseInt(e.target.value))} className="w-full h-1 bg-white/10 rounded-full appearance-none accent-purple-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-bold text-white/40 uppercase tracking-tighter">
                                            <span>Rate</span>
                                            <span className="text-emerald-400">{ttsRate > 0 ? `+${ttsRate}` : ttsRate}%</span>
                                        </div>
                                        <input type="range" min="-50" max="50" value={ttsRate} onChange={(e) => setTtsRate(parseInt(e.target.value))} className="w-full h-1 bg-white/10 rounded-full appearance-none accent-purple-500" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowSettings(!showSettings)}
                        className={cn(
                            "w-11 h-11 rounded-xl transition-all duration-300 border border-white/5",
                            showSettings ? "bg-purple-500/20 text-purple-400 border-purple-500/30 shadow-lg" : "text-white/40 hover:text-white hover:bg-white/5"
                        )}
                        title="Tùy chỉnh giao diện"
                    >
                        <Type className="w-5 h-5" />
                    </Button>

                    {showSettings && (
                        <div className="absolute top-full right-0 mt-3 w-80 bg-[#1e1e2e]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-5 z-[200] space-y-5 animate-in fade-in slide-in-from-top-2">
                            <div className="text-xs text-white/30 uppercase font-black tracking-widest">Reader Config</div>
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
                                            "px-2 py-2 rounded-xl text-sm transition-all border font-medium",
                                            readerConfig.fontFamily === font.value
                                                ? "bg-purple-600 border-purple-500 text-white shadow-lg"
                                                : "bg-white/5 border-transparent text-white/60 hover:bg-white/10"
                                        )}
                                        style={{ fontFamily: font.value }}
                                    >
                                        {font.name}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-[10px] text-white/40 uppercase font-black tracking-widest">Font Size: {readerConfig.fontSize}px</div>
                                </div>
                                <div className="flex items-center gap-3 bg-white/5 p-1 rounded-xl border border-white/5">
                                    <button onClick={() => setReaderConfig({ ...readerConfig, fontSize: Math.max(14, readerConfig.fontSize - 1) })} className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-lg">A-</button>
                                    <input type="range" min="14" max="32" value={readerConfig.fontSize} onChange={(e) => setReaderConfig({ ...readerConfig, fontSize: parseInt(e.target.value) })} className="flex-1 h-1 bg-white/10 rounded-full appearance-none accent-purple-500" />
                                    <button onClick={() => setReaderConfig({ ...readerConfig, fontSize: Math.min(32, readerConfig.fontSize + 1) })} className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-lg">A+</button>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1 space-y-3">
                                    <div className="text-[10px] text-white/40 uppercase font-black tracking-widest">Line Height</div>
                                    <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/5">
                                        <button onClick={() => setReaderConfig({ ...readerConfig, lineHeight: Math.max(1.2, readerConfig.lineHeight - 0.1) })} className="w-9 h-9 flex items-center justify-center text-white/40 hover:text-white rounded-lg">-</button>
                                        <span className="flex-1 text-center text-xs font-bold">{readerConfig.lineHeight.toFixed(1)}</span>
                                        <button onClick={() => setReaderConfig({ ...readerConfig, lineHeight: Math.min(2.5, readerConfig.lineHeight + 0.1) })} className="w-9 h-9 flex items-center justify-center text-white/40 hover:text-white rounded-lg">+</button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="text-[10px] text-white/40 uppercase font-black tracking-widest text-center">Alignment</div>
                                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                                        {[
                                            { value: "left", icon: AlignLeft },
                                            { value: "center", icon: AlignCenter },
                                            { value: "justify", icon: AlignJustify },
                                        ].map((align) => (
                                            <button
                                                key={align.value}
                                                onClick={() => setReaderConfig({ ...readerConfig, textAlign: align.value as any })}
                                                className={cn(
                                                    "p-2 rounded-lg transition-all",
                                                    readerConfig.textAlign === align.value
                                                        ? "bg-purple-600 text-white shadow-lg"
                                                        : "text-white/40 hover:text-white hover:bg-white/10"
                                                )}
                                            >
                                                <align.icon className="w-4 h-4" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="text-[10px] text-white/40 uppercase font-black tracking-widest">Theme Palette</div>
                                <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                                    {[
                                        { color: "#cbd5e1", label: "Default" },
                                        { color: "#ffffff", label: "Pure" },
                                        { color: "#e2e8f0", label: "Soft" },
                                        { color: "#ddd6fe", label: "Purple" },
                                        { color: "#fcd34d", label: "Amber" },
                                    ].map((c) => (
                                        <button
                                            key={c.color}
                                            onClick={() => setReaderConfig({ ...readerConfig, textColor: c.color })}
                                            className={cn(
                                                "w-8 h-8 rounded-full border-2 transition-all shadow-sm",
                                                readerConfig.textColor === c.color ? "border-purple-500 scale-125 ring-4 ring-purple-500/20" : "border-transparent opacity-60 hover:opacity-100"
                                            )}
                                            style={{ backgroundColor: c.color }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-1 mx-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onPrev}
                        disabled={!hasPrev}
                        className="w-10 h-10 rounded-lg text-white/30 hover:text-white disabled:opacity-10 transition-all duration-300"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onNext}
                        disabled={!hasNext}
                        className="w-10 h-10 rounded-lg text-white/30 hover:text-white disabled:opacity-10 transition-all duration-300"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </Button>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="w-11 h-11 rounded-xl text-white/20 hover:text-red-400 hover:bg-red-400/10 border border-white/5 transition-all duration-300"
                >
                    <X className="w-5 h-5" />
                </Button>
            </div>
        </header>
    );
}
