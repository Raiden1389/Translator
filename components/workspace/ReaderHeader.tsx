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
    backgroundColor: string;
    maxWidth: number;
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
    // Hooks must be called before early return
    const [showTTSSettings, setShowTTSSettings] = useState(false);
    const bgInputRef = useRef<HTMLInputElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);

    if (!chapter) return null;

    return (
        <header className="h-[72px] border-b border-border bg-background flex items-center justify-between px-8 shrink-0 select-none z-[60]">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border shrink-0">
                    <button
                        onClick={() => setActiveTab("translated")}
                        className={cn(
                            "relative px-5 py-2 rounded-lg text-sm font-bold transition-all duration-300",
                            activeTab === "translated"
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                                ? "bg-secondary text-secondary-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                            "rounded-xl gap-2 h-11 px-4 transition-all duration-300 border border-border ml-2",
                            isParallel ? "bg-primary/10 text-primary border-primary/30 shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                    >
                        <SplitSquareHorizontal className="w-4 h-4" />
                        <span className="hidden lg:inline text-xs font-bold uppercase tracking-widest">{isParallel ? "Đang song song" : "Song song"}</span>
                    </Button>
                )}
            </div>

            {/* Chapter Title - Floating in Center */}
            <div className="absolute left-1/2 -translate-x-1/2 max-w-[30%] hidden 2xl:block pointer-events-none">
                <div className="text-sm font-semibold text-muted-foreground/60 truncate text-center font-serif italic">
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
                        "w-11 h-11 rounded-xl transition-all duration-300 border border-border relative",
                        isInspecting ? "bg-amber-500/10 text-amber-600 animate-pulse" : "text-muted-foreground hover:text-amber-600 hover:bg-amber-500/5 shadow-sm"
                    )}
                    title="Soi lỗi bằng AI"
                >
                    {isInspecting ? <Sparkles className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                    {inspectionIssues.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-background">
                            {inspectionIssues.length}
                        </span>
                    )}
                </Button>

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
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                                                    ? "bg-primary text-primary-foreground shadow-sm"
                                                    : "text-muted-foreground hover:bg-muted"
                                            )}
                                        >
                                            {voice.name}
                                        </button>
                                    ))}
                                </div>
                                <div className="h-px bg-white/5" />
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

                <div className="relative">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowSettings(!showSettings)}
                        className={cn(
                            "w-11 h-11 rounded-xl transition-all duration-300 border border-border shadow-sm",
                            showSettings ? "bg-primary/10 text-primary border-primary/30 shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                        title="Tùy chỉnh giao diện"
                    >
                        <Type className="w-5 h-5" />
                    </Button>

                    {showSettings && (
                        <div className="absolute top-full right-0 mt-3 w-80 bg-popover border border-border text-popover-foreground rounded-2xl shadow-xl p-5 z-200 space-y-5 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center justify-between pb-1 border-b border-border/50">
                                <div className="text-xs text-muted-foreground/80 uppercase font-black tracking-widest">Cài đặt hiển thị</div>
                                <X className="w-4 h-4 text-muted-foreground/30 cursor-pointer hover:text-destructive" onClick={() => setShowSettings(false)} />
                            </div>

                            {/* Color Pickers: Background & Text */}
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
                                        <div className="hidden absolute top-full left-0 mt-2 p-2 bg-popover border border-border rounded-xl shadow-2xl z-[210] grid grid-cols-4 gap-2 w-48 animate-in zoom-in-95 duration-100">
                                            {[
                                                "#ffffff", "#f8fafc", "#f1f5f9", "#fdfcf0",
                                                "#f5f5f4", "#faf7ed", "#f3f4f6", "#ecfdf5"
                                            ].map((color) => (
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
                                            <button
                                                className="col-span-4 text-[10px] text-center text-muted-foreground hover:text-foreground h-6 transition-colors"
                                                onClick={() => bgInputRef.current?.click()}
                                            >
                                                Khác...
                                            </button>
                                            <input
                                                type="color"
                                                ref={bgInputRef}
                                                className="invisible absolute w-0 h-0"
                                                value={readerConfig.backgroundColor || "#ffffff"}
                                                onChange={(e) => setReaderConfig({ ...readerConfig, backgroundColor: e.target.value })}
                                            />
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
                                        <div className="hidden absolute top-full right-0 mt-2 p-2 bg-popover border border-border rounded-xl shadow-2xl z-[210] grid grid-cols-4 gap-2 w-48 animate-in zoom-in-95 duration-100">
                                            {[
                                                "#171717", "#262626", "#404040", "#525252",
                                                "#7c2d12", "#1e3a8a", "#064e3b", "#701a75"
                                            ].map((color) => (
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
                                            <button
                                                className="col-span-4 text-[10px] text-center text-muted-foreground hover:text-foreground h-6 transition-colors"
                                                onClick={() => textInputRef.current?.click()}
                                            >
                                                Khác...
                                            </button>
                                            <input
                                                type="color"
                                                ref={textInputRef}
                                                className="invisible absolute w-0 h-0"
                                                value={readerConfig.textColor || "#262626"}
                                                onChange={(e) => setReaderConfig({ ...readerConfig, textColor: e.target.value })}
                                            />
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
                                            onClick={() => setReaderConfig({ ...readerConfig, fontFamily: font.value })}
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
                                    <div className="text-[10px] text-muted-foreground/40 uppercase font-black tracking-widest">Độ rộng: {readerConfig.maxWidth >= 1800 ? "Full" : readerConfig.maxWidth + "px"}</div>
                                </div>
                                <div className="flex items-center gap-3 bg-muted/30 p-1 rounded-xl border border-border/50">
                                    <button onClick={() => setReaderConfig({ ...readerConfig, maxWidth: Math.max(600, readerConfig.maxWidth - 100) })} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background rounded-lg transition-colors">-</button>
                                    <input type="range" min="600" max="1800" step="50" value={readerConfig.maxWidth || 800} onChange={(e) => setReaderConfig({ ...readerConfig, maxWidth: parseInt(e.target.value) })} className="flex-1 h-1 bg-background rounded-full appearance-none accent-primary" />
                                    <button onClick={() => setReaderConfig({ ...readerConfig, maxWidth: Math.min(1800, readerConfig.maxWidth + 100) })} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background rounded-lg transition-colors">+</button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-[10px] text-muted-foreground/40 uppercase font-black tracking-widest">Cỡ chữ: {readerConfig.fontSize}px</div>
                                </div>
                                <div className="flex items-center gap-3 bg-muted/30 p-1 rounded-xl border border-border/50">
                                    <button onClick={() => setReaderConfig({ ...readerConfig, fontSize: Math.max(14, readerConfig.fontSize - 1) })} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background rounded-lg transition-colors">A-</button>
                                    <input type="range" min="14" max="32" value={readerConfig.fontSize || 18} onChange={(e) => setReaderConfig({ ...readerConfig, fontSize: parseInt(e.target.value) })} className="flex-1 h-1 bg-background rounded-full appearance-none accent-primary" />
                                    <button onClick={() => setReaderConfig({ ...readerConfig, fontSize: Math.min(32, readerConfig.fontSize + 1) })} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background rounded-lg transition-colors">A+</button>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1 space-y-2">
                                    <div className="text-[10px] text-muted-foreground/40 uppercase font-black tracking-widest">Dòng: {readerConfig.lineHeight.toFixed(1)}</div>
                                    <div className="flex items-center bg-muted/30 p-1 rounded-xl border border-border/50">
                                        <button onClick={() => setReaderConfig({ ...readerConfig, lineHeight: Math.max(1.2, readerConfig.lineHeight - 0.1) })} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-lg transition-colors">-</button>
                                        <button onClick={() => setReaderConfig({ ...readerConfig, lineHeight: Math.min(2.5, readerConfig.lineHeight + 0.1) })} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-lg transition-colors">+</button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="text-[10px] text-muted-foreground/40 uppercase font-black tracking-widest text-center">Căn lề</div>
                                    <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-border/50">
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
                                                        ? "bg-primary text-primary-foreground shadow-sm"
                                                        : "text-muted-foreground hover:text-foreground hover:bg-background"
                                                )}
                                            >
                                                <align.icon className="w-4 h-4" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center bg-muted/50 rounded-xl border border-border p-1 mx-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onPrev}
                        disabled={!hasPrev}
                        className="w-10 h-10 rounded-lg text-muted-foreground/30 hover:text-foreground disabled:opacity-10 transition-all duration-300"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onNext}
                        disabled={!hasNext}
                        className="w-10 h-10 rounded-lg text-muted-foreground/30 hover:text-foreground disabled:opacity-10 transition-all duration-300"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </Button>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="w-11 h-11 rounded-xl text-muted-foreground/20 hover:text-destructive hover:bg-destructive/10 border border-border shadow-sm transition-all duration-300"
                >
                    <X className="w-5 h-5" />
                </Button>
            </div>
        </header>
    );
}
