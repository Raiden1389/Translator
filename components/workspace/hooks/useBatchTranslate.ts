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
        fixPunctuation?: boolean; // Added optional
    };
    onComplete?: () => void;
    onReviewNeeded?: (chars: GlossaryCharacter[], terms: GlossaryTerm[]) => void;
}

export function useBatchTranslate() {
    const [isTranslating, setIsTranslating] = useState(false);
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentTitle: "" });

    const handleBatchTranslate = async ({
        workspaceId,
        chapters, // passed from parent
        selectedChapters,
        currentSettings,
        translateConfig,
        onComplete,
        onReviewNeeded
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

        // User Configurable Concurrency
        // @ts-ignore
        const CONCURRENT_LIMIT = translateConfig.maxConcurrency || 5;

        const activePromises: Promise<void>[] = [];

        // Global variables for batch stats
        const allExtractedChars: GlossaryCharacter[] = [];
        const allExtractedTerms: GlossaryTerm[] = [];

        // Pre-fetch constants for the entire batch
        const [corrections, blacklist] = await Promise.all([
            db.corrections.where('workspaceId').equals(workspaceId).toArray(),
            db.blacklist.where('workspaceId').equals(workspaceId).toArray()
        ]);
        const blacklistSet = new Set(blacklist.map(b => b.word.toLowerCase()));

        const processChapter = async (chapter: Chapter) => {
            const startTime = Date.now();

            const onLog = (log: any) => {
                setBatchProgress(prev => ({ ...prev, currentTitle: typeof log === 'string' ? log : log.message }));
            };

            try {
                // 1. Start Translation and Extraction in parallel
                const translationPromise = new Promise<any>((resolve, reject) => {
                    // Logic Inject Prompt "Vua"
                    let finalPrompt = translateConfig.customPrompt || "";
                    if (translateConfig.fixPunctuation) {
                        finalPrompt += "\n\n[QUAN TRỌNG] Văn bản gốc có thói quen ngắt dòng bằng dấu phẩy. Mày hãy tự động sửa lại hệ thống dấu câu sao cho đúng chuẩn văn học Việt Nam. Chỗ nào ngắt ý hoàn chỉnh thì dùng dấu chấm, chỗ nào ý còn liên tục thì dùng dấu phẩy và KHÔNG viết hoa chữ cái tiếp theo (trừ tên riêng).";
                    }

                    // Dynamic Import to avoid circular dependency issues if any
                    const { translateWithChunking } = require("@/lib/gemini");

                    translateWithChunking(
                        workspaceId,
                        chapter.content_original,
                        translateChapter, // Pass the base translation function
                        onLog,
                        undefined, // onProgress
                        finalPrompt
                    ).then(resolve).catch(reject);
                });

                let extractionPromise: Promise<any> = Promise.resolve(null);
                if (translateConfig.autoExtract) {
                    const { extractGlossary } = require("@/lib/gemini");
                    extractionPromise = extractGlossary(chapter.content_original).catch((e: any) => {
                        console.warn("Background Extract Failed for chapter:", chapter.id, e);
                        return null;
                    });
                }

                // Wait for both to complete
                const [result, extractionResult] = await Promise.all([translationPromise, extractionPromise]);

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

                if (corrections.length > 0) {
                    for (const correction of corrections) {
                        finalContent = finalContent.split(correction.original).join(correction.replacement);
                        if (finalTitle) finalTitle = finalTitle.split(correction.original).join(correction.replacement);
                    }
                }

                // 2. SAVE RESULTS immediately
                await db.chapters.update(chapter.id!, {
                    content_translated: finalContent,
                    title_translated: finalTitle,
                    wordCountTranslated: finalContent.trim().split(/\s+/).length,
                    status: 'translated',
                    lastTranslatedAt: new Date(),
                    translationModel: currentSettings.model,
                    translationDurationMs: duration
                });

                // 3. Process extraction results for the final review
                if (extractionResult) {
                    // Collect chars
                    for (const char of extractionResult.characters) {
                        if (blacklistSet.has(char.original.toLowerCase())) continue;
                        allExtractedChars.push({ ...char, type: 'name' });
                    }
                    // Collect terms
                    for (const term of extractionResult.terms) {
                        if (blacklistSet.has(term.original.toLowerCase())) continue;
                        allExtractedTerms.push({ ...term, type: term.category || 'other' });
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

                // Reduced delay for higher throughput
                await new Promise(r => setTimeout(r, 50));
            }
            await Promise.all(activePromises);

            // Handle Extraction Review
            if (translateConfig.autoExtract && (allExtractedChars.length > 0 || allExtractedTerms.length > 0)) {
                // Deduplicate items by original text
                const uniqueChars = Array.from(new Map(allExtractedChars.map(item => [item.original.toLowerCase().trim(), item])).values());
                const uniqueTerms = Array.from(new Map(allExtractedTerms.map(item => [item.original.toLowerCase().trim(), item])).values());

                // Exclude existing dictionary items
                const dictionary = await db.dictionary.where('workspaceId').equals(workspaceId).toArray();
                const existingOriginals = new Set(dictionary.map(d => d.original.toLowerCase().trim()));

                const finalChars = uniqueChars.filter(c => !existingOriginals.has(c.original.toLowerCase().trim()));
                const finalTerms = uniqueTerms.filter(t => !existingOriginals.has(t.original.toLowerCase().trim()));

                if (finalChars.length > 0 || finalTerms.length > 0) {
                    onReviewNeeded?.(finalChars, finalTerms);
                }
            }

            const totalBatchTime = ((Date.now() - batchStartTime) / 1000).toFixed(1);
            toast.success(`Dịch hoàn tất ${processed} chương trong ${totalBatchTime}s`, {
                description: `Đã áp dụng ${totalUsedChars} lượt nhân vật và ${totalUsedTerms} thuật ngữ.`,
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
