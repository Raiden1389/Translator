"use client";

import { useState, useCallback } from "react";
import { db, CorrectionEntry, Chapter } from "@/lib/db";
import { toast } from "sonner";

interface UseCorrectionsProps {
    chapterId: number;
    chapter: Chapter | undefined;
    editContent: string;
    setEditContent: (content: string) => void;
    onActionStart: () => void;
}

/**
 * Hook for managing corrections (Bulk Replace/Regex) and dictionary entries.
 */
export function useCorrections({
    chapterId,
    chapter,
    editContent,
    setEditContent,
    onActionStart
}: UseCorrectionsProps) {
    // Correction State
    const [correctionOpen, setCorrectionOpen] = useState(false);
    const [correctionType, setCorrectionType] = useState<'replace' | 'wrap' | 'regex'>('replace');
    const [correctionOriginal, setCorrectionOriginal] = useState("");
    const [correctionReplacement, setCorrectionReplacement] = useState("");
    const [correctionField3, setCorrectionField3] = useState("");

    // Dictionary State
    const [dictDialogOpen, setDictDialogOpen] = useState(false);
    const [dictOriginal, setDictOriginal] = useState("");
    const [dictTranslated, setDictTranslated] = useState("");

    const handleSaveCorrection = useCallback(async () => {
        if (!chapter) return;

        if (!correctionOriginal || !correctionReplacement) {
            toast.error("Vui lòng nhập đủ thông tin");
            return;
        }

        // Notify orchestrator to block navigation/reset state
        onActionStart();
        setCorrectionOpen(false);

        // 1. Save to database
        const entry: CorrectionEntry = {
            workspaceId: chapter.workspaceId,
            type: correctionType,
            createdAt: new Date(),
            from: correctionOriginal,
            to: correctionReplacement,
            original: correctionOriginal,
            replacement: correctionReplacement
        };

        if (correctionType === 'wrap') {
            entry.target = correctionOriginal;
            entry.open = correctionReplacement;
            entry.close = correctionField3;
            entry.replacement = `${correctionReplacement}${correctionOriginal}${correctionField3}`;
        } else if (correctionType === 'regex') {
            entry.pattern = correctionOriginal;
            entry.replace = correctionReplacement;
        }

        await db.corrections.add(entry);

        // 2. Apply to current text
        let newContent = editContent;
        if (correctionType === 'replace') {
            newContent = editContent.split(correctionOriginal).join(correctionReplacement);
        } else if (correctionType === 'wrap') {
            newContent = editContent.split(correctionOriginal).join(`${correctionReplacement}${correctionOriginal}${correctionField3}`);
        } else if (correctionType === 'regex') {
            try {
                newContent = editContent.replace(new RegExp(correctionOriginal, 'g'), correctionReplacement);
            } catch (err) {
                console.error("Regex error:", err);
            }
        }

        // 3. Update DB & Local state
        if (newContent !== editContent) {
            setEditContent(newContent);
            await db.chapters.update(chapterId, {
                content_translated: newContent,
                updatedAt: new Date()
            });
            toast.success(`Đã cải chính: "${correctionOriginal}" -> "${correctionReplacement}"`);
        } else {
            toast.info("Không tìm thấy cụm từ này trong chương để áp dụng.");
        }

        // Reset
        setCorrectionOriginal("");
        setCorrectionReplacement("");
        setCorrectionField3("");
    }, [chapter, chapterId, correctionOriginal, correctionReplacement, correctionType, correctionField3, editContent, setEditContent, onActionStart]);

    const handleSaveDictionary = useCallback(async (targetType: 'character' | 'term') => {
        if (!dictOriginal || !dictTranslated || !chapter?.workspaceId) return;
        const normOriginal = dictOriginal.trim();
        const normTranslated = dictTranslated.trim();

        const existing = await db.dictionary.where({ original: normOriginal, workspaceId: chapter.workspaceId }).first();
        if (!existing) {
            await db.dictionary.add({
                workspaceId: chapter.workspaceId,
                original: normOriginal,
                translated: normTranslated,
                type: targetType === 'character' ? 'name' : 'general',
                createdAt: new Date()
            });
            toast.success(`Đã thêm vào ${targetType === 'character' ? 'Nhân vật' : 'Từ điển'}`);
        } else {
            if (confirm(`"${normOriginal}" đã có. Cập nhật nghĩa không?`)) {
                await db.dictionary.update(existing.id!, {
                    translated: normTranslated,
                    type: targetType === 'character' ? 'name' : 'general'
                });
                toast.success("Đã cập nhật từ điển");
            }
        }
        setDictDialogOpen(false);
    }, [dictOriginal, dictTranslated, chapter]);

    const openCorrection = useCallback((text: string) => {
        setCorrectionOriginal(text);
        setCorrectionReplacement(text);
        setCorrectionOpen(true);
    }, []);

    const openDictionary = useCallback((text: string) => {
        setDictOriginal(text);
        setDictTranslated(text);
        setDictDialogOpen(true);
    }, []);

    return {
        correctionOpen,
        setCorrectionOpen,
        correctionType,
        setCorrectionType,
        correctionOriginal,
        setCorrectionOriginal,
        correctionReplacement,
        setCorrectionReplacement,
        correctionField3,
        setCorrectionField3,
        handleSaveCorrection,
        openCorrection,

        dictDialogOpen,
        setDictDialogOpen,
        dictOriginal,
        setDictOriginal,
        dictTranslated,
        setDictTranslated,
        handleSaveDictionary,
        openDictionary
    };
}
