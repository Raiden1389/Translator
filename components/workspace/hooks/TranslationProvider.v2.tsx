"use client";

import React, { createContext, useContext, useCallback } from "react";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { TranslationSettings } from "@/lib/types";
import {
    translateChapter,
    translateWithChunking,
    TranslationLog,
    TranslationResult,
    createContextCache,
    deleteContextCache
} from "@/lib/gemini";
import { analyzeTextHeuristics, assembleSystemInstruction } from "@/lib/gemini/rules/assembler";
import { aiQueue } from "@/lib/services/ai-queue";
import type { Chapter } from "@/lib/db";

// Import new hooks
import { useTranslationQueue } from "./useTranslationQueue";
import { useTranslationProgress } from "./useTranslationProgress";

interface BatchTranslateProps {
    workspaceId: string;
    chapters: Chapter[];
    selectedChapters: number[];
    currentSettings: TranslationSettings;
    translateConfig: {
        customPrompt: string;
        autoExtract: boolean;
        fixPunctuation?: boolean;
        maxConcurrency?: number;
        enableChunking: boolean;
        enableTurbo: boolean;
        maxConcurrentChunks: number;
        chunkSize?: number;
    };
    onComplete?: () => void;
}

interface TranslationContextType {
    // Queue state
    isTranslating: boolean;
    queue: ReturnType<typeof useTranslationQueue>;

    // Progress state
    progress: ReturnType<typeof useTranslationProgress>;

    // Backward compatibility
    batchProgress: {
        current: number;
        total: number;
        currentTitle: string;
        logs?: import("./useTranslationProgress").TranslationLogEntry[];
        totalTokens?: number;
        totalCost?: number;
        turboActive?: boolean;
        chunksProcessed?: number;
        cacheHits?: number;
        startTime?: number;
        notifications?: import("./useTranslationProgress").SystemNotification[];
    };

    // Actions
    startBatchTranslate: (props: BatchTranslateProps) => Promise<void>;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

/**
 * TranslationProvider V2 - Refactored with hooks
 * 
 * Uses:
 * - useTranslationQueue for queue management
 * - useTranslationProgress for progress tracking
 * 
 * This is a drop-in replacement for the old TranslationProvider.
 * To enable: Import from './TranslationProvider.v2' instead of './TranslationProvider'
 */
export function TranslationProvider({ children }: { children: React.ReactNode }) {
    const queue = useTranslationQueue();
    const progress = useTranslationProgress();

    const startBatchTranslate = useCallback(async ({
        workspaceId,
        chapters,
        selectedChapters,
        currentSettings,
        translateConfig,
        onComplete
    }: BatchTranslateProps) => {
        if (queue.isProcessing) {
            toast.error("Một tiến trình dịch khác đang chạy.");
            return;
        }

        // Filter chapters to translate (not already translated)
        const chaptersToTranslate = (chapters?.filter(c => selectedChapters.includes(c.id!)) || [])
            .filter(c => c.status !== 'translated');

        if (chaptersToTranslate.length === 0) {
            toast.info("Tất cả chương đã được dịch hoặc không có chương nào hợp lệ.");
            return;
        }

        // Initialize queue and progress
        queue.clearQueue();
        chaptersToTranslate.forEach(c => {
            queue.addToQueue(c.id!, c.order, c.title);
        });

        progress.startTracking(chaptersToTranslate.length);

        // Notification: Init
        progress.addNotification({
            message: '🚀 Đang khởi tạo hệ thống...',
            type: 'init'
        });

        // 1. Shared Batch Context Optimization
        const allOriginalText = chaptersToTranslate.map(c => c.content_original).join("\n\n");
        const dict = await db.dictionary.where('workspaceId').equals(workspaceId).toArray();
        const blacklist = await db.blacklist.where('workspaceId').equals(workspaceId).toArray();
        const blockedWords = new Set(blacklist.map(b => b.word.toLowerCase()));

        const sharedGlossary = dict
            .filter(d => !blockedWords.has(d.original.toLowerCase()) && allOriginalText.includes(d.original))
            .sort((a, b) => b.original.length - a.original.length)
            .slice(0, 100);

        // 2. GLOBAL CONTEXT CACHE (Turbo Mode 🚀)
        let activeCacheName: string | undefined = undefined;
        const isModernModel = currentSettings.model.includes("2.5") || currentSettings.model.includes("2.0") || currentSettings.model.includes("1.5");
        const shouldEnableCache = translateConfig.enableTurbo && isModernModel;

        if (shouldEnableCache) {
            try {
                const initialAnalysis = analyzeTextHeuristics(allOriginalText.slice(0, 10000));
                const staticGlossaryContext = sharedGlossary.length > 0
                    ? `\nGlossary (Static): ${sharedGlossary.map(d => `${d.original}=${d.translated}`).join(', ')}`
                    : '';

                // Include sample content to meet 2048 token minimum
                const sampleContent = allOriginalText.slice(0, 10000); // ~2500 tokens
                const baseSystemInstruction = assembleSystemInstruction(
                    initialAnalysis,
                    staticGlossaryContext,
                    translateConfig.customPrompt
                ) + `\n\n# Sample Content (for context caching):\n${sampleContent}`;

                // Validate cache size (min 2048 tokens required)
                const estimatedTokens = baseSystemInstruction.length / 4; // Rough estimate
                if (estimatedTokens < 2048) {
                    console.warn(`Turbo skipped: content too small (${Math.round(estimatedTokens)} tokens, need 2048+)`);
                } else {
                    activeCacheName = await createContextCache({
                        model: currentSettings.model,
                        systemInstruction: baseSystemInstruction,
                        displayName: `Batch-${workspaceId.slice(0, 4)}-${Date.now()}`,
                        ttlSeconds: 3600
                    });

                    // Notification: Turbo activated
                    const parallelCount = await db.settings.get("maxTotalParallel");
                    const currentParallel = parallelCount?.value || 10;
                    progress.addNotification({
                        message: `⚡ Turbo Mode: Đã kích hoạt [${currentParallel} luồng]`,
                        type: 'turbo'
                    });
                }
            } catch (err) {
                console.error("Failed to create cache:", err);
            }
        }

        // 3. Process chapters
        const processChapter = async (chapter: Chapter) => {
            const logId = `chap-${chapter.id}`;

            // Update queue and progress
            queue.updateStatus(chapter.id!, 'processing');
            progress.updateChapterProgress(chapter.id!, {
                chapterId: chapter.id!,
                order: chapter.order,
                title: chapter.title,
                status: 'processing',
            });

            const onLog = (log: TranslationLog | string) => {
                const msg = typeof log === 'string' ? log : log.message;
                const type = typeof log === 'string' ? 'info' : (log.type || 'info');

                // Parse tokens from message like "[1120i + 906o = 2026t]"
                const parseTokens = (msg: string) => {
                    const match = msg.match(/\[(\d+)i \+ (\d+)o = (\d+)t\]/);
                    if (match) {
                        return {
                            input: parseInt(match[1]),
                            output: parseInt(match[2]),
                            total: parseInt(match[3])
                        };
                    }
                    return undefined;
                };

                const tokens = parseTokens(msg);
                const turbo = msg.includes('🚀Turbo') || msg.includes('🚀');
                const chunksMatch = msg.match(/\((\d+) chunks\)/);
                const chunks = chunksMatch ? parseInt(chunksMatch[1]) : undefined;

                // Add to progress logs
                progress.addLog({
                    id: logId,
                    message: msg,
                    type,
                    order: chapter.order,
                    tokens,
                    turbo,
                    chunks,
                });

                // Update chapter progress if tokens available
                if (tokens) {
                    progress.updateChapterProgress(chapter.id!, {
                        tokens,
                        turbo,
                        chunks,
                    });
                }
            };


            try {
                let finalPrompt = translateConfig.customPrompt || "";
                if (translateConfig.fixPunctuation) {
                    finalPrompt += "\n\n[QUAN TRỌNG] Văn bản gốc có thói quen ngắt dòng bằng dấu phẩy. Mày hãy tự động sửa lại hệ thống dấu câu sao cho đúng chuẩn văn học Việt Nam.";
                }

                const content_original = chapter.content_original || "";
                const startTime = Date.now();

                // Prepare result holder
                let result: TranslationResult;

                if (translateConfig.enableChunking) {
                    result = await translateWithChunking(
                        workspaceId,
                        content_original,
                        translateChapter,
                        onLog,
                        {
                            enabled: true,
                            maxConcurrent: translateConfig.maxConcurrentChunks || 3,
                            maxCharsPerChunk: translateConfig.chunkSize || 1000,
                        },
                        finalPrompt,
                        sharedGlossary,
                        activeCacheName
                    );
                } else {
                    // Standard translation (wrapped in promise to get result)
                    result = await new Promise((resolve, reject) => {
                        translateChapter(
                            workspaceId,
                            content_original,
                            onLog,
                            (res) => resolve(res),
                            finalPrompt,
                            sharedGlossary,
                            activeCacheName
                        ).catch(reject);
                    });
                }

                // --- Title Normalization (Enhanced 🎨) ---
                let finalTitle = result.translatedTitle || "";
                const originalTitle = chapter.title || "";

                // 1. Clean AI tags and markers
                finalTitle = finalTitle
                    .replace(/^\[?TIÊU ĐỀ\]?:?\s*/i, "")
                    .replace(/^Tiêu đề:?\s*/i, "")
                    .replace(/^Title:?\s*/i, "")
                    .replace(/[#*]/g, "")
                    .trim();

                const chapterMatch = originalTitle.match(/(?:第|Chapter|Chương|Episode|Tiết|Quyển)\s*(\d+)/i);

                if (chapterMatch) {
                    const chapterNum = chapterMatch[1];
                    const chapterPrefix = `Chương ${chapterNum}`;

                    // Clean redundancy
                    const cleanTitleBody = finalTitle
                        .replace(new RegExp(`^${chapterPrefix}[:\\s-]*`, 'i'), "")
                        .replace(new RegExp(`^Chapter\\s*${chapterNum}[:\\s-]*`, 'i'), "")
                        .replace(new RegExp(`^第\\s*${chapterNum}\\s*章[:\\s-]*`, 'i'), "")
                        .trim();

                    finalTitle = cleanTitleBody
                        ? `${chapterPrefix}: ${cleanTitleBody.charAt(0).toUpperCase() + cleanTitleBody.slice(1)}`
                        : chapterPrefix;
                } else if (!finalTitle) {
                    finalTitle = originalTitle;
                }

                // SAVE TO DB
                await db.chapters.update(chapter.id!, {
                    content_translated: result.translatedText,
                    title_translated: finalTitle,
                    wordCountTranslated: result.translatedText.trim().split(/\s+/).length,
                    status: 'translated',
                    lastTranslatedAt: new Date(),
                    translationModel: currentSettings.model,
                    translationDurationMs: Date.now() - startTime,
                    stats: result.stats
                });

                // Success notification in logs
                onLog({
                    message: `✅ Lưu thành công! (${((Date.now() - startTime) / 1000).toFixed(1)}s)`,
                    type: 'success',
                    timestamp: new Date()
                } as TranslationLog);

                // Update UI state
                queue.updateStatus(chapter.id!, 'done');
                progress.updateChapterProgress(chapter.id!, {
                    status: 'done',
                });

            } catch (error: any) {
                // Error
                queue.updateStatus(chapter.id!, 'error', error.message);
                progress.updateChapterProgress(chapter.id!, {
                    status: 'error',
                    error: error.message,
                });

                onLog({
                    message: `❌ Lỗi: ${error.message}`,
                    type: 'error',
                    timestamp: new Date()
                });
            }
        };

        // 4. Queue all chapters and collect promises
        const promises = chaptersToTranslate.map(chapter =>
            aiQueue.enqueue('MEDIUM', () => processChapter(chapter))
        );

        // 5. Wait for all chapters to complete
        await Promise.all(promises);

        // 6. Cleanup cache
        if (activeCacheName) {
            try {
                await deleteContextCache(activeCacheName);
            } catch (err) {
                console.error("Failed to delete cache:", err);
            }
        }

        // 7. Finalize
        progress.stopTracking();

        // Notification: Success
        const stats = progress.aggregateStats;
        progress.addNotification({
            message: `🎉 Hoàn thành ${stats.completedChapters}/${stats.totalChapters} chương`,
            type: 'success'
        });

        onComplete?.();
    }, [queue, progress]);

    const value: TranslationContextType = {
        isTranslating: queue.isProcessing,
        queue,
        progress,
        batchProgress: {
            current: progress.aggregateStats.completedChapters,
            total: progress.aggregateStats.totalChapters,
            currentTitle: progress.currentChapter?.title || '',
            logs: progress.logs,
            totalTokens: progress.aggregateStats.totalTokens,
            totalCost: progress.aggregateStats.totalCost,
            turboActive: progress.aggregateStats.turboChapters > 0,
            chunksProcessed: progress.aggregateStats.totalChunks,
            cacheHits: 0, // Not tracked in V2
            startTime: progress.aggregateStats.startTime,
            notifications: progress.notifications,
        },
        startBatchTranslate,
    };

    return (
        <TranslationContext.Provider value={value}>
            {children}
        </TranslationContext.Provider>
    );
}

export function useTranslation() {
    const context = useContext(TranslationContext);
    if (!context) {
        throw new Error("useTranslation must be used within TranslationProvider");
    }
    return context;
}
