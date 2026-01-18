import React from "react";
import { RefreshCw, Circle, Loader2 } from "lucide-react";

interface TranslationProgressOverlayProps {
    isTranslating: boolean;
    progress: { current: number; total: number; currentTitle: string };
}

export function TranslationProgressOverlay({ isTranslating, progress }: TranslationProgressOverlayProps) {
    if (!isTranslating) return null;

    const percent = Math.round((progress.current / progress.total) * 100) || 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-300">
            {/* Subtle blocking layer to prevent accidental clicks while still showing the UI */}
            <div className="absolute inset-0 bg-background/20 backdrop-blur-[2px]"></div>
            <div className="bg-card border border-border p-8 rounded-3xl max-w-md w-full shadow-2xl space-y-8 relative overflow-hidden">
                {/* Background glow effects */}
                <div className="absolute -top-24 -left-24 h-48 w-48 bg-primary/5 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -right-24 h-48 w-48 bg-primary/5 rounded-full blur-3xl"></div>

                <div className="flex items-center justify-between relative">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 scale-110">
                            <RefreshCw className="h-5 w-5 animate-spin" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-foreground">Đang tiến hành dịch</h3>
                            <p className="text-muted-foreground/40 text-[10px] uppercase tracking-widest font-bold">AI Processing</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black text-foreground font-mono tabular-nums leading-none">{percent}%</div>
                        <div className="text-[10px] text-muted-foreground/40 font-bold mt-1 uppercase tracking-tighter">
                            {progress.current} / {progress.total} chương
                        </div>
                    </div>
                </div>

                <div className="space-y-4 relative">
                    <div className="flex justify-between items-end px-1">
                        <div className="space-y-1 max-w-[70%]">
                            <div className="text-[10px] text-primary/60 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                <Circle className="h-1.5 w-1.5 fill-primary animate-pulse" />
                                Current Task
                            </div>
                            <p className="text-foreground font-medium text-sm truncate leading-none">
                                {progress.currentTitle}
                            </p>
                        </div>
                        <div className="text-muted-foreground/40 italic text-[10px] font-medium flex items-center gap-1 bg-muted/50 py-1 px-2 rounded-full border border-border">
                            <Loader2 className="h-2 w-2 animate-spin" /> Vui lòng chờ...
                        </div>
                    </div>

                    <div className="relative h-4 bg-muted rounded-full p-1 border border-border overflow-hidden relative">
                        <div
                            className="h-full rounded-full bg-primary transition-all duration-700 ease-in-out relative will-change-[width,transform]"
                            style={{ width: `${percent}%` }}
                        >
                            {/* GPU-efficient shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer-fast w-full" />

                            <div className="absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-white/30 to-transparent blur-sm"></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-2xl bg-muted/50 border border-border flex flex-col gap-1">
                            <div className="text-[10px] text-muted-foreground/40 font-bold uppercase leading-none">Status</div>
                            <div className="text-sm font-bold text-emerald-600">Đang hoạt động</div>
                        </div>
                        <div className="p-3 rounded-2xl bg-muted/50 border border-border flex flex-col gap-1">
                            <div className="text-[10px] text-muted-foreground/40 font-bold uppercase leading-none">Threads</div>
                            <div className="text-sm font-bold text-emerald-600">5 Workers Active</div>
                        </div>
                    </div>
                </div>

                <p className="text-center text-[11px] text-muted-foreground/20 italic font-medium pt-2 border-t border-border">
                    Hệ thống đang sử dụng Gemini và xử lý song song để tối ưu tốc độ.
                </p>
            </div>
        </div>
    );
}
