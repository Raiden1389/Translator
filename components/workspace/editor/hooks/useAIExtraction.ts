import { useState } from "react";
import { db, DictionaryEntry } from "@/lib/db";
import { extractGlossary } from "@/lib/gemini";
import { ExtractedCharacter, ExtractedTerm } from "@/lib/gemini/types";
import { toast } from "sonner";

export function useAIExtraction(workspaceId: string, dictEntries: DictionaryEntry[]) {
    const [isAIExtracting, setIsAIExtracting] = useState(false);
    const [pendingCharacters, setPendingCharacters] = useState<ExtractedCharacter[]>([]);
    const [pendingTerms, setPendingTerms] = useState<ExtractedTerm[]>([]);
    const [isReviewOpen, setIsReviewOpen] = useState(false);

    const handleAIExtractChapter = async (content_original: string) => {
        if (!content_original) return;
        setIsAIExtracting(true);
        try {
            toast.info("Đang quét chương này...");
            const result = await extractGlossary(content_original);
            if (result) {
                const existingOriginals = new Set(dictEntries?.map(d => d.original) || []);
                const newChars = (result.characters || []).map((c: ExtractedCharacter) => ({
                    ...c,
                    isExisting: existingOriginals.has(c.original)
                }));
                const newTerms = (result.terms || []).map((t: ExtractedTerm) => ({
                    ...t,
                    isExisting: existingOriginals.has(t.original)
                }));
                setPendingCharacters(newChars);
                setPendingTerms(newTerms);
                setIsReviewOpen(true);
            }
        } catch (e: any) {
            console.error(e);
            toast.error("Lỗi khi quét AI: " + e.message);
        } finally {
            setIsAIExtracting(false);
        }
    };

    const handleConfirmSaveAI = async (
        saveChars: ExtractedCharacter[],
        saveTerms: ExtractedTerm[],
        blacklistChars: ExtractedCharacter[],
        blacklistTerms: ExtractedTerm[]
    ) => {
        try {
            let addedCount = 0;
            let updatedCount = 0;

            // Handle characters to save
            for (const char of saveChars) {
                const existing = await db.dictionary
                    .where("[workspaceId+original]")
                    .equals([workspaceId, char.original])
                    .first();

                if (existing) {
                    await db.dictionary.update(existing.id!, {
                        translated: char.translated,
                        gender: char.gender as "male" | "female" | "unknown",
                        description: char.description
                    });
                    updatedCount++;
                } else {
                    await db.dictionary.add({
                        workspaceId,
                        original: char.original,
                        translated: char.translated,
                        type: 'name',
                        gender: char.gender as "male" | "female" | "unknown",
                        description: char.description,
                        createdAt: new Date()
                    });
                    addedCount++;
                }
            }

            // Handle terms to save
            for (const term of saveTerms) {
                const existing = await db.dictionary
                    .where("[workspaceId+original]")
                    .equals([workspaceId, term.original])
                    .first();

                if (existing) {
                    await db.dictionary.update(existing.id!, {
                        translated: term.translated,
                        type: term.type as string
                    });
                    updatedCount++;
                } else {
                    await db.dictionary.add({
                        workspaceId,
                        original: term.original,
                        translated: term.translated,
                        type: term.type as string,
                        createdAt: new Date()
                    });
                    addedCount++;
                }
            }

            // TODO: Implement blacklist logic if needed
            // For now we just acknowledge they were processed
            const totalItems = addedCount + updatedCount;
            const blacklistCount = blacklistChars.length + blacklistTerms.length;

            toast.success(`Đã xử lý ${totalItems + blacklistCount} mục! (Đã lưu: ${totalItems}, Chặn: ${blacklistCount})`);
            setIsReviewOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi lưu kết quả");
        }
    };

    return {
        isAIExtracting,
        pendingCharacters,
        pendingTerms,
        isReviewOpen,
        setIsReviewOpen,
        handleAIExtractChapter,
        handleConfirmSaveAI
    };
}
