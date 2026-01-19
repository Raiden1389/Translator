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
        // Starting batch translate

        const chaptersToTranslate = chapters?.filter(c => selectedChapters.includes(c.id!)) || [];
        // Found chapters to translate

        if (chaptersToTranslate.length === 0) {
            setIsTranslating(false);
            toast.error("Không có chương nào được chọn để dịch.");
            return;
        }

        let processed = 0;
        let totalDuration = 0;
        let totalNewTerms = 0;
        let totalNewChars = 0;
        let totalUsedTerms = 0;
        let totalUsedChars = 0;
        const batchStartTime = Date.now();
        setBatchProgress({ current: 0, total: chaptersToTranslate.length, currentTitle: "Khởi tạo..." });

        const CONCURRENT_LIMIT = 5;
        const accumulatedChars: GlossaryCharacter[] = [];

        const activePromises: Promise<void>[] = [];

        const processChapter = async (chapter: Chapter, corrections: any[], blacklistSet: Set<string>) => {
            const startTime = Date.now();
            // Processing chapter

            const onLog = (log: any) => {
                setBatchProgress(prev => ({ ...prev, currentTitle: typeof log === 'string' ? log : log.message }));
            };

            try {
                await new Promise<void>((resolve, reject) => {
                    translateChapter(
                        workspaceId,
                        chapter.content_original,
                        onLog,
                        async (result) => {
                            try {
                                const duration = Date.now() - startTime;
                                totalDuration += duration;

                                if (result.stats) {
                                    totalUsedTerms += result.stats.terms;
                                    totalUsedChars += result.stats.characters;
                                }

                                let newTitle = result.translatedTitle || chapter.title;
                                if (!result.translatedTitle && newTitle) {
                                    newTitle = newTitle.replace(/Chapter\s+(\d+)/i, "Chương $1")
                                        .replace(/第\s*(\d+)\s*章/, "Chương $1")
                                        .replace(/第\s*([0-9]+)\s*章/, "Chương $1");
                                }

                                // --- AUTO CORRECT ---
                                let finalContent = result.translatedText;
                                let finalTitle = newTitle;

                                if (corrections && corrections.length > 0) {
                                    for (const correction of corrections) {
                                        if (finalContent.includes(correction.original)) {
                                            finalContent = finalContent.replaceAll(correction.original, correction.replacement);
                                        }
                                        if (finalTitle && finalTitle.includes(correction.original)) {
                                            finalTitle = finalTitle.replaceAll(correction.original, correction.replacement);
                                        }
                                    }
                                }
                                // --------------------

                                // Updating DB for chapter
                                const updateResult = await db.chapters.update(chapter.id!, {
                                    content_translated: finalContent,
                                    title_translated: finalTitle,
                                    wordCountTranslated: finalContent.trim().split(/\s+/).length,
                                    status: 'translated',
                                    lastTranslatedAt: new Date(),
                                    translationModel: currentSettings.model,
                                    translationDurationMs: duration
                                });
                                // DB Update complete

                                resolve();
                            } catch (err) {
                                console.error(`Error in onSuccess for ${chapter.id}: `, err);
                                reject(err);
                            }
                        },
                        translateConfig.customPrompt
                    ).catch(err => {
                        console.error(`Error in translateChapter for ${chapter.id}: `, err);
                        reject(err);
                    });
                });

                if (translateConfig.autoExtract) {
                    try {
                        const { extractGlossary } = require("@/lib/gemini");
                        onLog({ message: "Đang trích xuất thuật ngữ..." });
                        const result = await extractGlossary(chapter.content_original);
                        if (result) {
                            for (const char of result.characters) {
                                if (blacklistSet.has(char.original.toLowerCase())) continue; // Skip bold blacklisted
                                if (!(await db.dictionary.where({ original: char.original, workspaceId }).first())) {
                                    await db.dictionary.add({ ...char, workspaceId, type: 'name', createdAt: new Date() });
                                    totalNewChars++;
                                }
                            }
                            for (const term of result.terms) {
                                if (blacklistSet.has(term.original.toLowerCase())) continue; // Skip bold blacklisted
                                if (!(await db.dictionary.where({ original: term.original, workspaceId }).first())) {
                                    await db.dictionary.add({ ...term, workspaceId, type: term.type as any, createdAt: new Date() });
                                    totalNewTerms++;
                                }
                            }
                        }
                    } catch (e) {
                        console.error("Auto extract failed", e);
                    }
                }
            } catch (e: any) {
                console.error(`Failed to process chapter ${chapter.id}: `, e);
                toast.error(`Lỗi chương ${chapter.title}: ${e.message} `);
            } finally {
                processed++;
                setBatchProgress(prev => ({ ...prev, current: processed }));
            }
        };

        // Fetch all corrections once before starting the batch to avoid repeated DB hits
        const corrections = await db.corrections.where('workspaceId').equals(workspaceId).toArray();

        // 2. Fetch all Blacklist entries to exclude from "Auto Extract" logic if needed
        const blacklist = await db.blacklist.where('workspaceId').equals(workspaceId).toArray();
        const blacklistSet = new Set(blacklist.map(b => b.word.toLowerCase()));

        try {
            for (const chapter of chaptersToTranslate) {
                const p = processChapter(chapter, corrections, blacklistSet);
                activePromises.push(p);

                // Cleanup when done
                p.then(() => {
                    activePromises.splice(activePromises.indexOf(p), 1);
                });

                if (activePromises.length >= CONCURRENT_LIMIT) {
                    await Promise.race(activePromises);
                }
            }
            await Promise.all(activePromises);

            const totalBatchTime = ((Date.now() - batchStartTime) / 1000).toFixed(1);
            toast.success(`Dịch hoàn tất ${processed} chương trong ${totalBatchTime} s`, {
                description: `Sử dụng ${totalUsedChars} nhân vật và ${totalUsedTerms} thuật ngữ từ từ điển.`,
                duration: 10000
            });
        } catch (fatalErr: any) {
            console.error("Fatal error in batch translation:", fatalErr);
            toast.error("Lỗi nghiêm trọng trong quá trình dịch: " + fatalErr.message);
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
