import { renderHook, act } from '@testing-library/react';
import { useTranslationQueue } from './useTranslationQueue';

describe('useTranslationQueue', () => {
    it('should initialize with empty queue', () => {
        const { result } = renderHook(() => useTranslationQueue());

        expect(result.current.queue).toEqual([]);
        expect(result.current.isProcessing).toBe(false);
        expect(result.current.stats.total).toBe(0);
    });

    it('should add chapters to queue', () => {
        const { result } = renderHook(() => useTranslationQueue());

        act(() => {
            result.current.addToQueue(1, 1, 'Chapter 1');
            result.current.addToQueue(2, 2, 'Chapter 2');
        });

        expect(result.current.queue).toHaveLength(2);
        expect(result.current.stats.total).toBe(2);
        expect(result.current.stats.queued).toBe(2);
    });

    it('should prevent duplicate chapters', () => {
        const { result } = renderHook(() => useTranslationQueue());

        act(() => {
            result.current.addToQueue(1, 1, 'Chapter 1');
            result.current.addToQueue(1, 1, 'Chapter 1'); // duplicate
        });

        expect(result.current.queue).toHaveLength(1);
    });

    it('should update chapter status', () => {
        const { result } = renderHook(() => useTranslationQueue());

        act(() => {
            result.current.addToQueue(1, 1, 'Chapter 1');
        });

        act(() => {
            result.current.updateStatus(1, 'processing');
        });

        expect(result.current.queue[0].status).toBe('processing');
        expect(result.current.isProcessing).toBe(true);
        expect(result.current.stats.processing).toBe(1);
    });

    it('should track timestamps', () => {
        const { result } = renderHook(() => useTranslationQueue());

        act(() => {
            result.current.addToQueue(1, 1, 'Chapter 1');
        });

        const beforeStart = Date.now();

        act(() => {
            result.current.updateStatus(1, 'processing');
        });

        const item = result.current.queue[0];
        expect(item.startedAt).toBeGreaterThanOrEqual(beforeStart);
        expect(item.completedAt).toBeUndefined();

        act(() => {
            result.current.updateStatus(1, 'done');
        });

        const completedItem = result.current.queue[0];
        expect(completedItem.completedAt).toBeGreaterThanOrEqual(beforeStart);
    });

    it('should remove chapters from queue', () => {
        const { result } = renderHook(() => useTranslationQueue());

        act(() => {
            result.current.addToQueue(1, 1, 'Chapter 1');
            result.current.addToQueue(2, 2, 'Chapter 2');
        });

        act(() => {
            result.current.removeFromQueue(1);
        });

        expect(result.current.queue).toHaveLength(1);
        expect(result.current.queue[0].chapterId).toBe(2);
    });

    it('should clear entire queue', () => {
        const { result } = renderHook(() => useTranslationQueue());

        act(() => {
            result.current.addToQueue(1, 1, 'Chapter 1');
            result.current.addToQueue(2, 2, 'Chapter 2');
        });

        act(() => {
            result.current.clearQueue();
        });

        expect(result.current.queue).toEqual([]);
        expect(result.current.stats.total).toBe(0);
    });

    it('should sort queue by order', () => {
        const { result } = renderHook(() => useTranslationQueue());

        act(() => {
            result.current.addToQueue(3, 3, 'Chapter 3');
            result.current.addToQueue(1, 1, 'Chapter 1');
            result.current.addToQueue(2, 2, 'Chapter 2');
        });

        expect(result.current.queue[0].order).toBe(1);
        expect(result.current.queue[1].order).toBe(2);
        expect(result.current.queue[2].order).toBe(3);
    });

    it('should build status map correctly', () => {
        const { result } = renderHook(() => useTranslationQueue());

        act(() => {
            result.current.addToQueue(1, 1, 'Chapter 1');
            result.current.addToQueue(2, 2, 'Chapter 2');
            result.current.updateStatus(1, 'processing');
        });

        expect(result.current.queueStatus.get(1)).toBe('processing');
        expect(result.current.queueStatus.get(2)).toBe('queued');
    });

    it('should calculate stats correctly', () => {
        const { result } = renderHook(() => useTranslationQueue());

        act(() => {
            result.current.addToQueue(1, 1, 'Chapter 1');
            result.current.addToQueue(2, 2, 'Chapter 2');
            result.current.addToQueue(3, 3, 'Chapter 3');
            result.current.addToQueue(4, 4, 'Chapter 4');

            result.current.updateStatus(1, 'processing');
            result.current.updateStatus(2, 'done');
            result.current.updateStatus(3, 'error', 'Test error');
        });

        expect(result.current.stats).toEqual({
            total: 4,
            queued: 1,
            processing: 1,
            done: 1,
            error: 1,
        });
    });
});
