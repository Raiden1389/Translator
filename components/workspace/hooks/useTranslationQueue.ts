import { useState, useCallback } from 'react';

/**
 * Translation Queue Item
 */
export interface TranslationQueueItem {
    chapterId: number;
    order: number;
    title: string;
    status: 'queued' | 'processing' | 'done' | 'error';
    addedAt: number;
    startedAt?: number;
    completedAt?: number;
    error?: string;
}

/**
 * Queue Status Map
 */
export type QueueStatus = TranslationQueueItem['status'];

/**
 * Hook Return Type
 */
export interface UseTranslationQueueReturn {
    queue: TranslationQueueItem[];
    queueStatus: Map<number, QueueStatus>;
    isProcessing: boolean;

    // Actions
    addToQueue: (chapterId: number, order: number, title: string) => void;
    removeFromQueue: (chapterId: number) => void;
    clearQueue: () => void;
    updateStatus: (chapterId: number, status: QueueStatus, error?: string) => void;

    // Stats
    stats: {
        total: number;
        queued: number;
        processing: number;
        done: number;
        error: number;
    };
}

/**
 * useTranslationQueue Hook
 * 
 * Manages translation queue state and operations.
 * Extracted from TranslationProvider to reduce complexity.
 * 
 * @example
 * ```tsx
 * const queue = useTranslationQueue();
 * queue.addToQueue(1, 1, 'Chapter 1');
 * queue.updateStatus(1, 'processing');
 * queue.updateStatus(1, 'done');
 * ```
 */
export function useTranslationQueue(): UseTranslationQueueReturn {
    const [queue, setQueue] = useState<TranslationQueueItem[]>([]);

    // Add chapter to queue
    const addToQueue = useCallback((chapterId: number, order: number, title: string) => {
        setQueue(prev => {
            // Prevent duplicates
            if (prev.some(item => item.chapterId === chapterId)) {
                return prev;
            }

            const newItem: TranslationQueueItem = {
                chapterId,
                order,
                title,
                status: 'queued',
                addedAt: Date.now(),
            };

            return [...prev, newItem].sort((a, b) => a.order - b.order);
        });
    }, []);

    // Remove chapter from queue
    const removeFromQueue = useCallback((chapterId: number) => {
        setQueue(prev => prev.filter(item => item.chapterId !== chapterId));
    }, []);

    // Clear entire queue
    const clearQueue = useCallback(() => {
        setQueue([]);
    }, []);

    // Update chapter status
    const updateStatus = useCallback((
        chapterId: number,
        status: QueueStatus,
        error?: string
    ) => {
        setQueue(prev => prev.map(item => {
            if (item.chapterId !== chapterId) return item;

            const updated: TranslationQueueItem = {
                ...item,
                status,
                error,
            };

            // Track timestamps
            if (status === 'processing' && !item.startedAt) {
                updated.startedAt = Date.now();
            }
            if ((status === 'done' || status === 'error') && !item.completedAt) {
                updated.completedAt = Date.now();
            }

            return updated;
        }));
    }, []);

    // Build status map (for quick lookup)
    const queueStatus = new Map<number, QueueStatus>(
        queue.map(item => [item.chapterId, item.status])
    );

    // Check if any chapter is processing
    const isProcessing = queue.some(item => item.status === 'processing');

    // Calculate stats
    const stats = {
        total: queue.length,
        queued: queue.filter(item => item.status === 'queued').length,
        processing: queue.filter(item => item.status === 'processing').length,
        done: queue.filter(item => item.status === 'done').length,
        error: queue.filter(item => item.status === 'error').length,
    };

    return {
        queue,
        queueStatus,
        isProcessing,
        addToQueue,
        removeFromQueue,
        clearQueue,
        updateStatus,
        stats,
    };
}
