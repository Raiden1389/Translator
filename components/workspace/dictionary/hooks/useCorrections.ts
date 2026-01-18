"use client";

import { useState, useMemo, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { toast } from "sonner";

export function useCorrections(workspaceId: string) {
    const corrections = useLiveQuery(
        () => db.corrections.where('workspaceId').equals(workspaceId).toArray(),
        [workspaceId]
    ) || [];

    const [correctionSearch, setCorrectionSearch] = useState("");
    const [newWrong, setNewWrong] = useState("");
    const [newRight, setNewRight] = useState("");
    const [isApplyingCorrections, setIsApplyingCorrections] = useState(false);

    const filteredCorrections = useMemo(() => {
        return corrections.filter(c =>
            c.original.toLowerCase().includes(correctionSearch.toLowerCase()) ||
            c.replacement.toLowerCase().includes(correctionSearch.toLowerCase())
        );
    }, [corrections, correctionSearch]);

    const handleAddCorrection = useCallback(async () => {
        if (!newWrong || !newRight) return;
        await db.corrections.add({
            workspaceId,
            original: newWrong,
            replacement: newRight,
            createdAt: new Date()
        });
        setNewWrong("");
        setNewRight("");
        toast.success("Đã thêm quy tắc sửa lỗi!");
    }, [newWrong, newRight, workspaceId]);

    const handleDeleteCorrection = useCallback(async (id: number) => {
        await db.corrections.delete(id);
        toast.success("Đã xóa quy tắc.");
    }, []);

    const handleApplyCorrections = useCallback(async () => {
        if (!corrections.length) {
            toast.warning("Chưa có quy tắc nào để áp dụng.");
            return;
        }

        setIsApplyingCorrections(true);
        try {
            const chapters = await db.chapters.where('workspaceId').equals(workspaceId).toArray();
            let totalReplacements = 0;

            for (const chapter of chapters) {
                let content = chapter.content_translated || "";
                let changed = false;

                for (const correction of corrections) {
                    const regex = new RegExp(correction.original, 'g');
                    const matches = content.match(regex);
                    if (matches) {
                        content = content.replace(regex, correction.replacement);
                        totalReplacements += matches.length;
                        changed = true;
                    }
                }

                if (changed) {
                    await db.chapters.update(chapter.id!, {
                        content_translated: content
                    });
                }
            }

            toast.success(`Đã áp dụng ${totalReplacements} thay thế cho ${chapters.length} chương.`);
        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi áp dụng sửa lỗi.");
        } finally {
            setIsApplyingCorrections(false);
        }
    }, [corrections, workspaceId]);

    return {
        corrections,
        filteredCorrections,
        correctionSearch,
        setCorrectionSearch,
        newWrong,
        setNewWrong,
        newRight,
        setNewRight,
        isApplyingCorrections,
        handleAddCorrection,
        handleDeleteCorrection,
        handleApplyCorrections,
    };
}
