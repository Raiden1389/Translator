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
import { cleanHtmlContent, sanitizeTranslatedContent } from "@/lib/utils/text-sanitizer";

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
        enableThinking?: boolean;  // 🧠 For Gemini 2.5 Flash
        thinkingLevel?: "minimal" | "low" | "medium" | "high";  // 🧠 For Gemini 3.0 Flash
        enableBatch?: boolean;  // 📦 Batch translation
        batchSize?: number;  // 📦 Chapters per batch (2-5)
        maxCharsPerBatch?: number;  // 📦 Max chars per batch
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
        currentChunk?: number;  // Current chunk being processed (1-indexed)
        totalChunks?: number;   // Total chunks in current chapter
        cacheHits?: number;
        startTime?: number;
        notifications?: import("./useTranslationProgress").SystemNotification[];
        totalTermsUsed?: number;
        totalCharactersUsed?: number;
        currentTermsUsed?: number;
        currentCharactersUsed?: number;
        chapterStats?: Array<{
            chapterId: number;
            order: number;
            title: string;
            termsUsed: number;
            charactersUsed: number;
        }>;
        batchMode?: boolean;
        batchSize?: number;
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

        // 2. Check batch mode
        if (translateConfig.enableBatch && translateConfig.batchSize && chaptersToTranslate.length > 1) {
            console.log(`⚡ [BATCH MODE] ${chaptersToTranslate.length} chapters → batches of ${translateConfig.batchSize}`);
            const { createSmartBatches, buildBatchPrompt } = await import('@/lib/gemini/batch');
            const batches = createSmartBatches(chaptersToTranslate, {
                enabled: true,
                batchSize: translateConfig.batchSize,
                maxCharsPerBatch: translateConfig.maxCharsPerBatch || 25000
            });
            progress.addNotification({
                message: `⚡ Batch: ${chaptersToTranslate.length} chương → ${batches.length} batches`,
                type: 'turbo'
            });
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                console.log(`📦 [BATCH ${i + 1}/${batches.length}] ${batch.length} chapters`);
                batch.forEach(ch => queue.updateStatus(ch.id!, 'processing'));
                const { systemInstruction, userPrompt } = await buildBatchPrompt(batch, {
                    customPrompt: translateConfig.customPrompt,
                    workspaceId
                });
                // Call batch API
                try {
                    const { translateBatch } = await import('@/lib/gemini/batch-api');
                    console.log(`📡 [BATCH ${i + 1}/${batches.length}] Calling API for ${batch.length} chapters...`);
                    progress.addNotification({
                        message: `📡 Batch ${i + 1}/${batches.length}: Đang dịch ${batch.length} chương...`,
                        type: 'turbo'
                    });
                    const modelSetting = await db.settings.get("aiModel");
                    const aiModel = (modelSetting?.value as string) || "gemini-2.5-flash-preview-09-2025";

                    const result = await translateBatch(
                        userPrompt,
                        batch,
                        aiModel,
                        workspaceId,
                        (msg: string) => console.log(`[BATCH ${i + 1}] ${msg}`),
                        translateConfig.enableChunking,
                        translateConfig.chunkSize || 8000,
                        translateConfig.maxConcurrentChunks || 5,
                        translateConfig.enableThinking,
                        translateConfig.thinkingLevel,
                        systemInstruction,
                        translateConfig.customPrompt
                    );

                    console.log(`✅ [BATCH ${i + 1}] API returned ${result.chapters.length} chapters`);

                    // Save translated chapters to DB
                    for (let j = 0; j < result.chapters.length; j++) {
                        const translatedChapter = result.chapters[j];
                        const originalChapter = batch[j];

                        // Calculate per-chapter tokens (evenly distributed)
                        const perChapterTokens = {
                            input: Math.floor(result.stats.inputTokens / batch.length),
                            output: Math.floor(result.stats.outputTokens / batch.length),
                            total: Math.floor(result.stats.totalTokens / batch.length),
                            thinking: Math.floor((result.stats.thinkingTokens || 0) / batch.length)
                        };

                        // --- Title Normalization (Sync with Single Mode) ---
                        let finalTitle = translatedChapter.title_translated || originalChapter.title || "";

                        // Clean AI tags and markers
                        finalTitle = finalTitle
                            .replace(/^\[?TIÊU ĐỀ\]?:?\s*/i, "")
                            .replace(/^Tiêu đề:?\s*/i, "")
                            .replace(/^Title:?\s*/i, "")
                            .replace(/[#*]/g, "")
                            .trim();

                        const chapterMatch = (originalChapter.title || "").match(/(?:第|Chapter|Chương|Episode|Tiết|Quyển)\s*(\d+)/i);

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
                        }

                        await db.chapters.update(originalChapter.id!, {
                            content_translated: translatedChapter.content_translated,
                            title_translated: finalTitle, // Use normalized title
                            status: 'translated',
                            lastTranslatedAt: new Date(),
                            stats: {
                                tokens: perChapterTokens
                            }
                        });



                        queue.updateStatus(originalChapter.id!, 'done');
                        progress.updateChapterProgress(originalChapter.id!, {
                            status: 'done',
                            tokens: perChapterTokens
                        });
                    }

                    console.log(`✅ [BATCH ${i + 1}] Saved ${result.chapters.length} chapters`);

                } catch (error) {
                    console.error(`❌ [BATCH ${i + 1}] API failed:`, error);
                    console.log(`⚠️ [BATCH ${i + 1}] Falling back to single-chapter mode`);
                    // TODO: Implement fallback - for now, just log error
                    // for (const chapter of batch) {
                    //     await processChapter(chapter);
                    // }
                }
            }
            progress.stopTracking();
            onComplete?.();
            return;
        }

        // 3. Process chapters
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

                // 🛡️ LAYER 1 (PRE): Clean HTML from original content BEFORE sending to AI
                // This saves tokens and prevents AI from being confused by HTML tags
                const content_original = cleanHtmlContent(chapter.content_original || "");
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
                            enabled: translateConfig.enableChunking, // 🛡️ ÉP CHÚ: Phải truyền biến này vào!
                            maxCharsPerChunk: translateConfig.chunkSize || 8000,
                            maxConcurrent: translateConfig.maxConcurrentChunks || 5,
                            onProgress: (current, total) => {
                                // Update progress state with chunk info
                                progress.updateChapterProgress(chapter.id!, {
                                    status: 'processing',
                                    chunks: total,
                                    currentChunk: current,
                                    totalChunks: total
                                });

                                onLog({
                                    timestamp: new Date(),
                                    message: `📦 Đang dịch chunk ${current}/${total}...`,
                                    type: 'info'
                                });
                            },
                            enableThinking: translateConfig.enableThinking,
                            thinkingLevel: translateConfig.thinkingLevel,
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
                            translateConfig.enableThinking,
                            translateConfig.thinkingLevel
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

                // 🛡️ LAYER 2 (POST): Sanitize translated content from AI
                // This is the final defense layer to ensure NO HTML tags remain
                const cleanTranslatedText = sanitizeTranslatedContent(result.translatedText);
                const cleanTranslatedTitle = sanitizeTranslatedContent(finalTitle);

                // SAVE TO DB
                await db.chapters.update(chapter.id!, {
                    content_translated: cleanTranslatedText,
                    title_translated: cleanTranslatedTitle,
                    wordCountTranslated: cleanTranslatedText.trim().split(/\s+/).length,
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

        // 5. Cleanup
        progress.stopTracking();

        onComplete?.();
    }, [queue, progress]);

    const value: TranslationContextType = {
        isTranslating: queue.isProcessing,
        queue,
        progress,
        batchProgress: {
            current: progress.aggregateStats.completedChapters,
            total: progress.aggregateStats.totalChapters,
            currentTitle: '',
            batchMode: false,  // TODO: Enable when batch API is ready
            batchSize: 3,
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
            currentChunk: progress.currentChapter?.currentChunk || 0,
            totalChunks: progress.currentChapter?.totalChunks || 0,
            chapterStats: Array.from(progress.progress.values())
                .filter(ch => ch.status === 'done' && (ch.termsUsed || ch.charactersUsed))
                .map(ch => ({
                    chapterId: ch.chapterId,
                    order: ch.order,
                    title: ch.title,
                    termsUsed: ch.termsUsed || 0,
                    charactersUsed: ch.charactersUsed || 0,
                }))
                .sort((a, b) => a.order - b.order),
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
