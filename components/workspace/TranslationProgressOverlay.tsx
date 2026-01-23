"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";

interface TranslationProgressOverlayProps {
    isTranslating: boolean;
    progress: { current: number; total: number; currentTitle: string };
}

export function TranslationProgressOverlay({ isTranslating, progress }: TranslationProgressOverlayProps) {
    const { current, total, currentTitle } = progress;

    // Calculate base percentage based on chapter-level progress
    const basePercent = total > 0 ? Math.round((current / total) * 100) : 0;
    const nextStepPercent = total > 0 ? Math.round(((current + 1) / total) * 100) : 100;

    const [displayPercent, setDisplayPercent] = useState(0);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    // Sync displayPercent with base progress
    useEffect(() => {
        if (isTranslating) {
            const frame = requestAnimationFrame(() => {
                setDisplayPercent(prev => {
                    if (prev < basePercent) return basePercent;
                    return prev;
                });
            });
            return () => cancelAnimationFrame(frame);
        }
    }, [basePercent, isTranslating]);

    // Timer and Smooth Creep
    useEffect(() => {
        if (!isTranslating) return;

        // Reset elapsed time on start
        const frame = requestAnimationFrame(() => {
            setElapsedSeconds(0);
        });

        const timer = setInterval(() => {
            setElapsedSeconds(prev => prev + 1);
        }, 1000);

        const progressInterval = setInterval(() => {
            setDisplayPercent(prev => {
                const limit = Math.min(nextStepPercent - 0.5, 99.5);
                if (prev < limit) {
                    const gap = limit - prev;
                    const step = Math.max(0.04, gap / 30);
                    return prev + step;
                }
                return prev;
            });
        }, 1000);

        return () => {
            clearInterval(timer);
            clearInterval(progressInterval);
        };
    }, [isTranslating, nextStepPercent]); // Removed basePercent to avoid loops

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        if (h > 0) {
            return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    if (!isTranslating) return null;

    const percent = Math.floor(displayPercent);

    return (
        <div className="fixed bottom-6 right-6 z-200 animate-in slide-in-from-bottom-10 fade-in duration-500 pointer-events-auto">
            <div className="bg-card border border-border p-6 rounded-3xl w-[400px] shadow-2xl space-y-6 relative overflow-hidden ring-1 ring-white/10 glass">
                {/* Background glow effects */}
                <div className="absolute -top-24 -left-24 h-48 w-48 bg-primary/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -right-24 h-48 w-48 bg-primary/10 rounded-full blur-3xl"></div>

                <div className="flex items-center justify-between relative">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-foreground leading-none">Đang dịch</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <p className="text-muted-foreground/60 text-[9px] uppercase tracking-widest font-bold">AI Processing</p>
                                <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/30" />
                                <span className="text-primary font-mono text-[10px] font-bold">{formatTime(elapsedSeconds)}</span>
                            </div>
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
                                {currentTitle}
                            </p>
                        </div>
                        <div className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-tighter">
                            {current} / {total}
                        </div>
                    </div>

                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full bg-primary transition-all duration-700 ease-in-out relative"
                            style={{ width: `${displayPercent}%` }}
                        >
                            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent animate-shimmer-fast w-full" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
