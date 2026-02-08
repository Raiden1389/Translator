"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, X } from "lucide-react";
import { VIETNAMESE_VOICES } from "@/lib/tts";

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

export function TTSControls({
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
        <div className="flex bg-muted/30 border border-border/40">
            <div className="relative group border-r border-border/40">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleTTSPlay}
                    disabled={isTTSLoading}
                    className={cn(
                        "h-7 rounded-none px-3 transition-colors",
                        isTTSPlaying
                            ? "bg-emerald-600/10 text-emerald-600"
                            : "text-foreground/80 hover:bg-muted/50 hover:text-foreground"
                    )}
                >
                    {isTTSLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <div className={cn(
                                "w-1.5 h-1.5 rounded-none",
                                isTTSPlaying ? "bg-emerald-600 animate-pulse" : "bg-muted-foreground/30"
                            )} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">TTS</span>
                        </div>
                    )}
                </Button>

                {isTTSPlaying && (
                    <button
                        className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleTTSStop();
                        }}
                    >
                        <X className="w-2 h-2" />
                    </button>
                )}
            </div>

            <div className="relative">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowTTSSettings(!showTTSSettings)}
                    className={cn(
                        "w-7 h-7 rounded-none transition-all",
                        showTTSSettings ? "bg-muted text-foreground" : "text-foreground/60 hover:bg-muted/50 hover:text-foreground"
                    )}
                >
                    <span className="text-[7px]">▼</span>
                </Button>

                {showTTSSettings && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-background border border-border text-foreground rounded-none shadow-none p-3 z-200 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest mb-2 border-b border-border/40 pb-1">Giọng đọc</div>
                        <div className="space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
                            {VIETNAMESE_VOICES.map((voice) => (
                                <button
                                    key={voice.value}
                                    onClick={() => {
                                        setSelectedVoice(voice.value);
                                        setShowTTSSettings(false);
                                    }}
                                    className={cn(
                                        "w-full px-2 py-1.5 text-[10px] text-left transition-colors font-bold",
                                        selectedVoice === voice.value
                                            ? "bg-muted text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {voice.name}
                                </button>
                            ))}
                        </div>
                        <div className="h-px bg-border/40 my-2" />
                        <div className="space-y-3 px-1 pb-1">
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
                                    <span>Pitch</span>
                                    <span className="text-foreground">{ttsPitch > 0 ? `+${ttsPitch}` : ttsPitch}</span>
                                </div>
                                <input type="range" min="-20" max="20" value={ttsPitch} onChange={(e) => setTtsPitch(parseInt(e.target.value))} className="w-full h-1 bg-muted rounded-none appearance-none accent-foreground" />
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
                                    <span>Tốc độ</span>
                                    <span className="text-foreground">{ttsRate > 0 ? `+${ttsRate}` : ttsRate}%</span>
                                </div>
                                <input type="range" min="-50" max="50" value={ttsRate} onChange={(e) => setTtsRate(parseInt(e.target.value))} className="w-full h-1 bg-muted rounded-none appearance-none accent-foreground" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
