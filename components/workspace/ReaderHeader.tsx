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
    setSelectedVoice
}: ReaderHeaderProps) {
    if (!chapter) return null;

    // TTS Local UI State
    const [showTTSSettings, setShowTTSSettings] = useState(false);

    return (
        <header className="h-16 border-b border-white/10 bg-gradient-to-b from-[#1e1e2e] to-[#1a1a2e] flex items-center justify-between px-6 shrink-0 select-none">
            <div className="flex items-center gap-6 flex-1 min-w-0">
                <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg shrink-0">
                    <button
                        onClick={() => setActiveTab("translated")}
                        className={cn(
                            "relative px-6 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                            activeTab === "translated"
                                ? "bg-white/10 text-white shadow-sm"
                                : "text-white/50 hover:text-white/80 hover:bg-white/5"
                        )}
                        title="Xem bản dịch tiếng Việt"
                    >
                        <div className="flex items-center gap-2.5">
                            <Edit3 className="w-4 h-4" />
                            <span className="hidden sm:inline">Bản dịch</span>
                        </div>
                    </button>

                    <button
                        onClick={() => setActiveTab("original")}
                        className={cn(
                            "relative px-6 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                            activeTab === "original"
                                ? "bg-white/10 text-white shadow-sm"
                                : "text-white/50 hover:text-white/80 hover:bg-white/5"
                        )}
                        title="Xem bản gốc tiếng Trung"
                    >
                        <div className="flex items-center gap-2.5">
                            <BookOpen className="w-4 h-4" />
                            <span className="hidden sm:inline">Bản gốc</span>
                        </div>
                    </button>
                </div>

                {/* Chapter Title - Flexible */}
                <h2 className="text-white/70 font-bold truncate flex-1 min-w-0" title={chapter.title}>
                    {chapter.title_translated || chapter.title}
                </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <Button
                    size="sm"
                    variant="ghost"
                    className={cn("text-white/50 hover:text-white border border-transparent hover:border-white/10", isParallel && "bg-white/10 text-white border-white/20")}
                    onClick={() => setIsParallel(!isParallel)}
                    title="Hiển thị song song bản dịch và bản gốc"
                >
                    <SplitSquareHorizontal className="w-4 h-4 sm:mr-2" />
                    <span className="hidden lg:inline">Song song</span>
                </Button>

                <div className="h-6 w-px bg-white/10 mx-2 hidden md:block" />

                <Button
                    size="sm"
                    variant="ghost"
                    className={cn("text-white/50 hover:text-white border border-transparent hover:border-white/10", isInspecting && "animate-pulse text-amber-500")}
                    onClick={handleInspect}
                    disabled={isInspecting}
                    title="Soi lỗi bản dịch bằng AI"
                >
                    {isInspecting ? <Sparkles className="w-4 h-4 sm:mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 sm:mr-2" />}
                    <span className="hidden lg:inline">Soi lỗi</span>
                    {inspectionIssues.length > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{inspectionIssues.length}</span>
                    )}
                </Button>

                {/* TTS Controls */}
                <div className="relative flex items-center bg-white/5 rounded-lg border border-white/5 mx-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        className={cn(
                            "text-white/60 hover:text-white hover:bg-white/10 border-r border-white/10 rounded-r-none h-9 px-3",
                            isTTSPlaying && "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                        )}
                        onClick={handleTTSPlay}
                        disabled={isTTSLoading}
                        title="Đọc truyện bằng giọng AI"
                    >
                        {isTTSLoading ? (
                            <Sparkles className="w-4 h-4 sm:mr-2 animate-spin text-amber-500" />
                        ) : isTTSPlaying ? (
                            <Pause className="w-4 h-4 sm:mr-2" />
                        ) : (
                            <Volume2 className="w-4 h-4 sm:mr-2" />
                        )}
                        <span className="hidden lg:inline">{isTTSLoading ? "Creating..." : "TTS"}</span>
                    </Button>

                    {isTTSPlaying && (
                        <Button
                            size="icon"
                            variant="ghost"
                            className="text-white/40 hover:text-red-400 hover:bg-red-500/10 w-8 h-9 border-r border-white/10 rounded-none"
                            onClick={handleTTSStop}
                            title="Dừng TTS"
                        >
                            <VolumeX className="w-4 h-4" />
                        </Button>
                    )}

                    <button
                        onClick={() => setShowTTSSettings(!showTTSSettings)}
                        className="text-white/40 hover:text-white hover:bg-white/10 px-1.5 h-9 rounded-r-lg transition-colors"
                        title="Chọn giọng đọc"
                    >
                        <span className="text-[10px]">▼</span>
                    </button>

                    {showTTSSettings && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-[#1e1e2e] border border-white/10 rounded-xl shadow-2xl p-3 z-[200] space-y-2 animate-in fade-in slide-in-from-top-2">
                            <div className="text-xs text-white/40 uppercase font-bold tracking-wider mb-2">Giọng đọc</div>
                            {VIETNAMESE_VOICES.map((voice) => (
                                <button
                                    key={voice.value}
                                    onClick={() => {
                                        setSelectedVoice(voice.value);
                                        setShowTTSSettings(false);
                                    }}
                                    className={cn(
                                        "w-full px-3 py-2 rounded text-sm text-left transition-all",
                                        selectedVoice === voice.value
                                            ? "bg-[#6c5ce7] text-white"
                                            : "text-white/60 hover:bg-white/10"
                                    )}
                                >
                                    {voice.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="relative">
                    <Button
                        size="sm"
                        variant="ghost"
                        className={cn("text-white/50 hover:text-white", showSettings && "bg-white/10 text-white")}
                        onClick={() => setShowSettings(!showSettings)}
                        title="Tùy chỉnh giao diện đọc truyện"
                    >
                        <Type className="w-4 h-4 sm:mr-2" />
                        <span className="hidden lg:inline">Giao diện</span>
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
                                        onClick={() => setReaderConfig({ ...readerConfig, fontSize: Math.max(14, readerConfig.fontSize - 1) })}
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
                                        onClick={() => setReaderConfig({ ...readerConfig, fontSize: Math.min(32, readerConfig.fontSize + 1) })}
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
                                            onClick={() => setReaderConfig({ ...readerConfig, lineHeight: Math.max(1.2, readerConfig.lineHeight - 0.1) })}
                                            className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded"
                                        >
                                            -
                                        </button>
                                        <div className="flex-1 text-center text-xs text-white/70">{readerConfig.lineHeight.toFixed(1)}</div>
                                        <button
                                            onClick={() => setReaderConfig({ ...readerConfig, lineHeight: Math.min(2.5, readerConfig.lineHeight + 0.1) })}
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
                                            onClick={() => setReaderConfig({ ...readerConfig, textColor: c.color })}
                                            className={cn(
                                                "w-8 h-8 rounded-full border-2 transition-all",
                                                readerConfig.textColor === c.color ? "border-amber-500 scale-110" : "border-transparent opacity-50 hover:opacity-100 scale-100"
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

                <div className="h-6 w-px bg-white/10 mx-2 hidden md:block" />

                <Button size="icon" variant="ghost" disabled={!hasPrev} onClick={onPrev} className="hover:bg-white/10 text-white/70" title="Chương trước"><ChevronLeft className="w-5 h-5" /></Button>
                <Button size="icon" variant="ghost" disabled={!hasNext} onClick={onNext} className="hover:bg-white/10 text-white/70" title="Chương sau"><ChevronRight className="w-5 h-5" /></Button>
            </div>
        </header>
    );
}
