import pLimit from "p-limit";
import { db } from "../db";

export type AiTaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface AiTask<T> {
    id: string;
    priority: AiTaskPriority;
    execute: () => Promise<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: unknown) => void;
    createdAt: number;
}

export type AiQueueState = {
    pendingCount: number;
    runningCount: number;
    pendingIds: string[];
    runningIds: string[];
};

class AiQueueManager {
    private static instance: AiQueueManager;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private queue: AiTask<any>[] = [];
    private runningIds = new Set<string>();
    private limit = pLimit(10);
    private isRunningLoop = false;
    private isPaused = false;

    // Simple observer pattern
    private listeners: ((state: AiQueueState) => void)[] = [];

    private constructor() {
        this.initializeLimit();
    }

    static getInstance() {
        if (!AiQueueManager.instance) {
            AiQueueManager.instance = new AiQueueManager();
        }
        return AiQueueManager.instance;
    }

    private async initializeLimit() {
        if (typeof window === 'undefined') return;
        const setting = await db.settings.get("maxTotalParallel");
        const val = parseInt((setting?.value as string) || "10");
        this.limit = pLimit(val);
    }

    private notify() {
        const state: AiQueueState = {
            pendingCount: this.queue.length,
            runningCount: this.runningIds.size,
            pendingIds: this.queue.map(t => t.id),
            runningIds: Array.from(this.runningIds)
        };
        this.listeners.forEach(l => l(state));
    }

    subscribe(listener: (state: AiQueueState) => void) {
        this.listeners.push(listener);
        this.notify(); // Initial push
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    getTaskStatus(id: string): 'queued' | 'running' | 'none' {
        if (this.runningIds.has(id)) return 'running';
        if (this.queue.some(t => t.id === id)) return 'queued';
        return 'none';
    }

    enqueue<T>(priority: AiTaskPriority, execute: () => Promise<T>, id?: string): Promise<T> {
        return new Promise((resolve, reject) => {
            const taskId = id || Math.random().toString(36).substring(7);
            const task: AiTask<T> = {
                id: taskId,
                priority,
                execute,
                resolve,
                reject,
                createdAt: Date.now()
            };

            this.queue.push(task);
            this.sortQueue();
            this.notify();
            this.processNext();
        });
    }

    private sortQueue() {
        const priorityScore = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        this.queue.sort((a, b) => {
            if (priorityScore[a.priority] !== priorityScore[b.priority]) {
                return priorityScore[b.priority] - priorityScore[a.priority];
            }
            return a.createdAt - b.createdAt;
        });
    }

    private async processNext() {
        if (this.isRunningLoop || this.isPaused || this.queue.length === 0) return;
        this.isRunningLoop = true;

        while (this.queue.length > 0 && !this.isPaused) {
            const task = this.queue.shift();
            if (!task) break;

            this.notify(); // Queue size changed

            // Execute via p-limit
            this.limit(async () => {
                this.runningIds.add(task.id);
                this.notify();

                try {
                    const result = await task.execute();
                    task.resolve(result);
                } catch (error) {
                    task.reject(error);
                } finally {
                    this.runningIds.delete(task.id);
                    this.notify();
                }
            });

            // Avoid heavy tight loop
            await new Promise(r => setTimeout(r, 10));
        }

        this.isRunningLoop = false;
    }

    pause() {
        this.isPaused = true;
        this.notify();
    }

    resume() {
        this.isPaused = false;
        this.notify();
        this.processNext();
    }
}

export const aiQueue = AiQueueManager.getInstance();
