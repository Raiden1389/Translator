import { useState, useCallback } from "react";
import { extractGlossary, categorizeTerms } from "@/lib/gemini";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { GlossaryCharacter, GlossaryTerm, GlossaryResult } from "@/lib/types";

export function useDictionaryAI(workspaceId: string) {
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractDialogOpen, setExtractDialogOpen] = useState(false);
    const [pendingCharacters, setPendingCharacters] = useState<GlossaryCharacter[]>([]);
    const [pendingTerms, setPendingTerms] = useState<GlossaryTerm[]>([]);
    const [isReviewOpen, setIsReviewOpen] = useState(false);

    const handleAIExtract = useCallback(async (source: "latest" | "current" | "select", dictionary: any[]) => {
        if (!workspaceId) return;
        setIsExtracting(true);
        try {
            const chapters = await db.chapters.where("workspaceId").equals(workspaceId).toArray();
            if (chapters.length === 0) {
                toast.warning("Chưa có chương nào để phân tích!");
                setIsExtracting(false);
                return;
            }

            let targetChapter: any;
            if (source === "latest") {
                chapters.sort((a, b) => b.order - a.order);
                targetChapter = chapters[0];
            } else if (source === "current") {
                chapters.sort((a, b) => b.id! - a.id!);
                targetChapter = chapters[0];
            }

            if (!targetChapter) {
                toast.error("Không tìm thấy chương để quét.");
                setIsExtracting(false);
                return;
            }

            toast.info(`Đang quét: ${targetChapter.title}...`);
            const result: GlossaryResult | null = await extractGlossary(targetChapter.content_original);

            if (result) {
                const existingOriginals = new Set(dictionary.map(d => d.original));

                const newChars: GlossaryCharacter[] = result.characters.map((c) => ({
                    ...c,
                    isExisting: existingOriginals.has(c.original)
                }));

                const newTerms: GlossaryTerm[] = result.terms.map((t) => ({
                    ...t,
                    isExisting: existingOriginals.has(t.original)
                }));

                setPendingCharacters(newChars);
                setPendingTerms(newTerms);
                setIsReviewOpen(true);

                if (targetChapter?.id) {
                    await db.chapters.update(targetChapter.id, {
                        glossaryExtractedAt: new Date()
                    });
                    toast.success(`Đã đánh dấu chương "${targetChapter.title}" là đã quét thuật ngữ.`);
                }
            } else {
                toast.info("AI không trả về kết quả nào.");
            }
        } catch (e: any) {
            console.error("Extraction error", e);
            // Better error handling
            if (e.message?.includes('network')) {
                toast.error("Lỗi mạng. Kiểm tra kết nối internet.");
            } else if (e.message?.includes('quota')) {
                toast.error("Hết quota API. Đợi hoặc đổi API key.");
            } else {
                toast.error(`Lỗi: ${e.message || 'Unknown error'}`);
            }
        } finally {
            setIsExtracting(false);
            setExtractDialogOpen(false);
        }
    }, [workspaceId]);

    const handleBulkAICategorize = useCallback(async (selectedEntries: number[]) => {
        if (!selectedEntries.length) return;
        setIsExtracting(true);
        try {
            const entries = await db.dictionary.where('id').anyOf(selectedEntries).toArray();
            const terms = entries.map(e => e.original);

            const chunkSize = 50;
            for (let i = 0; i < terms.length; i += chunkSize) {
                const chunk = terms.slice(i, i + chunkSize);
                const results = await categorizeTerms(chunk);

                for (const res of results) {
                    if (res.category === 'trash') {
                        const entry = await db.dictionary.where({ original: res.original, workspaceId }).first();
                        await db.blacklist.add({
                            workspaceId,
                            word: res.original,
                            translated: entry?.translated || res.original,
                            source: 'ai',
                            createdAt: new Date()
                        });
                        await db.dictionary.where({ original: res.original, workspaceId }).delete();
                    } else {
                        await db.dictionary.where({ original: res.original, workspaceId }).modify({ type: res.category as any });
                    }
                }
            }
        } catch (error: any) {
            console.error(error);
            if (error.message?.includes('network')) {
                toast.error("Lỗi mạng. Kiểm tra kết nối.");
            } else {
                toast.error("Lỗi AI phân loại");
            }
        } finally {
            setIsExtracting(false);
        }
    }, [workspaceId]);

    const handleConfirmSave = useCallback(async (
        saveChars: GlossaryCharacter[],
        saveTerms: GlossaryTerm[],
        blacklistChars: GlossaryCharacter[],
        blacklistTerms: GlossaryTerm[]
    ) => {
        let addedCount = 0;
        let updatedCount = 0;
        let blacklistCount = 0;

        try {
            for (const char of saveChars) {
                const existing = await db.dictionary.where({ original: char.original, workspaceId }).first();
                if (existing) {
                    await db.dictionary.update(existing.id!, {
                        translated: char.translated,
                        type: char.type || 'name',
                        description: char.description,
                        createdAt: new Date()
                    });
                    updatedCount++;
                } else {
                    await db.dictionary.add({
                        workspaceId,
                        original: char.original,
                        translated: char.translated,
                        type: char.type || 'name',
                        description: char.description,
                        createdAt: new Date()
                    });
                    addedCount++;
                }
            }

            for (const term of saveTerms) {
                const existing = await db.dictionary.where({ original: term.original, workspaceId }).first();
                if (existing) {
                    await db.dictionary.update(existing.id!, {
                        translated: term.translated,
                        type: term.type || 'general',
                        description: term.description,
                        createdAt: new Date()
                    });
                    updatedCount++;
                } else {
                    await db.dictionary.add({
                        workspaceId,
                        original: term.original,
                        translated: term.translated,
                        type: term.type || 'general',
                        description: term.description,
                        createdAt: new Date()
                    });
                    addedCount++;
                }
            }

            for (const char of blacklistChars) {
                await db.blacklist.add({
                    workspaceId,
                    word: char.original,
                    translated: char.translated || char.original,
                    source: 'ai',
                    createdAt: new Date()
                });
                blacklistCount++;
            }

            for (const term of blacklistTerms) {
                await db.blacklist.add({
                    workspaceId,
                    word: term.original,
                    translated: term.translated || term.original,
                    source: 'ai',
                    createdAt: new Date()
                });
                blacklistCount++;
            }

            toast.success(`Đã lưu: ${addedCount} mới, ${updatedCount} cập nhật, ${blacklistCount} blacklist.`);
            setIsReviewOpen(false);
            setPendingCharacters([]);
            setPendingTerms([]);
        } catch (e) {
            console.error(e);
            toast.error("Lỗi khi lưu dữ liệu.");
        }
    }, [workspaceId]);

    return {
        isExtracting,
        extractDialogOpen,
        setExtractDialogOpen,
        pendingCharacters,
        pendingTerms,
        isReviewOpen,
        setIsReviewOpen,
        handleAIExtract,
        handleBulkAICategorize,
        handleConfirmSave,
    };
}
