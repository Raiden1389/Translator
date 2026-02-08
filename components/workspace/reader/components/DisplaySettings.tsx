"use client";

import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { X, AlignLeft, AlignCenter, AlignJustify } from "lucide-react";
import { ReaderConfig } from "../../shared/ReaderHeader";

// ═══════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════

const THEME_PRESETS = [
    { name: "Light", icon: "☀️", bg: "#ffffff", text: "#171717" },
    { name: "Sepia", icon: "📜", bg: "#faf7ed", text: "#5c4b37" },
    { name: "Dusk", icon: "🌆", bg: "#2d2b3d", text: "#c4b5a0" },
    { name: "Night", icon: "🌙", bg: "#1a1a2e", text: "#c8c8d0" },
    { name: "AMOLED", icon: "🖤", bg: "#000000", text: "#e0e0e0" },
] as const;

const BG_COLORS = ["#ffffff", "#f8fafc", "#f1f5f9", "#fdfcf0", "#f5f5f4", "#faf7ed", "#f3f4f6", "#ecfdf5"] as const;
const TEXT_COLORS = ["#171717", "#262626", "#404040", "#525252", "#7c2d12", "#1e3a8a", "#064e3b", "#701a75"] as const;

const FONTS = [
    { name: "Bookerly", value: "'Bookerly', serif", category: "serif" },
    { name: "Merriweather", value: "var(--font-merriweather), serif", category: "serif" },
    { name: "Lora", value: "var(--font-lora), serif", category: "serif" },
    { name: "Noto Serif", value: "var(--font-noto-serif), serif", category: "serif" },
    { name: "Literata", value: "var(--font-literata), serif", category: "serif" },
    { name: "Crimson Text", value: "var(--font-crimson-text), serif", category: "serif" },
    { name: "Georgia", value: "Georgia, serif", category: "serif" },
    { name: "Inter", value: "'Inter', sans-serif", category: "sans" },
    { name: "Nunito", value: "var(--font-nunito), sans-serif", category: "sans" },
] as const;

const ALIGN_OPTIONS = [
    { v: "left" as const, i: AlignLeft },
    { v: "center" as const, i: AlignCenter },
    { v: "justify" as const, i: AlignJustify }
] as const;

const SLIDER_CLASS = "w-full h-1.5 bg-muted/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer";

// ═══════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════

interface DisplaySettingsProps {
    showSettings: boolean;
    setShowSettings: (v: boolean) => void;
    readerConfig: ReaderConfig;
    setReaderConfig: React.Dispatch<React.SetStateAction<ReaderConfig>>;
}

export function DisplaySettings({
    showSettings,
    setShowSettings,
    readerConfig,
    setReaderConfig
}: DisplaySettingsProps) {
    const bgInputRef = useRef<HTMLInputElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);
    const [activePicker, setActivePicker] = React.useState<"bg" | "text" | null>(null);

    // Local state for smooth slider dragging
    const [localFontSize, setLocalFontSize] = useState(readerConfig.fontSize);
    const [localLineHeight, setLocalLineHeight] = useState(readerConfig.lineHeight);
    const [localMaxWidth, setLocalMaxWidth] = useState(readerConfig.maxWidth);
    const [localParagraphSpacing, setLocalParagraphSpacing] = useState(readerConfig.paragraphSpacing ?? 0.75);
    const [localLetterSpacing, setLocalLetterSpacing] = useState(readerConfig.letterSpacing ?? 0);

    // Sync local state when readerConfig changes externally
    useEffect(() => {
        setLocalFontSize(readerConfig.fontSize);
        setLocalLineHeight(readerConfig.lineHeight);
        setLocalMaxWidth(readerConfig.maxWidth);
        setLocalParagraphSpacing(readerConfig.paragraphSpacing ?? 0.75);
        setLocalLetterSpacing(readerConfig.letterSpacing ?? 0);
    }, [readerConfig.fontSize, readerConfig.lineHeight, readerConfig.maxWidth, readerConfig.paragraphSpacing, readerConfig.letterSpacing]);

    // Commit to global state only when user releases slider
    const handleCommit = () => {
        setReaderConfig(p => ({
            ...p,
            fontSize: localFontSize,
            lineHeight: localLineHeight,
            maxWidth: localMaxWidth,
            paragraphSpacing: localParagraphSpacing,
            letterSpacing: localLetterSpacing,
        }));
    };

    if (!showSettings) return null;

    return (
        <div className="absolute top-full right-0 mt-2 w-80 bg-background border border-border text-foreground rounded-lg p-4 z-200 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200 max-h-[80vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-1 border-b border-border/40">
                <div className="text-[10px] text-foreground/70 uppercase font-black tracking-widest">Hiển thị</div>
                <X className="w-4 h-4 text-foreground/40 cursor-pointer hover:text-foreground transition-colors" onClick={() => setShowSettings(false)} />
            </div>

            {/* ─── THEME PRESETS ─── */}
            <div className="space-y-1.5">
                <label className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest block">Theme nhanh</label>
                <div className="flex gap-1.5">
                    {THEME_PRESETS.map((theme) => {
                        const isActive = readerConfig.backgroundColor === theme.bg && readerConfig.textColor === theme.text;
                        return (
                            <button
                                key={theme.name}
                                onClick={() => setReaderConfig(prev => ({
                                    ...prev,
                                    backgroundColor: theme.bg,
                                    textColor: theme.text,
                                }))}
                                className={cn(
                                    "flex-1 flex flex-col items-center gap-1 py-1.5 px-1 rounded-md border transition-all text-[8px] font-bold",
                                    isActive
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border/60 text-muted-foreground hover:border-foreground/30"
                                )}
                                title={theme.name}
                            >
                                <div
                                    className="w-5 h-5 rounded-sm border border-border/40 flex items-center justify-center text-[8px]"
                                    style={{ backgroundColor: theme.bg, color: theme.text }}
                                >
                                    A
                                </div>
                                <span className="truncate w-full text-center">{theme.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ─── CUSTOM COLORS ─── */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[9px] text-foreground font-black uppercase tracking-widest block">Nền</label>
                    <div className="relative">
                        <div
                            className="h-8 w-full rounded border border-border cursor-pointer transition-colors hover:border-muted-foreground/30"
                            style={{ backgroundColor: readerConfig.backgroundColor || "#ffffff" }}
                            onClick={() => setActivePicker(activePicker === "bg" ? null : "bg")}
                        />
                        {activePicker === "bg" && (
                            <div className="absolute top-full left-0 mt-2 p-2 bg-background border border-border rounded shadow-none z-210 grid grid-cols-4 gap-1.5 w-40">
                                {BG_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        className={cn(
                                            "w-7 h-7 rounded-none border border-border transition-all",
                                            readerConfig.backgroundColor === color && "ring-1 ring-primary ring-offset-1"
                                        )}
                                        style={{ backgroundColor: color }}
                                        onClick={() => {
                                            setReaderConfig(prev => ({ ...prev, backgroundColor: color }));
                                            setActivePicker(null);
                                        }}
                                    />
                                ))}
                                <button className="col-span-4 text-[9px] font-bold text-muted-foreground hover:text-foreground h-5 pt-1" onClick={() => bgInputRef.current?.click()}>Custom</button>
                                <input type="color" ref={bgInputRef} className="invisible absolute w-0 h-0" value={readerConfig.backgroundColor || "#ffffff"} onChange={(e) => setReaderConfig(prev => ({ ...prev, backgroundColor: e.target.value }))} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[9px] text-foreground font-black uppercase tracking-widest block">Chữ</label>
                    <div className="relative">
                        <div
                            className="h-8 w-full rounded border border-border cursor-pointer transition-colors hover:border-muted-foreground/30"
                            style={{ backgroundColor: readerConfig.textColor || "#262626" }}
                            onClick={() => setActivePicker(activePicker === "text" ? null : "text")}
                        />
                        {activePicker === "text" && (
                            <div className="absolute top-full right-0 mt-2 p-2 bg-background border border-border rounded shadow-none z-210 grid grid-cols-4 gap-1.5 w-40">
                                {TEXT_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        className={cn(
                                            "w-7 h-7 rounded-none border border-border transition-all",
                                            readerConfig.textColor === color && "ring-1 ring-primary ring-offset-1"
                                        )}
                                        style={{ backgroundColor: color }}
                                        onClick={() => {
                                            setReaderConfig(prev => ({ ...prev, textColor: color }));
                                            setActivePicker(null);
                                        }}
                                    />
                                ))}
                                <button className="col-span-4 text-[9px] font-bold text-muted-foreground hover:text-foreground h-5 pt-1" onClick={() => textInputRef.current?.click()}>Custom</button>
                                <input type="color" ref={textInputRef} className="invisible absolute w-0 h-0" value={readerConfig.textColor || "#262626"} onChange={(e) => setReaderConfig(prev => ({ ...prev, textColor: e.target.value }))} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── FONT PICKER ─── */}
            <div className="space-y-1">
                <label className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest block">Font</label>
                <div className="grid grid-cols-3 gap-1">
                    {FONTS.map((font) => (
                        <button
                            key={font.name}
                            onClick={() => setReaderConfig((prev: ReaderConfig) => ({ ...prev, fontFamily: font.value }))}
                            className={cn(
                                "px-1.5 py-1.5 rounded-sm text-[10px] transition-all border font-bold text-left truncate",
                                readerConfig.fontFamily === font.value
                                    ? "bg-muted border-primary/50 text-foreground"
                                    : "bg-transparent border-border/60 text-foreground/60 hover:border-foreground/40 hover:text-foreground"
                            )}
                            style={{ fontFamily: font.value }}
                        >
                            {font.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* ─── TOGGLES ─── */}
            <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="space-y-1">
                    <span className="text-[8px] text-muted-foreground uppercase font-bold block truncate">Thụt lề</span>
                    <button
                        onClick={() => setReaderConfig((prev) => ({ ...prev, indentText: !prev.indentText }))}
                        className={cn(
                            "w-full h-8 border rounded-sm transition-colors text-[10px] font-bold",
                            readerConfig.indentText ? "bg-muted border-primary/40 text-primary" : "bg-transparent border-border text-muted-foreground"
                        )}
                    >
                        {readerConfig.indentText ? "ON" : "OFF"}
                    </button>
                </div>
                <div className="space-y-1">
                    <span className="text-[8px] text-muted-foreground uppercase font-bold block truncate">Kẻ dọc</span>
                    <button
                        onClick={() => setReaderConfig((prev) => ({ ...prev, showDialogueLines: !prev.showDialogueLines }))}
                        className={cn(
                            "w-full h-8 border rounded-sm transition-colors text-[10px] font-bold",
                            readerConfig.showDialogueLines ? "bg-muted border-primary/40 text-primary" : "bg-transparent border-border text-muted-foreground"
                        )}
                    >
                        {readerConfig.showDialogueLines ? "ON" : "OFF"}
                    </button>
                </div>
                <div className="space-y-1">
                    <span className="text-[8px] text-muted-foreground uppercase font-bold block text-center truncate">Căn lề</span>
                    <div className="flex h-8 bg-muted/20 border border-border rounded-sm">
                        {ALIGN_OPTIONS.map((a) => (
                            <button
                                key={a.v}
                                onClick={() => setReaderConfig((prev) => ({ ...prev, textAlign: a.v as "left" | "center" | "right" | "justify" }))}
                                className={cn(
                                    "flex-1 flex items-center justify-center transition-all",
                                    readerConfig.textAlign === a.v ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <a.i className="w-3 h-3" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── SLIDERS ─── */}
            <div className="space-y-2 pt-1 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                {/* Font Size */}
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                        <span className="text-[8px] text-muted-foreground uppercase font-bold">Cỡ chữ</span>
                        <span className="text-[9px] font-mono font-bold text-foreground">{localFontSize}px</span>
                    </div>
                    <input
                        type="range"
                        min={12}
                        max={32}
                        step={1}
                        value={localFontSize}
                        onChange={(e) => setLocalFontSize(parseInt(e.target.value))}
                        onMouseUp={handleCommit}
                        onTouchEnd={handleCommit}
                        className={SLIDER_CLASS}
                    />
                </div>

                {/* Line Height */}
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                        <span className="text-[8px] text-muted-foreground uppercase font-bold">Giãn dòng</span>
                        <span className="text-[9px] font-mono font-bold text-foreground">{localLineHeight.toFixed(1)}</span>
                    </div>
                    <input
                        type="range"
                        min={1.2}
                        max={2.5}
                        step={0.1}
                        value={localLineHeight}
                        onChange={(e) => setLocalLineHeight(parseFloat(e.target.value))}
                        onMouseUp={handleCommit}
                        onTouchEnd={handleCommit}
                        className={SLIDER_CLASS}
                    />
                </div>

                {/* Paragraph Spacing */}
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                        <span className="text-[8px] text-muted-foreground uppercase font-bold">Giãn đoạn</span>
                        <span className="text-[9px] font-mono font-bold text-foreground">{localParagraphSpacing.toFixed(2)}rem</span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={3}
                        step={0.25}
                        value={localParagraphSpacing}
                        onChange={(e) => setLocalParagraphSpacing(parseFloat(e.target.value))}
                        onMouseUp={handleCommit}
                        onTouchEnd={handleCommit}
                        className={SLIDER_CLASS}
                    />
                </div>

                {/* Letter Spacing */}
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                        <span className="text-[8px] text-muted-foreground uppercase font-bold">Giãn chữ</span>
                        <span className="text-[9px] font-mono font-bold text-foreground">{localLetterSpacing.toFixed(2)}em</span>
                    </div>
                    <input
                        type="range"
                        min={-0.05}
                        max={0.15}
                        step={0.01}
                        value={localLetterSpacing}
                        onChange={(e) => setLocalLetterSpacing(parseFloat(e.target.value))}
                        onMouseUp={handleCommit}
                        onTouchEnd={handleCommit}
                        className={SLIDER_CLASS}
                    />
                </div>

                {/* Max Width */}
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                        <span className="text-[8px] text-muted-foreground uppercase font-bold">Độ rộng</span>
                        <span className="text-[9px] font-mono font-bold text-foreground">{localMaxWidth}px</span>
                    </div>
                    <input
                        type="range"
                        min={600}
                        max={1600}
                        step={50}
                        value={localMaxWidth}
                        onChange={(e) => setLocalMaxWidth(parseInt(e.target.value))}
                        onMouseUp={handleCommit}
                        onTouchEnd={handleCommit}
                        className={SLIDER_CLASS}
                    />
                </div>
            </div>
        </div>
    );
}
