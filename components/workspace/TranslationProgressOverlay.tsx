"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// STAFF-GRADE CONFIGURATION
// ─────────────────────────────────────────────────────────────
const MAX_FAKE_PERCENT = 99.5;
const PROGRESS_STEP_BUFFER = 0.5;
const MIN_CREEP_STEP = 0.04;
const CREEP_SLOWDOWN_FACTOR = 40;
const REFRESH_INTERVAL_MS = 1000;
const MIN_SAMPLES_FOR_ETA = 3; // Tránh nhiễu ETA ở những chương đầu
const EMA_ALPHA = 0.3; // Hệ số mượt cho Exponential Moving Average
const SCROLL_THRESHOLD_PX = 40; // Khoảng cách để nhận diện "đang ở đáy"

interface LogEntry {
    id: string;
    message: string;
    type: 'info' | 'success' | 'error';
    order: number;
}

interface TranslationProgressOverlayProps {
    isTranslating: boolean;
    progress: {
        current: number;
        total: number;
        currentTitle: string;
        logs?: LogEntry[];
    };
}

// Memory-efficient Log Item
const LogItem = React.memo(({ log }: { log: LogEntry }) => (
    <div className="flex items-start gap-2 animate-in fade-in slide-in-from-left-1">
        <span className="bg-muted px-1 rounded text-muted-foreground shrink-0 tabular-nums">CH {log.order}</span>
        <span className={cn(
            "break-all",
            log.type === 'error' ? 'text-red-400' :
                log.type === 'success' ? 'text-emerald-400' :
                    'text-white/60'
        )}>
            {log.message}
        </span>
    </div>
));
LogItem.displayName = "LogItem";

export function TranslationProgressOverlay({ isTranslating, progress }: TranslationProgressOverlayProps) {
    const { current, total, currentTitle, logs = [] } = progress;
    const logContainerRef = useRef<HTMLDivElement>(null);
    const isAtBottomRef = useRef(true); // Track if user is at bottom

    // Internal states
    const [displayPercent, setDisplayPercent] = useState(0);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [eta, setEta] = useState("Calculating...");

    // EMA memory for smooth ETA
    const avgTimeRef = useRef<number | null>(null);
    const lastProcessedRef = useRef(0);

    const basePercent = total > 0 ? Math.round((current / total) * 100) : 0;
    const nextStepLimit = total > 0 ? Math.round(((current + 1) / total) * 100) : 100;

    // 1. Progress Synced & Reset Logic (Stable)
    useEffect(() => {
        if (!isTranslating) return;

        if (current === 0) {
            requestAnimationFrame(() => {
                setDisplayPercent(0);
                setEta("Calculating...");
                avgTimeRef.current = null;
                lastProcessedRef.current = 0;
            });
            return;
        }

        // Clamp displayPercent to at least basePercent
        requestAnimationFrame(() => setDisplayPercent(prev => Math.max(prev, basePercent)));

        // Update EMA for ETA when a chapter completes
        if (current > lastProcessedRef.current) {
            const timePerChapterAtThisPoint = elapsedSeconds / current;
            if (avgTimeRef.current === null) {
                avgTimeRef.current = timePerChapterAtThisPoint;
            } else {
                avgTimeRef.current = (EMA_ALPHA * timePerChapterAtThisPoint) + (1 - EMA_ALPHA) * avgTimeRef.current;
            }
            lastProcessedRef.current = current;
        }

        // Reactive ETA calculation
        if (current >= MIN_SAMPLES_FOR_ETA && avgTimeRef.current) {
            const remainingChapters = total - current;
            const etaSeconds = Math.round(avgTimeRef.current * remainingChapters);

            if (etaSeconds <= 3) {
                requestAnimationFrame(() => setEta("Finishing..."));
            } else {
                const m = Math.floor(etaSeconds / 60);
                const s = etaSeconds % 60;
                requestAnimationFrame(() => setEta(`ETA: ${m > 0 ? `${m}m ` : ""}${s}s`));
            }
        }
    }, [basePercent, isTranslating, current, total, elapsedSeconds]);

    // 2. Stable Timer
    useEffect(() => {
        if (!isTranslating) {
            requestAnimationFrame(() => setElapsedSeconds(0));
            return;
        }

        const timer = setInterval(() => {
            setElapsedSeconds(prev => prev + 1);
        }, REFRESH_INTERVAL_MS);

        return () => clearInterval(timer);
    }, [isTranslating]);

    // 3. Clamped Progress Creep
    useEffect(() => {
        if (!isTranslating) return;

        const creepInterval = setInterval(() => {
            setDisplayPercent(prev => {
                const limit = Math.min(nextStepLimit - PROGRESS_STEP_BUFFER, MAX_FAKE_PERCENT);
                if (prev < limit) {
                    const gap = limit - prev;
                    const step = Math.max(MIN_CREEP_STEP, gap / CREEP_SLOWDOWN_FACTOR);
                    return prev + step;
                }
                return prev;
            });
        }, REFRESH_INTERVAL_MS);

        return () => clearInterval(creepInterval);
    }, [isTranslating, nextStepLimit]);

    // 5. Smart Scroll Logic (UX Trap Prevention)
    const handleScroll = useCallback(() => {
        if (!logContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD_PX;
        isAtBottomRef.current = isNearBottom;
    }, []);

    useEffect(() => {
        if (isAtBottomRef.current && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs.length, currentTitle]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` :
            `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    if (!isTranslating) return null;

    return (
        <div className="fixed bottom-6 right-6 z-200 animate-in slide-in-from-bottom-10 fade-in duration-500 pointer-events-auto">
            <div className="bg-card border border-border p-6 rounded-3xl w-[420px] shadow-2xl space-y-6 relative overflow-hidden ring-1 ring-white/10 glass">
                <div className="absolute -top-24 -left-24 h-48 w-48 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -right-24 h-48 w-48 bg-primary/10 rounded-full blur-3xl" />

                <div className="flex items-center justify-between relative">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                            <RefreshCw className="h-5 w-5 animate-spin" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-foreground leading-none">Max Ping Processing</h3>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-primary font-mono text-[11px] font-bold">{formatTime(elapsedSeconds)}</span>
                                <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/30" />
                                <span className="text-muted-foreground/60 text-[10px] font-medium tracking-tight whitespace-nowrap">
                                    {eta}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black text-foreground font-mono tabular-nums leading-none">
                            {Math.floor(displayPercent)}%
                        </div>
                    </div>
                </div>

                <div className="space-y-3 relative">
                    <div className="flex justify-between items-end px-1">
                        <p className="text-foreground font-semibold text-[11px] truncate max-w-[70%] opacity-80">
                            {currentTitle || "Warming up core..."}
                        </p>
                        <div className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest tabular-nums">
                            {current} / {total}
                        </div>
                    </div>

                    <div className="relative h-2 bg-muted/50 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full bg-primary transition-all duration-700 ease-in-out relative"
                            style={{ width: `${displayPercent}%` }}
                        >
                            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/40 to-transparent animate-shimmer-fast w-full" />
                        </div>
                    </div>
                </div>

                {logs.length > 0 && (
                    <div
                        ref={logContainerRef}
                        onScroll={handleScroll}
                        className="pt-3 border-t border-border/40 max-h-[140px] overflow-y-auto custom-scrollbar space-y-1.5 font-mono text-[10px] leading-relaxed"
                    >
                        {[...logs].sort((a, b) => a.order - b.order).map((log) => (
                            <LogItem key={log.id} log={log} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
