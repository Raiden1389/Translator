"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { db, cleanupCache } from "@/lib/db";
import { toast } from "sonner";
import { TranslationSettings } from "@/lib/types";
import {
    translateChapter,
    translateWithChunking,
    TranslationLog
} from "@/lib/gemini";
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
        maxConcurrentChunks: number;
        chunkSize?: number;
    };
    onComplete?: () => void;
}

interface TranslationProgress {
    current: number;
    total: number;
    currentTitle: string;
    logs: { id: string, message: string, type: 'info' | 'success' | 'error', order: number }[];
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

    // Auto cleanup cache on mount
    useEffect(() => {
        cleanupCache();
    }, []);

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
            logs: []
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

        // 2. Global Queue Integration
        let processedCount = 0;
        let totalInputTokens = 0;
        let totalOutputTokens = 0;

        const processChapter = async (chapter: Chapter) => {
            const startTime = Date.now();
            const logId = `chap-${chapter.id}`;

            const onLog = (log: TranslationLog | string) => {
                const msg = typeof log === 'string' ? log : log.message;
                const type = typeof log === 'string' ? 'info' : (log.type || 'info');

                setBatchProgress(prev => {
                    const newLogs = [...prev.logs];
                    const existingIdx = newLogs.findIndex(l => l.id === logId);

                    if (existingIdx !== -1) {
                        newLogs[existingIdx] = { ...newLogs[existingIdx], message: msg, type };
                    } else {
                        newLogs.push({ id: logId, message: msg, type, order: chapter.order });
                    }

                    newLogs.sort((a, b) => b.order - a.order);

                    return {
                        ...prev,
                        currentTitle: `[Chương ${chapter.order}] ${msg}`,
                        logs: newLogs.slice(0, 50)
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
                    sharedGlossary
                );

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
            toast.success(`Dịch hoàn tất trong ${totalBatchTime}s`, {
                description: `Sử dụng ${totalUsedChars} ký tự. (${totalInputTokens}i + ${totalOutputTokens}o tokens)`,
                duration: 5000
            });
        } catch (fatalErr: unknown) {
            const errorMsg = fatalErr instanceof Error ? fatalErr.message : String(fatalErr);
            toast.error("Lỗi: " + errorMsg);
        } finally {
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
