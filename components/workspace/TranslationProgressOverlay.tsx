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

        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-500 pointer-events-auto">
            <div className="bg-card border border-border p-6 rounded-3xl w-[400px] shadow-2xl space-y-6 relative overflow-hidden ring-1 ring-white/10 glass">
                {/* Background glow effects - Reduced intensity for non-modal */}
                <div className="absolute -top-24 -left-24 h-48 w-48 bg-primary/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -right-24 h-48 w-48 bg-primary/10 rounded-full blur-3xl"></div>

                <div className="flex items-center justify-between relative">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-foreground leading-none">Đang dịch</h3>
                            <p className="text-muted-foreground/60 text-[9px] uppercase tracking-widest font-bold mt-1">AI Processing</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black text-foreground font-mono tabular-nums leading-none">{percent}%</div>
                    </div>
                </div>

                <div className="space-y-3 relative">
                    <div className="flex justify-between items-end px-1">
                        <div className="space-y-1 max-w-[70%]">
                            <p className="text-foreground font-medium text-xs truncate leading-none">
                                {progress.currentTitle}
                            </p>
                        </div>
                        <div className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-tighter">
                            {progress.current} / {progress.total}
                        </div>
                    </div>

                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full bg-primary transition-all duration-700 ease-in-out relative will-change-[width]"
                            style={{ width: `${percent}%` }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer-fast w-full" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
