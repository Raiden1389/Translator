"use client";

import React, { createContext, useContext, useCallback } from "react";
import { db } from "@/lib/db";
import { TranslationSettings } from "@/lib/types";
import {
    translateChapter,
    translateWithChunking,
    TranslationLog,
    TranslationResult,
} from "@/lib/gemini";
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
        maxConcurrentChunks: number;
        chunkSize?: number;
        enableThinking?: boolean;  // 🧠 NEW: Thinking mode toggle
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
        totalTermsUsed?: number;
        totalCharactersUsed?: number;
        currentTermsUsed?: number;
        currentCharactersUsed?: number;
    };

    // Actions
    startBatchTranslate: (props: BatchTranslateProps) => Promise<void>;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

/**
 * TranslationProvider V2 - Refactored with hooks
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
            progress.addNotification({ type: 'error', message: '❌ Một tiến trình dịch khác đang chạy' });
            return;
        }

        // Filter chapters to translate (not already translated OR translation deleted)
        const chaptersToTranslate = (chapters?.filter(c => selectedChapters.includes(c.id!)) || [])
            .filter(c => !c.content_translated || c.content_translated.trim() === '');

        if (chaptersToTranslate.length === 0) {
            progress.addNotification({ type: 'error', message: '⚠️ Tất cả chương đã được dịch hoặc không có chương nào hợp lệ' });
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

        // 1. Shared Batch Context Optimization - MERGE Dictionary + Approved Heuristic Terms
        const allOriginalText = chaptersToTranslate.map(c => c.content_original).join("\n\n");

        // Load from both sources
        const dict = await db.dictionary.where('workspaceId').equals(workspaceId).toArray();
        const heuristicTerms = await db.heuristicTerms
            .where('workspaceId')
            .equals(workspaceId)
            .filter(h => h.isApproved === true)
            .toArray();

        const blacklist = await db.blacklist.where('workspaceId').equals(workspaceId).toArray();
        const blockedWords = new Set(blacklist.map(b => b.word.toLowerCase()));

        // Convert heuristicTerms to DictionaryEntry format
        const heuristicAsDict = heuristicTerms.map(h => ({
            id: h.id,
            workspaceId: h.workspaceId,
            original: h.original,
            translated: h.translated,
            type: h.type === 'character' ? 'character' : 'term',
            createdAt: h.createdAt
        }));

        // Merge both sources (deduplicate by original)
        const mergedDict = [...dict, ...heuristicAsDict];
        const uniqueDict = Array.from(
            new Map(mergedDict.map(item => [item.original.toLowerCase(), item])).values()
        );

        const sharedGlossary = uniqueDict
            .filter(d => !blockedWords.has(d.original.toLowerCase()) && allOriginalText.includes(d.original))
            .sort((a, b) => b.original.length - a.original.length)
            .slice(0, 100);

        console.log(`[GLOSSARY] Loaded ${dict.length} dict + ${heuristicTerms.length} heuristic = ${sharedGlossary.length} final terms`);

        // 2. Process chapters
        const processChapter = async (chapter: Chapter) => {
            const logId = `chap-${chapter.id}`;

            // Update queue and progress - CRITICAL: Set title immediately
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
                const chunksMatch = msg.match(/\((\d+) chunks\)/);
                const chunks = chunksMatch ? parseInt(chunksMatch[1]) : undefined;

                // Add to progress logs
                progress.addLog({
                    id: logId,
                    message: msg,
                    type,
                    order: chapter.order,
                    tokens,
                    chunks,
                });

                // Update chapter progress if tokens available
                progress.updateChapterProgress(chapter.id!, {
                    tokens,
                    chunks,
                });
            };


            try {
                let finalPrompt = translateConfig.customPrompt || "";
                if (translateConfig.fixPunctuation) {
                    finalPrompt += "\n\n[QUAN TRỌNG] Văn bản gốc có thói quen ngắt dòng bằng dấu phẩy. Mày hãy tự động sửa lại hệ thống dấu câu sao cho đúng chuẩn văn học Việt Nam.";
                }

                const content_original = chapter.content_original || "";
                const startTime = Date.now();

                // DEBUG: Log chunking config
                console.log(`[CHUNKING DEBUG] Chapter ${chapter.order}:`, {
                    enableChunking: translateConfig.enableChunking,
                    maxConcurrentChunks: translateConfig.maxConcurrentChunks,
                    chunkSize: translateConfig.chunkSize
                });

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
                            onProgress: (current, total) => {
                                // Update progress state with chunk info
                                progress.updateChapterProgress(chapter.id!, {
                                    status: 'processing',
                                    chunks: total
                                });

                                onLog({
                                    timestamp: new Date(),
                                    message: `📦 Đang dịch chunk ${current}/${total}...`,
                                    type: 'info'
                                });
                            }
                        },
                        finalPrompt,
                        sharedGlossary
                    );
                } else {
                    // Standard translation (wrapped in promise to get result)
                    result = await new Promise((resolve, reject) => {
                        translateChapter(
                            workspaceId,
                            content_original,
                            onLog,
                            (res) => resolve(res as TranslationResult),
                            finalPrompt,
                            sharedGlossary,
                            translateConfig.enableThinking  // 🧠 Pass thinking mode config
                        ).catch(reject);
                    });
                }

                // --- Title Normalization ---
                let finalTitle = result.translatedTitle || "";
                const originalTitle = chapter.title || "";

                // Clean AI tags and markers
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

                // Calculate dictionary usage for this chapter
                const chapterContent = chapter.content_original || "";
                const termsUsed = sharedGlossary.filter(term =>
                    term.type !== 'character' && chapterContent.includes(term.original)
                ).length;
                const charactersUsed = sharedGlossary.filter(term =>
                    term.type === 'character' && chapterContent.includes(term.original)
                ).length;

                // DEBUG: Log dictionary usage
                console.log(`[DICT DEBUG] Chapter ${chapter.order}:`, {
                    sharedGlossaryTotal: sharedGlossary.length,
                    termsUsed,
                    charactersUsed,
                    sampleGlossary: sharedGlossary.slice(0, 3).map(g => ({ original: g.original, type: g.type }))
                });

                // Success notification in logs
                onLog({
                    message: `✅ Lưu thành công! (${((Date.now() - startTime) / 1000).toFixed(1)}s)`,
                    type: 'success',
                    timestamp: new Date()
                } as TranslationLog);

                // Update UI state with dictionary usage and token stats
                queue.updateStatus(chapter.id!, 'done');
                progress.updateChapterProgress(chapter.id!, {
                    status: 'done',
                    termsUsed,
                    charactersUsed,
                    tokens: result.stats?.tokens ? {
                        input: result.stats.tokens.input,
                        output: result.stats.tokens.output,
                        total: result.stats.tokens.total
                    } : undefined,
                });

            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error);
                // Error
                queue.updateStatus(chapter.id!, 'error', message);
                progress.updateChapterProgress(chapter.id!, {
                    status: 'error',
                    error: message,
                });

                onLog({
                    message: `❌ Lỗi: ${message}`,
                    type: 'error',
                    timestamp: new Date()
                });
            }
        };

        // 3. Queue all chapters and collect promises
        const promises = chaptersToTranslate.map(chapter =>
            aiQueue.enqueue('MEDIUM', () => processChapter(chapter))
        );

        // 4. Wait for all chapters to complete
        await Promise.all(promises);

        // 5. Capture stats BEFORE cleanup
        const stats = progress.aggregateStats;

        // 6. Cleanup
        progress.stopTracking();

        // Notification: Success
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
            chunksProcessed: progress.aggregateStats.totalChunks,
            startTime: progress.aggregateStats.startTime,
            notifications: progress.notifications,
            totalTermsUsed: progress.aggregateStats.totalTermsUsed,
            totalCharactersUsed: progress.aggregateStats.totalCharactersUsed,
            currentTermsUsed: progress.currentChapter?.termsUsed || 0,
            currentCharactersUsed: progress.currentChapter?.charactersUsed || 0,
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
