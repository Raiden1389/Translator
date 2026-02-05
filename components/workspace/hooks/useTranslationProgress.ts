import { useState, useCallback, useEffect } from 'react';

/**
 * Translation Log Entry
 */
export interface TranslationLogEntry {
    id: string;
    message: string;
    type: 'info' | 'success' | 'error';
    order: number;
    tokens?: {
        input: number;
        output: number;
        thinking?: number;
        total: number;
    };
    chunks?: number;
    timestamp: number;
}

/**
 * Chapter Progress Data
 */
export interface ChapterProgress {
    chapterId: number;
    order: number;
    title: string;
    status: 'pending' | 'processing' | 'done' | 'error';
    startTime?: number;
    endTime?: number;
    tokens?: {
        input: number;
        output: number;
        thinking?: number;
        total: number;
    };
    cost?: number;
    chunks?: number;
    error?: string;
}

/**
 * Aggregate Statistics
 */
export interface AggregateStats {
    totalChapters: number;
    completedChapters: number;
    totalTokens: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalThinkingTokens: number;
    totalCost: number;
    totalChunks: number;
    averageTokensPerChapter: number;
    averageCostPerChapter: number;
    elapsedTime: number;
    estimatedTimeRemaining: number;
    startTime: number;
}

/**
 * System Notification (shown in overlay)
 */
export interface SystemNotification {
    id: string;
    message: string;
    type: 'init' | 'turbo' | 'success' | 'error';
    timestamp: number;
}

/**
 * Hook Return Type
 */
export interface UseTranslationProgressReturn {
    // Progress data
    progress: Map<number, ChapterProgress>;
    logs: TranslationLogEntry[];
    aggregateStats: AggregateStats;
    notifications: SystemNotification[];

    // Current state
    currentChapter?: ChapterProgress;
    isActive: boolean;

    // Actions
    startTracking: (totalChapters: number) => void;
    stopTracking: () => void;
    updateChapterProgress: (chapterId: number, data: Partial<ChapterProgress>) => void;
    addLog: (log: Omit<TranslationLogEntry, 'timestamp'>) => void;
    addNotification: (notification: Omit<SystemNotification, 'id' | 'timestamp'>) => void;
    clearLogs: () => void;
    reset: () => void;
}

/**
 * useTranslationProgress Hook
 * 
 * Tracks translation progress, logs, and aggregate statistics.
 * Extracted from TranslationProvider to reduce complexity.
 * 
 * @example
 * ```tsx
 * const progress = useTranslationProgress();
 * 
 * progress.startTracking(10);
 * progress.updateChapterProgress(1, { status: 'processing' });
 * progress.addLog({ id: 'ch1', message: 'Translating...', type: 'info', order: 1 });
 * progress.updateChapterProgress(1, { 
 *   status: 'done',
 *   tokens: { input: 1000, output: 800, total: 1800 }
 * });
 * ```
 */
export function useTranslationProgress(): UseTranslationProgressReturn {
    const [progress, setProgress] = useState<Map<number, ChapterProgress>>(new Map());
    const [logs, setLogs] = useState<TranslationLogEntry[]>([]);
    const [notifications, setNotifications] = useState<SystemNotification[]>([]);
    const [isActive, setIsActive] = useState(false);
    const [startTime, setStartTime] = useState<number>(0);
    const [totalChapters, setTotalChapters] = useState(0);
    const [elapsedTime, setElapsedTime] = useState(0);

    // Start tracking
    const startTracking = useCallback((total: number) => {
        setIsActive(true);
        setStartTime(Date.now());
        setTotalChapters(total);
        setProgress(new Map());
        setLogs([]);
    }, []);

    // Stop tracking
    const stopTracking = useCallback(() => {
        setIsActive(false);
    }, []);

    // Update elapsed time
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (isActive && startTime > 0) {
            // Initial update delayed to avoid cascading renders warning
            const initialTimer = setTimeout(() => {
                setElapsedTime(Date.now() - startTime);
            }, 50);

            interval = setInterval(() => {
                setElapsedTime(Date.now() - startTime);
            }, 1000);

            return () => {
                clearTimeout(initialTimer);
                if (interval) clearInterval(interval);
            };
        } else if (!isActive) {
            setTimeout(() => setElapsedTime(0), 0);
        }
    }, [isActive, startTime]);

    // Update chapter progress
    const updateChapterProgress = useCallback((
        chapterId: number,
        data: Partial<ChapterProgress>
    ) => {
        setProgress(prev => {
            const newProgress = new Map(prev);
            const existing = newProgress.get(chapterId);

            const updated: ChapterProgress = {
                chapterId,
                order: data.order ?? existing?.order ?? 0,
                title: data.title ?? existing?.title ?? '',
                status: data.status ?? existing?.status ?? 'pending',
                ...existing,
                ...data,
            };

            // Auto-set timestamps
            if (data.status === 'processing' && !updated.startTime) {
                updated.startTime = Date.now();
            }
            if ((data.status === 'done' || data.status === 'error') && !updated.endTime) {
                updated.endTime = Date.now();
            }

            newProgress.set(chapterId, updated);
            return newProgress;
        });
    }, []);

    // Add log entry
    const addLog = useCallback((log: Omit<TranslationLogEntry, 'timestamp'>) => {
        setLogs(prev => {
            const newLog: TranslationLogEntry = {
                ...log,
                timestamp: Date.now(),
            };

            // Update or append
            const existingIdx = prev.findIndex(l => l.id === log.id);
            if (existingIdx !== -1) {
                const updated = [...prev];
                updated[existingIdx] = newLog;
                return updated;
            }

            // Keep only last 50 logs
            const updated = [...prev, newLog];
            return updated.slice(-50).sort((a, b) => b.order - a.order);
        });
    }, []);

    // Clear logs
    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);

    // Add notification
    const addNotification = useCallback((notification: Omit<SystemNotification, 'id' | 'timestamp'>) => {
        setNotifications(prev => {
            const newNotification: SystemNotification = {
                ...notification,
                id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: Date.now(),
            };

            // Keep only last 10 notifications
            const updated = [...prev, newNotification];
            return updated.slice(-10);
        });
    }, []);

    // Reset everything
    const reset = useCallback(() => {
        setProgress(new Map());
        setLogs([]);
        setNotifications([]);
        setIsActive(false);
        setStartTime(0);
        setTotalChapters(0);
    }, []);

    // Calculate aggregate stats
    const calculateStats = (): AggregateStats => {
        const chapters = Array.from(progress.values());
        const completed = chapters.filter(c => c.status === 'done' || c.status === 'error');

        const totalTokens = chapters.reduce((sum, c) => sum + (c.tokens?.total || 0), 0);
        const totalInputTokens = chapters.reduce((sum, c) => sum + (c.tokens?.input || 0), 0);
        const totalOutputTokens = chapters.reduce((sum, c) => sum + (c.tokens?.output || 0), 0);
        const totalThinkingTokens = chapters.reduce((sum, c) => sum + (c.tokens?.thinking || 0), 0);

        // Cost calculation (Gemini 2.5 Flash pricing)
        // Input: $0.075 per 1M tokens, Output: $0.30 per 1M tokens, Thinking: $0.30 per 1M tokens
        const inputCost = (totalInputTokens / 1_000_000) * 0.075;
        const outputCost = (totalOutputTokens / 1_000_000) * 0.30;
        const thinkingCost = (totalThinkingTokens / 1_000_000) * 0.30;
        const totalCost = inputCost + outputCost + thinkingCost;

        const totalChunks = chapters.reduce((sum, c) => sum + (c.chunks || 0), 0);

        const averageTokensPerChapter = completed.length > 0
            ? totalTokens / completed.length
            : 0;
        const averageCostPerChapter = completed.length > 0
            ? totalCost / completed.length
            : 0;

        // elapsedTime is now managed by state to avoid impure Date.now() during render

        // Estimate time remaining based on average time per chapter
        const avgTimePerChapter = completed.length > 0
            ? elapsedTime / completed.length
            : 0;
        const remainingChapters = totalChapters - completed.length;
        const estimatedTimeRemaining = avgTimePerChapter * remainingChapters;

        return {
            totalChapters,
            completedChapters: completed.length,
            totalTokens,
            totalInputTokens,
            totalOutputTokens,
            totalThinkingTokens,
            totalCost,
            totalChunks,
            averageTokensPerChapter,
            averageCostPerChapter,
            elapsedTime,
            estimatedTimeRemaining,
            startTime,
        };
    };

    const aggregateStats = calculateStats();

    // Get current processing chapter
    const currentChapter = Array.from(progress.values())
        .find(c => c.status === 'processing');

    return {
        progress,
        logs,
        aggregateStats,
        notifications,
        currentChapter,
        isActive,
        startTracking,
        stopTracking,
        updateChapterProgress,
        addLog,
        addNotification,
        clearLogs,
        reset,
    };
}
