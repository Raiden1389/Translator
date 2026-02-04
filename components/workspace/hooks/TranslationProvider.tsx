"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { TranslationSettings } from "@/lib/types";
import {
    translateChapter,
    translateWithChunking,
    TranslationLog,
    createContextCache,
    deleteContextCache
} from "@/lib/gemini";
import { analyzeTextHeuristics, assembleSystemInstruction } from "@/lib/gemini/rules/assembler";
import { aiQueue } from "@/lib/services/ai-queue";
import type { Chapter } from "@/lib/db";

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
        enableTurbo: boolean; // 🚀 New
        maxConcurrentChunks: number;
        chunkSize?: number;
    };
    onComplete?: () => void;
}

interface TranslationProgress {
    current: number;
    total: number;
    currentTitle: string;
    logs: {
        id: string;
        message: string;
        type: 'info' | 'success' | 'error';
        order: number;
        tokens?: { input: number; output: number; total: number };
        turbo?: boolean;
        chunks?: number;
    }[];
    // Aggregate stats
    totalTokens?: number;
    totalCost?: number;
    turboActive?: boolean;
    chunksProcessed?: number;
    cacheHits?: number;
    startTime?: number;
}

interface TranslationContextType {
    isTranslating: boolean;
    batchProgress: TranslationProgress;
    startBatchTranslate: (props: BatchTranslateProps) => Promise<void>;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: React.ReactNode }) {
    const [isTranslating, setIsTranslating] = useState(false);
    const [batchProgress, setBatchProgress] = useState<TranslationProgress>({
        current: 0,
        total: 0,
        currentTitle: "",
        logs: []
    });



    const startBatchTranslate = useCallback(async ({
        workspaceId,
        chapters,
        selectedChapters,
        currentSettings,
        translateConfig,
        onComplete
    }: BatchTranslateProps) => {
        if (isTranslating) {
            toast.error("Một tiến trình dịch khác đang chạy.");
            return;
        }

        setIsTranslating(true);
        // AUDIT FIX: Only translate chapters that are NOT already 'translated'
        const chaptersToTranslate = (chapters?.filter(c => selectedChapters.includes(c.id!)) || [])
            .filter(c => c.status !== 'translated');

        if (chaptersToTranslate.length === 0) {
            setIsTranslating(false);
            toast.info("Tất cả chương đã được dịch hoặc không có chương nào hợp lệ.");
            return;
        }

        let totalUsedChars = 0;
        const batchStartTime = Date.now();
        setBatchProgress({
            current: 0,
            total: chaptersToTranslate.length,
            currentTitle: "Khởi tạo Max Ping...",
            logs: [],
            startTime: batchStartTime,
            totalTokens: 0,
            totalCost: 0,
            cacheHits: 0,
            chunksProcessed: 0
        });

        const batchToastId = "batch-translate-status";
        toast.loading("🚀 Đang khởi tạo hệ thống...", { id: batchToastId });

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
        // Enable if user wants it AND > 1 chapter and using a modern model
        let activeCacheName: string | undefined = undefined;
        const isModernModel = currentSettings.model.includes("2.5") || currentSettings.model.includes("2.0") || currentSettings.model.includes("1.5");
        const shouldEnableCache = translateConfig.enableTurbo && isModernModel;

        if (shouldEnableCache) {
            try {
                setBatchProgress(prev => ({ ...prev, currentTitle: "⚡ Đang khởi tạo Turbo Cache..." }));

                // Assemble static instruction for cache
                const initialAnalysis = analyzeTextHeuristics(allOriginalText.slice(0, 10000));
                const staticGlossaryContext = sharedGlossary.length > 0
                    ? `\nGlossary (Static): ${sharedGlossary.map(d => `${d.original}=${d.translated}`).join(', ')}`
                    : '';

                const baseSystemInstruction = assembleSystemInstruction(
                    initialAnalysis,
                    staticGlossaryContext,
                    translateConfig.customPrompt
                );

                activeCacheName = await createContextCache({
                    model: currentSettings.model,
                    systemInstruction: baseSystemInstruction,
                    displayName: `Batch-${workspaceId.slice(0, 4)}-${Date.now()}`,
                    ttlSeconds: 3600 // 1 hour safety
                });

                const parallelCount = await db.settings.get("maxTotalParallel");
                const currentParallel = parallelCount?.value || 10;

                toast.loading(`⚡ Turbo Mode: Đã kích hoạt [Parallel: ${currentParallel} luồng]`, {
                    id: batchToastId,
                    description: `Đang nạp Rules & Glossary vào bộ nhớ đệm...`
                });
            } catch (err) {
                console.error("Failed to create cache:", err);
                // Fallback to non-cached translation
            }
        }

        // 3. Global Queue Integration
        let processedCount = 0;
        let chunkedCount = 0;
        let totalInputTokens = 0;
        let totalOutputTokens = 0;

        const processChapter = async (chapter: Chapter) => {
            const startTime = Date.now();
            const logId = `chap-${chapter.id}`;


            // Helper to parse tokens from message like "[1120i + 906o = 2026t]"
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

            const onLog = (log: TranslationLog | string) => {
                const msg = typeof log === 'string' ? log : log.message;
                const type = typeof log === 'string' ? 'info' : (log.type || 'info');

                // Parse metadata from message
                const tokens = parseTokens(msg);
                const turbo = msg.includes('🚀Turbo') || msg.includes('🚀');
                const chunksMatch = msg.match(/\((\d+) chunks\)/);
                const chunks = chunksMatch ? parseInt(chunksMatch[1]) : undefined;

                setBatchProgress(prev => {
                    const newLogs = [...prev.logs];
                    const existingIdx = newLogs.findIndex(l => l.id === logId);

                    const logEntry = {
                        id: logId,
                        message: msg,
                        type,
                        order: chapter.order,
                        tokens,
                        turbo,
                        chunks
                    };

                    if (existingIdx !== -1) {
                        newLogs[existingIdx] = logEntry;
                    } else {
                        newLogs.push(logEntry);
                    }

                    newLogs.sort((a, b) => b.order - a.order);

                    // Calculate aggregate stats
                    const totalTokens = newLogs.reduce((sum, l) => sum + (l.tokens?.total || 0), 0);
                    const totalCost = totalTokens * 0.30 / 1_000_000; // Simplified: assuming all output tokens
                    const cacheHits = newLogs.filter(l => l.turbo).length;
                    const chunksProcessed = newLogs.reduce((sum, l) => sum + (l.chunks || 0), 0);

                    return {
                        ...prev,
                        currentTitle: `[Chương ${chapter.order}] ${msg}`,
                        logs: newLogs.slice(0, 50),
                        totalTokens,
                        totalCost,
                        turboActive: turbo,
                        chunksProcessed,
                        cacheHits
                    };
                });
            };

            try {
                let finalPrompt = translateConfig.customPrompt || "";
                if (translateConfig.fixPunctuation) {
                    finalPrompt += "\n\n[QUAN TRỌNG] Văn bản gốc có thói quen ngắt dòng bằng dấu phẩy. Mày hãy tự động sửa lại hệ thống dấu câu sao cho đúng chuẩn văn học Việt Nam.";
                }

                const content_original = chapter.content_original || "";
                if (!content_original || content_original.trim().length === 0) {
                    throw new Error("Chương trống.");
                }

                let contentToTranslate = content_original;
                if (chapter.title && !content_original.startsWith(chapter.title)) {
                    contentToTranslate = `${chapter.title}\n\n${content_original}`;
                }

                const result = await translateWithChunking(
                    workspaceId,
                    contentToTranslate,
                    translateChapter,
                    onLog,
                    {
                        maxCharsPerChunk: translateConfig.chunkSize || 800,
                        maxConcurrent: translateConfig.maxConcurrentChunks || 3,
                        enabled: translateConfig.enableChunking
                    },
                    finalPrompt,
                    sharedGlossary,
                    activeCacheName // 🚀 Pass cache down
                );

                if (result.wasChunked) {
                    chunkedCount++;
                }

                const duration = Date.now() - startTime;
                let finalTitle = result.translatedTitle || "";
                const originalTitle = chapter.title || "";
                const chapterMatch = originalTitle.match(/(?:第|Chapter|Chương|Episode|Tiết|Quyển)\s*(\d+)/i);

                if (chapterMatch) {
                    const chapterNum = chapterMatch[1];
                    const chapterPrefix = `Chương ${chapterNum}`;
                    if (finalTitle && !finalTitle.includes(chapterNum)) {
                        finalTitle = `${chapterPrefix}: ${finalTitle}`;
                    } else if (!finalTitle) {
                        finalTitle = originalTitle.replace(/第\s*(\d+)\s*章/g, "Chương $1");
                    }
                } else if (!finalTitle) {
                    finalTitle = originalTitle;
                }

                await db.chapters.update(chapter.id!, {
                    content_translated: result.translatedText,
                    title_translated: finalTitle,
                    wordCountTranslated: result.translatedText.trim().split(/\s+/).length,
                    status: 'translated',
                    lastTranslatedAt: new Date(),
                    translationModel: currentSettings.model,
                    translationDurationMs: duration,
                    stats: result.stats
                });

                if (result.stats) {
                    totalUsedChars += result.stats.characters;
                    if (result.stats.tokens) {
                        totalInputTokens += result.stats.tokens.input;
                        totalOutputTokens += result.stats.tokens.output;
                    }
                }

                onLog({ timestamp: new Date(), message: `Hoàn tất (${(duration / 1000).toFixed(1)}s)`, type: 'success' });
            } catch (error: unknown) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                onLog({ timestamp: new Date(), message: `Lỗi: ${errorMsg}`, type: 'error' });
            } finally {
                processedCount++;

                // 📊 GOD-TIER DASHBOARD (GPT-5.2 Style)
                const elapsedTotal = (Date.now() - batchStartTime) / 1000;
                const speed = (processedCount / elapsedTotal) * 60;
                const remaining = chaptersToTranslate.length - processedCount;
                const etaSeconds = speed > 0 ? (remaining / (speed / 60)) : 0;

                const currentPercent = Math.round((processedCount / chaptersToTranslate.length) * 100);
                const turboTag = activeCacheName ? "⚡ TURBO" : "🛡️ STD";

                const savedTokens = activeCacheName ? (processedCount * 1200) : 0;
                const savingTag = savedTokens > 0 ? ` [💎 Save: ${(savedTokens / 1000).toFixed(1)}k]` : "";

                const etaText = remaining > 0
                    ? `ETA: ${Math.floor(etaSeconds / 60)}m ${Math.round(etaSeconds % 60)}s`
                    : "Finalizing...";

                toast.loading(`${turboTag} Progress: ${currentPercent}%${savingTag}`, {
                    id: batchToastId,
                    description: (
                        <div className="flex flex-col gap-1 mt-1 font-mono text-[10px] leading-tight opacity-90">
                            <div className="flex justify-between border-b border-white/10 pb-1 gap-4">
                                <span>🚀 Velocity: <span className="text-blue-400">{speed.toFixed(1)} ch/min</span></span>
                                <span className="text-amber-400 lowercase">{etaText}</span>
                            </div>
                            <div className="flex justify-between pt-0.5">
                                <span>📂 Done: {processedCount}/{chaptersToTranslate.length}</span>
                                <span className="text-emerald-400">Chars: {totalUsedChars.toLocaleString()}</span>
                            </div>
                        </div>
                    )
                });

                setBatchProgress(prev => ({ ...prev, current: processedCount }));
            }
        };

        try {
            const tasks = chaptersToTranslate.map(chapter => aiQueue.enqueue('MEDIUM', () => processChapter(chapter), `translate-chap-${chapter.id}`));
            await Promise.all(tasks);

            const currentWS = await db.workspaces.get(workspaceId);
            const allChaps = await db.chapters.where('workspaceId').equals(workspaceId).toArray();
            if (currentWS && allChaps.length > 0) {
                const { storage } = await import("@/lib/storageBridge");
                await storage.syncFullStory(workspaceId, currentWS.title, allChaps);
            }

            const totalBatchTime = ((Date.now() - batchStartTime) / 1000).toFixed(1);
            const cacheStatus = activeCacheName ? "⚡ Turbo" : "Standard";
            const chunkingInfo = chunkedCount > 0 ? ` | 📦 Chunked: ${chunkedCount}` : "";

            toast.success(`Hạ cánh an toàn: ${totalBatchTime}s [${cacheStatus}${chunkingInfo}]`, {
                id: batchToastId, // 🚀 Replace loading toast
                description: `Sử dụng ${totalUsedChars} ký tự. (${totalInputTokens}i + ${totalOutputTokens}o tokens)`,
                duration: 7000
            });
        } catch (fatalErr: unknown) {
            const errorMsg = fatalErr instanceof Error ? fatalErr.message : String(fatalErr);
            toast.error("Lỗi: " + errorMsg, { id: batchToastId });
        } finally {
            // 🗑️ Cleanup Turbo Cache
            if (activeCacheName) {
                deleteContextCache(activeCacheName).catch(console.error);
            }

            setIsTranslating(false);
            setBatchProgress({ current: 0, total: 0, currentTitle: "", logs: [] });
            onComplete?.();
        }
    }, [isTranslating]);

    return (
        <TranslationContext.Provider value={{ isTranslating, batchProgress, startBatchTranslate }}>
            {children}
        </TranslationContext.Provider>
    );
}

export const useTranslation = () => {
    const context = useContext(TranslationContext);
    if (context === undefined) {
        throw new Error("useTranslation must be used within a TranslationProvider");
    }
    return context;
};
