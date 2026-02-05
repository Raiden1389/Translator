import { useState } from "react";
import { db, DictionaryEntry } from "@/lib/db";
import { ExtractedCharacter, ExtractedTerm } from "@/lib/gemini/types";
import { toast } from "sonner";
import { extractEntities, EntityType } from "@/lib/services/ai-ner.service";

/**
 * AI Extraction Hook - Uses Gemini AI for Named Entity Recognition
 * Independent from legacy Name Hunter system
 */
export function useAIExtraction(workspaceId: string, dictEntries: DictionaryEntry[]) {
    const [isAIExtracting, setIsAIExtracting] = useState(false);
    const [pendingCharacters, setPendingCharacters] = useState<ExtractedCharacter[]>([]);
    const [pendingTerms, setPendingTerms] = useState<ExtractedTerm[]>([]);
    const [isReviewOpen, setIsReviewOpen] = useState(false);

    const handleAIExtractChapter = async (content_original: string, allowedTypes?: string[]) => {
        if (!content_original) return;
        setIsAIExtracting(true);
        const toastId = "ai-extract-progress";

        try {
            toast.loading("Đang khởi tạo AI NER...", { id: toastId });

            // Convert string types to EntityType enum
            const typesToScan: EntityType[] = allowedTypes
                ? allowedTypes.map(t => t as EntityType)
                : [EntityType.Person, EntityType.Location, EntityType.Organization, EntityType.Skill];

            const rawResults = await extractEntities(content_original, {
                allowedTypes: typesToScan,
                onProgress: (msg: string) => toast.loading(msg, { id: toastId })
            });

            if (rawResults.length > 0) {
                const existingOriginals = new Set(dictEntries?.map(d => d.original) || []);

                // Split and FILTER rawResults (Remove existing entries)
                const newCharacters: ExtractedCharacter[] = rawResults
                    .filter(e => e.type === EntityType.Person && !existingOriginals.has(e.chinese || e.original))
                    .map(e => ({
                        original: e.chinese || e.original,
                        translated: e.original,
                        type: 'name',
                        gender: 'unknown',
                        role: 'mob',
                        description: e.context || 'Nhân vật mới',
                        isExisting: false
                    }));

                const newTerms: ExtractedTerm[] = rawResults
                    .filter(e => e.type !== EntityType.Person && !existingOriginals.has(e.chinese || e.original))
                    .map(e => ({
                        original: e.chinese || e.original,
                        translated: e.original,
                        type: e.type === EntityType.Location ? 'location' :
                            e.type === EntityType.Organization ? 'organization' :
                                e.type === EntityType.Skill ? 'skill' : 'other',
                        description: e.context || 'Thuật ngữ mới',
                        isExisting: false
                    }));

                const totalNew = newCharacters.length + newTerms.length;
                const skipped = rawResults.length - totalNew;

                if (totalNew > 0) {
                    setPendingCharacters(newCharacters);
                    setPendingTerms(newTerms);
                    setIsReviewOpen(true);
                    toast.success(`Đã quét xong! Tìm thấy ${totalNew} thực thể mới${skipped > 0 ? ` (đã ẩn ${skipped} từ cũ)` : ""}.`, { id: toastId });
                } else {
                    toast.info(`Không tìm thấy thực thể mới nào (đã bỏ qua ${skipped} từ đã có trong từ điển).`, { id: toastId });
                }
            } else {
                toast.info("Không tìm thấy thực thể mới nào.", { id: toastId });
            }
        } catch (e: unknown) {
            console.error(e);
            const msg = e instanceof Error ? e.message : String(e);
            toast.error("Lỗi khi quét AI: " + msg, { id: toastId });
        } finally {
            setIsAIExtracting(false);
        }
    };

    const handleConfirmSaveAI = async (
        saveChars: ExtractedCharacter[],
        saveTerms: ExtractedTerm[],
        blacklistChars: ExtractedCharacter[] = [],
        blacklistTerms: ExtractedTerm[] = []
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

            // Handle blacklist items
            for (const char of blacklistChars) {
                await db.blacklist.add({
                    workspaceId,
                    word: char.original,
                    translated: char.translated,
                    source: 'manual',
                    createdAt: new Date()
                });
            }

            for (const term of blacklistTerms) {
                await db.blacklist.add({
                    workspaceId,
                    word: term.original,
                    translated: term.translated,
                    source: 'manual',
                    createdAt: new Date()
                });
            }

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
