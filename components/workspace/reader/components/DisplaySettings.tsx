"use client";

import React, { useRef } from "react";
import { cn } from "@/lib/utils";
import { X, AlignLeft, AlignCenter, AlignJustify } from "lucide-react";
import { ReaderConfig } from "../../ReaderHeader";

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

    if (!showSettings) return null;

    return (
        <div className="absolute top-full right-0 mt-2 w-72 bg-background border border-border text-foreground rounded-lg p-4 z-200 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center justify-between pb-1 border-b border-border/40">
                <div className="text-[10px] text-foreground/70 uppercase font-black tracking-widest">Hiển thị</div>
                <X className="w-4 h-4 text-foreground/40 cursor-pointer hover:text-foreground transition-colors" onClick={() => setShowSettings(false)} />
            </div>

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
                                {["#ffffff", "#f8fafc", "#f1f5f9", "#fdfcf0", "#f5f5f4", "#faf7ed", "#f3f4f6", "#ecfdf5"].map((color) => (
                                    <button
                                        key={color}
                                        className={cn(
                                            "w-7 h-7 rounded-none border border-border transition-all",
                                            readerConfig.backgroundColor === color && "ring-1 ring-primary ring-offset-1"
                                        )}
                                        style={{ backgroundColor: color }}
                                        onClick={() => {
                                            setReaderConfig({ ...readerConfig, backgroundColor: color });
                                            setActivePicker(null);
                                        }}
                                    />
                                ))}
                                <button className="col-span-4 text-[9px] font-bold text-muted-foreground hover:text-foreground h-5 pt-1" onClick={() => bgInputRef.current?.click()}>Custom</button>
                                <input type="color" ref={bgInputRef} className="invisible absolute w-0 h-0" value={readerConfig.backgroundColor || "#ffffff"} onChange={(e) => setReaderConfig({ ...readerConfig, backgroundColor: e.target.value })} />
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
                                {["#171717", "#262626", "#404040", "#525252", "#7c2d12", "#1e3a8a", "#064e3b", "#701a75"].map((color) => (
                                    <button
                                        key={color}
                                        className={cn(
                                            "w-7 h-7 rounded-none border border-border transition-all",
                                            readerConfig.textColor === color && "ring-1 ring-primary ring-offset-1"
                                        )}
                                        style={{ backgroundColor: color }}
                                        onClick={() => {
                                            setReaderConfig({ ...readerConfig, textColor: color });
                                            setActivePicker(null);
                                        }}
                                    />
                                ))}
                                <button className="col-span-4 text-[9px] font-bold text-muted-foreground hover:text-foreground h-5 pt-1" onClick={() => textInputRef.current?.click()}>Custom</button>
                                <input type="color" ref={textInputRef} className="invisible absolute w-0 h-0" value={readerConfig.textColor || "#262626"} onChange={(e) => setReaderConfig({ ...readerConfig, textColor: e.target.value })} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest block">Font</label>
                <div className="grid grid-cols-2 gap-1.5">
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
                                "px-2 py-2 rounded-sm text-xs transition-all border font-bold text-left truncate",
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
                        {[{ v: "left", i: AlignLeft }, { v: "center", i: AlignCenter }, { v: "justify", i: AlignJustify }].map((a) => (
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

            <div className="space-y-2 pt-1 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                <div className="flex justify-between items-center bg-muted/10 p-2 border border-border/40 rounded-sm">
                    <span>Cỡ chữ: {readerConfig.fontSize}px</span>
                    <div className="flex gap-4">
                        <button onClick={() => setReaderConfig(p => ({ ...p, fontSize: Math.max(12, p.fontSize - 1) }))} className="hover:text-primary">-</button>
                        <button onClick={() => setReaderConfig(p => ({ ...p, fontSize: Math.min(32, p.fontSize + 1) }))} className="hover:text-primary">+</button>
                    </div>
                </div>
                <div className="flex justify-between items-center bg-muted/10 p-2 border border-border/40 rounded-sm">
                    <span>Giãn dòng: {readerConfig.lineHeight.toFixed(1)}</span>
                    <div className="flex gap-4">
                        <button onClick={() => setReaderConfig(p => ({ ...p, lineHeight: Math.max(1.2, p.lineHeight - 0.1) }))} className="hover:text-primary">-</button>
                        <button onClick={() => setReaderConfig(p => ({ ...p, lineHeight: Math.min(2.5, p.lineHeight + 0.1) }))} className="hover:text-primary">+</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
