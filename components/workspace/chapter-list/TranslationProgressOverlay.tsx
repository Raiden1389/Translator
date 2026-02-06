"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime } from "./TranslationProgressOverlay/utils";
import type {
    LogEntry,
    SystemNotification,
    TranslationProgressOverlayProps
} from "./TranslationProgressOverlay/types";
import {
    MAX_FAKE_PERCENT,
    PROGRESS_STEP_BUFFER,
    MIN_CREEP_STEP,
    CREEP_SLOWDOWN_FACTOR,
    REFRESH_INTERVAL_MS,
    MIN_SAMPLES_FOR_ETA,
    EMA_ALPHA,
    SCROLL_THRESHOLD_PX
} from "./TranslationProgressOverlay/constants";

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
    const {
        current,
        total,
        currentTitle,
        logs = [],
        totalTokens = 0,
        totalCost = 0,
        chunksProcessed = 0,
        startTime,
        notifications = [],
        totalTermsUsed = 0,
        totalCharactersUsed = 0,
        currentTermsUsed = 0,
        currentCharactersUsed = 0,
        currentChunk = 0,
        totalChunks = 0,
        chapterStats = [],
    } = progress;
    const logContainerRef = useRef<HTMLDivElement>(null);
    const isAtBottomRef = useRef(true); // Track if user is at bottom

    // 🔍 DEBUG: Log progress data
    console.log('[OVERLAY DEBUG]', { current, total, chunksProcessed, currentTitle });


    // Internal states
    const [displayPercent, setDisplayPercent] = useState(0);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [eta, setEta] = useState("Calculating...");
    const [showStats, setShowStats] = useState(false);
    const [showDictBreakdown, setShowDictBreakdown] = useState(false); // NEW: Dictionary breakdown toggle
    const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());

    // Get latest non-dismissed notification
    const latestNotification = notifications
        .filter(n => !dismissedNotifications.has(n.id))
        .sort((a, b) => b.timestamp - a.timestamp)[0];

    // Auto-dismiss notification after 5 seconds
    useEffect(() => {
        if (!latestNotification) return;
        const timer = setTimeout(() => {
            setDismissedNotifications(prev => new Set(prev).add(latestNotification.id));
        }, 5000);
        return () => clearTimeout(timer);
    }, [latestNotification]);

    // EMA memory for smooth ETA
    const avgTimeRef = useRef<number | null>(null);
    const lastProcessedRef = useRef(0);

    const basePercent = total > 0 ? Math.round((current / total) * 100) : 0;
    const nextStepLimit = total > 0 ? Math.round(((current + 1) / total) * 100) : 100;

    // Calculate speed (chapters/min)
    const speed = elapsedSeconds > 0 && current > 0
        ? (current / (elapsedSeconds / 60))
        : 0;

    // 1. Progress Synced & Reset Logic (Stable)
    useEffect(() => {
        if (!isTranslating) {
            // Force 100% when finished
            if (current >= total && total > 0) {
                requestAnimationFrame(() => setDisplayPercent(100));
            }
            return;
        }

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

    // 2. Stable Timer - FIX: Don't reset when finished, keep final time for speed calculation
    const prevTranslatingRef = useRef(isTranslating);

    useEffect(() => {
        // Reset timer only when starting NEW translation (false → true transition)
        if (isTranslating && !prevTranslatingRef.current) {
            requestAnimationFrame(() => setElapsedSeconds(0));
        }
        prevTranslatingRef.current = isTranslating;

        if (!isTranslating) {
            // Keep elapsed time - don't reset
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

    // 6. Persistence Logic (Keep visible after finished) with Adaptive Timing
    const [isVisible, setIsVisible] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const lastTranslatingRef = useRef(false);

    // Calculate adaptive read time
    const calculateReadTime = useCallback(() => {
        const baseTime = 10000; // 10s base
        const perChapter = 1000; // +1s per chapter
        const hasStats = totalTermsUsed > 0 || totalCharactersUsed > 0;
        const statsBonus = hasStats ? 5000 : 0; // +5s if has dictionary stats

        const calculated = baseTime + (total * perChapter) + statsBonus;
        return Math.min(calculated, 25000); // Cap at 25s
    }, [total, totalTermsUsed, totalCharactersUsed]);

    useEffect(() => {
        if (isTranslating) {
            setTimeout(() => setIsVisible(true), 0);
            lastTranslatingRef.current = true;
        } else if (lastTranslatingRef.current && !isPinned) {
            // Adaptive auto-close timing
            const readTime = calculateReadTime();
            const timer = setTimeout(() => {
                setIsVisible(false);
                lastTranslatingRef.current = false;
            }, readTime);
            return () => clearTimeout(timer);
        }
    }, [isTranslating, isPinned, calculateReadTime]);

    const handleClose = () => {
        setIsVisible(false);
        lastTranslatingRef.current = false;
    };

    if (!isVisible) return null;

    // Notification styling
    const notificationIcon = {
        init: '🚀',
        turbo: '⚡',
        success: '🎉',
        error: '❌'
    };

    const notificationColor = {
        init: 'bg-primary/10 border-primary/20 text-primary',
        turbo: 'bg-primary/10 border-primary/20 text-primary',
        success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600',
        error: 'bg-red-500/10 border-red-500/20 text-red-600'
    };

    const isFinished = !isTranslating && current >= total && total > 0;

    // Helper: Render stats panel (Phase 1C - extracted)
    const renderStatsPanel = () => {
        if (!showStats) return null;

        return (
            <div className="grid grid-cols-2 gap-2 p-3 bg-muted/20 rounded-lg animate-in fade-in slide-in-from-top-2">
                <div className="space-y-1">
                    <div className="text-[9px] text-muted-foreground">Total Cost</div>
                    <div className="text-sm font-bold">${totalCost.toFixed(4)}</div>
                </div>
                <div className="space-y-1">
                    <div className="text-[9px] text-muted-foreground">Tokens Used</div>
                    <div className="text-sm font-bold">{totalTokens.toLocaleString()}</div>
                </div>
                <div className="space-y-1">
                    <div className="text-[9px] text-muted-foreground">Avg Speed</div>
                    <div className="text-sm font-bold">{speed.toFixed(1)} ch/min</div>
                </div>

                {/* Dictionary Usage Section */}
                {(totalTermsUsed > 0 || totalCharactersUsed > 0) && (
                    <>
                        <div className="col-span-2 border-t border-border/40 pt-2 mt-1">
                            <button
                                onClick={() => setShowDictBreakdown(!showDictBreakdown)}
                                className="w-full text-left hover:bg-muted/20 -mx-1 px-1 py-0.5 rounded transition-colors"
                            >
                                <div className="text-[9px] text-muted-foreground/80 uppercase tracking-wider mb-1.5 font-bold flex items-center justify-between">
                                    <span>📖 Dictionary Usage</span>
                                    <span className="text-[10px]">{showDictBreakdown ? '▼' : '▶'}</span>
                                </div>
                            </button>

                            {(currentTermsUsed > 0 || currentCharactersUsed > 0) && (
                                <div className="mb-2 p-2 bg-primary/5 rounded border border-primary/10">
                                    <div className="text-[8px] text-muted-foreground/60 mb-1">Current Chapter</div>
                                    <div className="flex gap-3 text-xs">
                                        {currentTermsUsed > 0 && (
                                            <span className="flex items-center gap-1">
                                                <span className="text-blue-500">📚</span>
                                                <span className="font-bold tabular-nums">{currentTermsUsed}</span>
                                                <span className="text-muted-foreground/60">terms</span>
                                            </span>
                                        )}
                                        {currentCharactersUsed > 0 && (
                                            <span className="flex items-center gap-1">
                                                <span className="text-purple-500">👤</span>
                                                <span className="font-bold tabular-nums">{currentCharactersUsed}</span>
                                                <span className="text-muted-foreground/60">chars</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 text-xs text-muted-foreground/80 mb-2">
                                {totalTermsUsed > 0 && (
                                    <span className="flex items-center gap-1">
                                        <span>📚</span>
                                        <span className="font-bold tabular-nums">{totalTermsUsed}</span>
                                        <span>total</span>
                                    </span>
                                )}
                                {totalCharactersUsed > 0 && (
                                    <span className="flex items-center gap-1">
                                        <span>👤</span>
                                        <span className="font-bold tabular-nums">{totalCharactersUsed}</span>
                                        <span>total</span>
                                    </span>
                                )}
                            </div>

                            {showDictBreakdown && chapterStats.length > 0 && (
                                <div className="mt-2 space-y-1 max-h-[120px] overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 fade-in">
                                    {chapterStats.map((stat) => (
                                        <div
                                            key={stat.chapterId}
                                            className="flex items-center justify-between p-1.5 bg-muted/10 rounded text-[10px] hover:bg-muted/20 transition-colors"
                                        >
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <span className="bg-muted px-1 rounded text-muted-foreground shrink-0 tabular-nums font-mono">
                                                    CH {stat.order}
                                                </span>
                                                <span className="truncate text-foreground/70">{stat.title}</span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {stat.termsUsed > 0 && (
                                                    <span className="flex items-center gap-0.5 text-blue-500">
                                                        <span>📚</span>
                                                        <span className="font-bold tabular-nums">{stat.termsUsed}</span>
                                                    </span>
                                                )}
                                                {stat.charactersUsed > 0 && (
                                                    <span className="flex items-center gap-0.5 text-purple-500">
                                                        <span>👤</span>
                                                        <span className="font-bold tabular-nums">{stat.charactersUsed}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-10 fade-in duration-500 pointer-events-auto group">
            <div className="bg-card border border-border p-6 rounded-3xl w-[420px] shadow-2xl space-y-6 relative overflow-hidden ring-1 ring-white/10 glass">
                {/* Pin Button - Keep overlay visible */}
                <button
                    onClick={() => setIsPinned(!isPinned)}
                    className={cn(
                        "absolute top-4 right-16 p-1.5 rounded-full transition-all z-10",
                        isPinned
                            ? "bg-primary/20 text-primary hover:bg-primary/30"
                            : "bg-muted/20 hover:bg-muted/40 text-muted-foreground",
                        isFinished ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                    title={isPinned ? "Unpin (auto-close enabled)" : "Pin (keep visible)"}
                >
                    <span className="text-sm">{isPinned ? "📌" : "📍"}</span>
                </button>

                {/* Close Button - Visible when finished or on hover */}
                <button
                    onClick={handleClose}
                    className={cn(
                        "absolute top-4 right-4 p-1.5 rounded-full bg-muted/20 hover:bg-muted/40 text-muted-foreground transition-all z-10",
                        isFinished ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="flex items-center justify-between relative pr-20">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                            {isTranslating ? (
                                <RefreshCw className="h-5 w-5 animate-spin" />
                            ) : (
                                <div className="h-5 w-5 flex items-center justify-center font-bold text-emerald-500">✓</div>
                            )}
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-foreground leading-none">Max Ping Processing</h3>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="text-primary font-mono text-[11px] font-bold">{formatTime(elapsedSeconds)}</span>
                                <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/30" />
                                <span className="text-muted-foreground/60 text-[10px] font-medium tracking-tight whitespace-nowrap">
                                    {eta}
                                </span>
                                {/* NEW: Status badges */}
                                {chunksProcessed > 0 && (
                                    <span className="text-[9px] bg-blue-500/20 px-1.5 py-0.5 rounded font-bold">📦 {chunksProcessed}</span>
                                )}
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
                    {/* Notification Banner - Inside overlay */}
                    {latestNotification && (
                        <div className={cn(
                            "px-3 py-2 rounded-xl border flex items-center gap-2 text-xs font-medium animate-in slide-in-from-top-2 fade-in duration-300",
                            notificationColor[latestNotification.type]
                        )}>
                            <span>{notificationIcon[latestNotification.type]}</span>
                            <span className="flex-1">{latestNotification.message}</span>
                        </div>
                    )}

                    <div className="flex justify-between items-end px-1">
                        <p className="text-foreground font-semibold text-[11px] truncate max-w-[70%] opacity-80">
                            {currentTitle}
                        </p>
                        <div className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest tabular-nums">
                            {totalChunks > 0 ? (
                                <span title="Chunk progress">{currentChunk} / {totalChunks} chunks</span>
                            ) : (
                                <span>{current} / {total}</span>
                            )}
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

                    {/* NEW: Stats row */}
                    <div className="flex justify-between text-[9px] text-muted-foreground/60 px-1 font-mono">
                        <span>💰 ${totalCost.toFixed(4)}</span>
                        <span>🔥 {totalTokens.toLocaleString()}t</span>
                        <span>⚡ {speed.toFixed(1)} ch/min</span>
                        <button
                            onClick={() => setShowStats(!showStats)}
                            className="text-[9px] text-muted-foreground hover:text-foreground transition-colors underline"
                        >
                            {showStats ? "Hide" : "Stats"}
                        </button>
                    </div>
                </div>

                {/* Expandable Stats Panel - extracted to helper */}
                {renderStatsPanel()}

                {/* NEW: Integrated Toast-style Logs */}
                {logs.length > 0 && (
                    <div
                        ref={logContainerRef}
                        onScroll={handleScroll}
                        className="pt-3 border-t border-border/40 max-h-[180px] overflow-y-auto custom-scrollbar space-y-1.5"
                    >
                        {[...logs].sort((a, b) => a.order - b.order).slice(-5).map((log) => (
                            <div
                                key={log.id}
                                className={cn(
                                    "flex items-start gap-2 p-2 rounded-lg transition-all animate-in fade-in slide-in-from-left-1",
                                    log.type === 'success' && "bg-emerald-500/10 border-l-2 border-emerald-500",
                                    log.type === 'error' && "bg-red-500/10 border-l-2 border-red-500",
                                    log.type === 'info' && "bg-muted/20"
                                )}
                            >
                                <span className="bg-muted px-1 rounded text-muted-foreground shrink-0 tabular-nums text-[10px] font-mono">
                                    CH {log.order}
                                </span>
                                <span className={cn(
                                    "break-all text-[10px] flex-1",
                                    log.type === 'error' ? 'text-red-400' :
                                        log.type === 'success' ? 'text-emerald-400' :
                                            'text-white/60'
                                )}>
                                    {log.message}
                                </span>
                                {log.tokens && (
                                    <span className="text-[9px] text-muted-foreground tabular-nums font-mono shrink-0">
                                        {log.tokens.total.toLocaleString()}t
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
