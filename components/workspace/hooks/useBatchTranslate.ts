import { useState } from "react";
import { db } from "@/lib/db";
import { translateChapter } from "@/lib/gemini";
import { toast } from "sonner";

interface BatchTranslateProps {
    chapters: any[];
    selectedChapters: number[];
    currentSettings: { apiKey: string, model: string };
    translateConfig: {
        customPrompt: string;
        autoExtract: boolean;
    };
    onComplete?: () => void;
    onReviewNeeded?: (chars: any[], terms: any[]) => void;
}

export function useBatchTranslate() {
    const [isTranslating, setIsTranslating] = useState(false);
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentTitle: "" });

    const handleBatchTranslate = async ({
        chapters,
        selectedChapters,
        currentSettings,
        translateConfig,
        onComplete
    }: BatchTranslateProps) => {
        setIsTranslating(true);
        console.log("Starting batch translate with selected IDs:", selectedChapters);

        const chaptersToTranslate = chapters?.filter(c => selectedChapters.includes(c.id!)) || [];
        console.log(`Found ${chaptersToTranslate.length} chapters to translate.`);

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

        const CONCURRENT_LIMIT = 3;
        const accumulatedChars: any[] = [];

        const activePromises: Promise<void>[] = [];

        const processChapter = async (chapter: any) => {
            const startTime = Date.now();
            console.log(`Processing chapter ${chapter.id}: ${chapter.title}`);

            const onLog = (log: any) => {
                setBatchProgress(prev => ({ ...prev, currentTitle: log.message }));
            };

            try {
                await new Promise<void>((resolve, reject) => {
                    translateChapter(
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

                                console.log(`Updating DB for chapter ${chapter.id}...`);
                                const updateResult = await db.chapters.update(chapter.id!, {
                                    content_translated: result.translatedText,
                                    title_translated: newTitle,
                                    wordCountTranslated: result.translatedText.trim().split(/\s+/).length,
                                    status: 'translated',
                                    lastTranslatedAt: new Date(),
                                    translationModel: currentSettings.model,
                                    translationDurationMs: duration
                                });
                                console.log(`DB Update result for ${chapter.id}: ${updateResult}`);

                                resolve();
                            } catch (err) {
                                console.error(`Error in onSuccess for ${chapter.id}:`, err);
                                reject(err);
                            }
                        },
                        translateConfig.customPrompt
                    ).catch(err => {
                        console.error(`Error in translateChapter for ${chapter.id}:`, err);
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
                                if (!(await db.dictionary.where("original").equals(char.original).first())) {
                                    await db.dictionary.add({ ...char, type: 'name', createdAt: new Date() });
                                    totalNewChars++;
                                }
                            }
                            for (const term of result.terms) {
                                if (!(await db.dictionary.where("original").equals(term.original).first())) {
                                    await db.dictionary.add({ ...term, type: term.type as any, createdAt: new Date() });
                                    totalNewTerms++;
                                }
                            }
                        }
                    } catch (e) {
                        console.error("Auto extract failed", e);
                    }
                }
            } catch (e: any) {
                console.error(`Failed to process chapter ${chapter.id}:`, e);
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
                p.then(() => activePromises.splice(activePromises.indexOf(p), 1));
                if (activePromises.length >= CONCURRENT_LIMIT) {
                    await Promise.race(activePromises);
                }
            }
            await Promise.all(activePromises);

            const totalBatchTime = ((Date.now() - batchStartTime) / 1000).toFixed(1);
            toast.success(`Dịch hoàn tất ${processed} chương trong ${totalBatchTime}s`, {
                description: `Sử dụng ${totalUsedChars} nhân vật và ${totalUsedTerms} thuật ngữ từ từ điển.`
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
