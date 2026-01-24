import { useState, useEffect } from 'react';
import { aiQueue, AiQueueState } from '@/lib/services/ai-queue';

export function useAiQueueStatus(taskId: string | null) {
    const [status, setStatus] = useState<'queued' | 'running' | 'none'>('none');

    useEffect(() => {
        const updateStatus = (state: AiQueueState) => {
            if (!taskId) {
                setStatus('none');
                return;
            }
            if (state.runningIds.includes(taskId)) {
                setStatus('running');
            } else if (state.pendingIds.includes(taskId)) {
                setStatus('queued');
            } else {
                setStatus('none');
            }
        };

        // Subscription that updates state on every queue change
        const unsubscribe = aiQueue.subscribe(updateStatus);

        return () => unsubscribe();
    }, [taskId]);

    return status;
}

/**
 * Hook for global queue stats
 */
export function useAiQueueStats() {
    const [stats, setStats] = useState<AiQueueState>({
        pendingCount: 0,
        runningCount: 0,
        pendingIds: [],
        runningIds: []
    });

    useEffect(() => {
        return aiQueue.subscribe(setStats);
    }, []);

    return stats;
}
