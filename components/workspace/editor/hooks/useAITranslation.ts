"use client";

import { useState } from "react";
import { db } from "@/lib/db";
import { translateChapter, TranslationLog } from "@/lib/gemini";

export function useAITranslation(workspaceId: string, chapterId: string) {
    const [isTranslating, setIsTranslating] = useState(false);
    const [statusOpen, setStatusOpen] = useState(false);
    const [logs, setLogs] = useState<TranslationLog[]>([]);

    const handleTranslate = async (content_original: string, onGenerated: (text: string) => void) => {
        if (!content_original) return;

        setIsTranslating(true);
        setStatusOpen(true);
        setLogs([]);

        const addLog = (log: TranslationLog) => {
            setLogs(prev => [...prev, log]);
        };

        // Fetch Custom Prompt & Punctuation Setting
        const customPrompt = await db.settings.get("lastCustomPrompt");
        const fixPunctuation = await db.settings.get("lastFixPunctuation");

        let finalPrompt = (customPrompt?.value as string) || "";

        if (fixPunctuation?.value as boolean) {
            finalPrompt += "\n\n[QUAN TRỌNG] Văn bản gốc có thói quen ngắt dòng bằng dấu phẩy. Mày hãy tự động sửa lại hệ thống dấu câu sao cho đúng chuẩn văn học Việt Nam. Chỗ nào ngắt ý hoàn chỉnh thì dùng dấu chấm, chỗ nào ý còn liên tục thì dùng dấu phẩy và KHÔNG viết hoa chữ cái tiếp theo (trừ tên riêng).";
        }

        try {
            const { aiQueue } = await import("@/lib/services/ai-queue");
            await aiQueue.enqueue('HIGH', async () => {
                // Fetch chapter for title
                const chapter = await db.chapters.get(parseInt(chapterId));
                let contentToTranslate = content_original;
                if (chapter?.title && !content_original.startsWith(chapter.title)) {
                    contentToTranslate = `${chapter.title}\n\n${content_original}`;
                }

                return translateChapter(
                    workspaceId,
                    contentToTranslate,
                    addLog,
                    (result) => {
                        const text = result.translatedText;
                        let title = result.translatedTitle || chapter?.title || "";

                        // preservation of chapter number
                        const chapterMatch = chapter?.title?.match(/(?:第|Chapter|Chương|Episode|Tiết|Quyển)\s*(\d+)/i);
                        if (chapterMatch && title && !title.includes(chapterMatch[1])) {
                            title = `Chương ${chapterMatch[1]}: ${title}`;
                        } else if (chapterMatch && !result.translatedTitle) {
                            title = title.replace(/第\s*(\d+)\s*章/g, "Chương $1").replace(/Chapter\s+(\d+)/i, "Chương $1");
                        }

                        onGenerated(text);
                        db.chapters.update(parseInt(chapterId), {
                            content_translated: text,
                            title_translated: title,
                            wordCountTranslated: text.length,
                            status: 'translated'
                        });
                    },
                    finalPrompt
                );
            }, `single-translate-${chapterId}`);
        } catch (error) {
            console.error("AI Translation failed:", error);
            // Optionally add an error log to the UI logs
            addLog({
                type: 'error',
                message: `Lỗi: ${error instanceof Error ? error.message : String(error)}`,
                timestamp: new Date()
            });
        } finally {
            setIsTranslating(false);
        }
    };

    return {
        isTranslating,
        statusOpen,
        setStatusOpen,
        logs,
        handleTranslate
    };
}
