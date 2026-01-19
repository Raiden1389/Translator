import { useState } from "react";
import { db } from "@/lib/db";
import { translateChapter } from "@/lib/gemini";
import { toast } from "sonner";
import { GlossaryCharacter, GlossaryTerm, TranslationConfig, TranslationSettings, LogCallback } from "@/lib/types";
import type { Chapter } from "@/lib/db";

interface BatchTranslateProps {
    workspaceId: string; // Added
    chapters: Chapter[];
    selectedChapters: number[];
    currentSettings: { apiKey: string, model: string };
    translateConfig: {
        customPrompt: string;
        autoExtract: boolean;
    };
    onComplete?: () => void;
    onReviewNeeded?: (chars: GlossaryCharacter[], terms: GlossaryTerm[]) => void;
}

export function useBatchTranslate() {
    const [isTranslating, setIsTranslating] = useState(false);
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentTitle: "" });

    const handleBatchTranslate = async ({
        workspaceId,
        chapters,
        selectedChapters,
        currentSettings,
        translateConfig,
        onComplete
    }: BatchTranslateProps) => {
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

        // Reduce concurrency slightly for better stability on free tier keys
        const CONCURRENT_LIMIT = 3;
        const activePromises: Promise<void>[] = [];

        // Global variables for batch stats
        let totalNewTerms = 0;
        let totalNewChars = 0;

        // Pre-fetch constants for the entire batch
        const corrections = await db.corrections.where('workspaceId').equals(workspaceId).toArray();
        const blacklist = await db.blacklist.where('workspaceId').equals(workspaceId).toArray();
        const blacklistSet = new Set(blacklist.map(b => b.word.toLowerCase()));

        const processChapter = async (chapter: Chapter) => {
            const startTime = Date.now();

            const onLog = (log: any) => {
                setBatchProgress(prev => ({ ...prev, currentTitle: typeof log === 'string' ? log : log.message }));
            };

            try {
                // Wrap in a promise to handle the old-style callbacks if needed, 
                // but we should ideally move to async/await fully.
                const result = await new Promise<any>((resolve, reject) => {
                    translateChapter(
                        workspaceId,
                        chapter.content_original,
                        onLog,
                        (res) => resolve(res),
                        translateConfig.customPrompt
                    ).catch(reject);
                });

                const duration = Date.now() - startTime;
                if (result.stats) {
                    totalUsedTerms += result.stats.terms;
                    totalUsedChars += result.stats.characters;
                }

                let finalTitle = result.translatedTitle || chapter.title;
                if (!result.translatedTitle && finalTitle) {
                    finalTitle = finalTitle.replace(/Chapter\s+(\d+)/i, "Chương $1")
                        .replace(/第\s*(\d+)\s*章/, "Chương $1")
                        .replace(/第\s*([0-9]+)\s*章/, "Chương $1");
                }

                let finalContent = result.translatedText;

                // Apply batch-cached corrections
                if (corrections.length > 0) {
                    for (const correction of corrections) {
                        finalContent = finalContent.split(correction.original).join(correction.replacement);
                        if (finalTitle) finalTitle = finalTitle.split(correction.original).join(correction.replacement);
                    }
                }

                await db.chapters.update(chapter.id!, {
                    content_translated: finalContent,
                    title_translated: finalTitle,
                    wordCountTranslated: finalContent.trim().split(/\s+/).length,
                    status: 'translated',
                    lastTranslatedAt: new Date(),
                    translationModel: currentSettings.model,
                    translationDurationMs: duration
                });

                if (translateConfig.autoExtract) {
                    try {
                        const { extractGlossary } = require("@/lib/gemini");
                        const extractionResult = await extractGlossary(chapter.content_original);
                        if (extractionResult) {
                            // Bulk check/add could be better, but let's keep it simple for now
                            for (const char of extractionResult.characters) {
                                if (blacklistSet.has(char.original.toLowerCase())) continue;
                                const exists = await db.dictionary.where({ original: char.original, workspaceId }).first();
                                if (!exists) {
                                    await db.dictionary.add({ ...char, workspaceId, type: 'name', createdAt: new Date() });
                                    totalNewChars++;
                                }
                            }
                            for (const term of extractionResult.terms) {
                                if (blacklistSet.has(term.original.toLowerCase())) continue;
                                const exists = await db.dictionary.where({ original: term.original, workspaceId }).first();
                                if (!exists) {
                                    await db.dictionary.add({ ...term, workspaceId, type: term.category || 'other', createdAt: new Date() });
                                    totalNewTerms++;
                                }
                            }
                        }
                    } catch (e) {
                        console.warn("Auto extract failed for chapter", chapter.id, e);
                    }
                }
            } catch (e: any) {
                console.error(`Failed to process chapter ${chapter.id}: `, e);
                toast.error(`Lỗi chương ${chapter.title}: ${e.message}`);
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

                // Slight delay between starting new requests to avoid instant burst rate limits
                await new Promise(r => setTimeout(r, 200));
            }
            await Promise.all(activePromises);

            const totalBatchTime = ((Date.now() - batchStartTime) / 1000).toFixed(1);
            toast.success(`Dịch hoàn tất ${processed} chương trong ${totalBatchTime}s`, {
                description: `Đã áp dụng ${totalUsedChars} lượt nhân vật và ${totalUsedTerms} thuật ngữ. Tìm thấy ${totalNewChars} thực thể mới.`,
                duration: 5000
            });
        } catch (fatalErr: any) {
            console.error("Fatal error in batch translation:", fatalErr);
            toast.error("Lỗi nghiêm trọng: " + fatalErr.message);
        } finally {
            setIsTranslating(false);
            setBatchProgress(prev => ({ ...prev, currentTitle: "Hoàn tất" }));
            onComplete?.();
        }
    };

    return {
        isTranslating,
        batchProgress,
        handleBatchTranslate
    };
}
