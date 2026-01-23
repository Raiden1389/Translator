"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

import { db, cleanupCache } from "@/lib/db";
import { toast } from "sonner";
import { TranslationSettings } from "@/lib/types";
import { translateChapter, translateWithChunking, TranslationLog, TranslationResult } from "@/lib/gemini";
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
}

interface TranslationContextType {
    isTranslating: boolean;
    batchProgress: TranslationProgress;
    startBatchTranslate: (props: BatchTranslateProps) => Promise<void>;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: React.ReactNode }) {
    const [isTranslating, setIsTranslating] = useState(false);
    const [batchProgress, setBatchProgress] = useState<TranslationProgress>({ current: 0, total: 0, currentTitle: "" });

    // Auto cleanup cache on mount
    React.useEffect(() => {
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
        const chaptersToTranslate = chapters?.filter(c => selectedChapters.includes(c.id!)) || [];

        if (chaptersToTranslate.length === 0) {
            setIsTranslating(false);
            toast.error("Không có chương nào được chọn để dịch.");
            return;
        }

        let processed = 0;
        let totalUsedTerms = 0;
        let totalUsedChars = 0;
        const batchStartTime = Date.now();
        setBatchProgress({ current: 0, total: chaptersToTranslate.length, currentTitle: "Khởi tạo..." });

        // Limit to 1-2 chapters at a time to prevent API saturation and UI lag
        const CONCURRENT_LIMIT = Math.min(translateConfig.maxConcurrency || 2, 2);
        const activePromises: Promise<void>[] = [];


        const processChapter = async (chapter: Chapter) => {
            const startTime = Date.now();
            const onLog = (log: TranslationLog | string) => {
                setBatchProgress(prev => ({ ...prev, currentTitle: typeof log === 'string' ? log : log.message }));
            };

            try {
                const translationPromise = new Promise<TranslationResult>((resolve, reject) => {
                    let finalPrompt = translateConfig.customPrompt || "";
                    if (translateConfig.fixPunctuation) {
                        finalPrompt += "\n\n[QUAN TRỌNG] Văn bản gốc có thói quen ngắt dòng bằng dấu phẩy. Mày hãy tự động sửa lại hệ thống dấu câu sao cho đúng chuẩn văn học Việt Nam. Chỗ nào ngắt ý hoàn chỉnh thì dùng dấu chấm, chỗ nào ý còn liên tục thì dùng dấu phẩy và KHÔNG viết hoa chữ cái tiếp theo (trừ tên riêng).";
                    }

                    translateWithChunking(
                        workspaceId,
                        chapter.content_original,
                        translateChapter,
                        onLog,
                        {
                            maxCharsPerChunk: translateConfig.chunkSize || 800,
                            maxConcurrent: translateConfig.maxConcurrentChunks || 3,
                            enabled: translateConfig.enableChunking
                        },
                        finalPrompt
                    ).then(resolve).catch(reject);
                });

                const result = await translationPromise;
                const duration = Date.now() - startTime;

                let finalTitle = result.translatedTitle || chapter.title || "";
                if (!result.translatedTitle && finalTitle) {
                    finalTitle = finalTitle.replace(/Chapter\s+(\d+)/i, "Chương $1")
                        .replace(/第\s*(\d+)\s*章/, "Chương $1")
                        .replace(/第\s*([0-9]+)\s*章/, "Chương $1");
                }

                await db.chapters.update(chapter.id!, {
                    content_translated: result.translatedText,
                    title_translated: finalTitle,
                    wordCountTranslated: result.translatedText.trim().split(/\s+/).length,
                    status: 'translated',
                    lastTranslatedAt: new Date(),
                    translationModel: currentSettings.model,
                    translationDurationMs: duration
                });

                if (result.stats) {
                    totalUsedTerms += result.stats.terms;
                    totalUsedChars += result.stats.characters;
                }

                // Auto Extract results are no longer processed to save time and prevent UI lag
            } catch (error: unknown) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                console.error(`Failed to process chapter ${chapter.id}: `, error);
                toast.error(`Lỗi chương ${chapter.title}: ${errorMsg}`);
            } finally {
                processed++;
                setBatchProgress(prev => ({ ...prev, current: processed }));
            }
        };

        try {
            for (const chapter of chaptersToTranslate) {
                const p = processChapter(chapter);
                activePromises.push(p);
                p.finally(() => {
                    activePromises.splice(activePromises.indexOf(p), 1);
                });
                if (activePromises.length >= CONCURRENT_LIMIT) {
                    await Promise.race(activePromises);
                }
                await new Promise(r => setTimeout(r, 50));
            }
            await Promise.all(activePromises);


            const totalBatchTime = ((Date.now() - batchStartTime) / 1000).toFixed(1);
            toast.success(`Dịch hoàn tất ${processed} chương trong ${totalBatchTime}s`, {
                description: `Đã áp dụng ${totalUsedChars} lượt nhân vật và ${totalUsedTerms} thuật ngữ.`,
                duration: 5000
            });
        } catch (fatalErr: unknown) {
            const errorMsg = fatalErr instanceof Error ? fatalErr.message : String(fatalErr);
            console.error("Fatal error in batch translation:", fatalErr);
            toast.error("Lỗi nghiêm trọng: " + errorMsg);
        } finally {
            setIsTranslating(false);
            setBatchProgress({ current: 0, total: 0, currentTitle: "" });
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
