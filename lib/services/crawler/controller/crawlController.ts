import { UniversalEngine } from "../engines/universalEngine";
import { db } from "../../../db";

export interface CrawlTask {
    chapterId: number;
    url: string;
    status: 'pending' | 'crawling' | 'completed' | 'failed';
    error?: string;
}

/**
 * CrawlController (MC-AI Style)
 * Handles background chapter downloads with queueing, concurrency, and error isolation.
 */
export class CrawlController {
    private queue: CrawlTask[] = [];
    private activeCount = 0;
    private maxConcurrent = 1; // Start slow for stability, increase if safe
    private isRunning = false;
    private state = {
        isRunning: false,
        completed: 0,
        total: 0,
        currentTitle: '',
        failed: 0
    };
    private listeners: Set<(state: any) => void> = new Set();

    // Callbacks for UI updates
    public onProgress?: (completed: number, total: number, currentTitle?: string) => void;
    public onFinished?: (success: number, failed: number) => void;

    private notify() {
        this.listeners.forEach(l => l({ ...this.state }));
    }

    subscribe(listener: (state: any) => void) {
        this.listeners.add(listener);
        listener({ ...this.state });
        return () => this.listeners.delete(listener);
    }

    async addTasks(tasks: { chapterId: number; url: string }[]) {
        console.log(`[CrawlController] Adding ${tasks.length} tasks to queue.`);
        this.queue.push(...tasks.map(t => ({ ...t, status: 'pending' as const })));
        this.run();
    }

    private async run() {
        if (this.isRunning || this.queue.length === 0) return;
        this.isRunning = true;

        console.log(`[CrawlController] Queue started.`);
        this.state.isRunning = true;
        this.state.total = this.queue.length;
        this.state.completed = 0;
        this.state.failed = 0;
        this.notify();

        while (this.queue.some(t => t.status === 'pending' || t.status === 'crawling')) {
            if (this.activeCount < this.maxConcurrent) {
                const task = this.queue.find(t => t.status === 'pending');
                if (task) {
                    this.processTask(task);
                }
            }
            await new Promise(r => setTimeout(r, 1000));
        }

        this.isRunning = false;
        this.state.isRunning = false;
        const success = this.queue.filter(t => t.status === 'completed').length;
        this.state.completed = success;
        const failed = this.queue.filter(t => t.status === 'failed').length;
        this.state.failed = failed;
        this.onFinished?.(success, failed);
        this.notify();
        console.log(`[CrawlController] Queue finished. Success: ${success}, Failed: ${failed}`);

        // Clear queue after finish
        this.queue = [];
    }

    private async processTask(task: CrawlTask) {
        task.status = 'crawling';
        this.activeCount++;

        try {
            console.log(`[CrawlController] Fetching chapter: ${task.url}`);
            const { title, content } = await UniversalEngine.fetchChapter(task.url);

            await db.chapters.update(task.chapterId, {
                content_original: content,
                status: 'draft' // Mark as ready for processing/translation
            });

            task.status = 'completed';
            console.log(`[CrawlController] Done: ${title}`);
            this.reportProgress(title);
        } catch (error: any) {
            task.status = 'failed';
            task.error = error.message;
            console.error(`[CrawlController] Failed chapter: ${task.url}`, error);
            this.reportProgress(`Lỗi: ${error.message}`);
        } finally {
            this.activeCount--;
        }
    }

    private reportProgress(currentTitle?: string) {
        const completed = this.queue.filter(t => t.status === 'completed' || t.status === 'failed').length;
        this.state.completed = completed;
        this.state.currentTitle = currentTitle || '';
        this.notify();
        this.onProgress?.(completed, this.queue.length, currentTitle);
    }
}

// Global instance to persist across UI navigation
export const globalCrawler = new CrawlController();
