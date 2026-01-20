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

            // 1. Snapshot for Persistent Undo
            const snapshot = chapters.map(c => ({
                chapterId: c.id!,
                before: {
                    title: c.title_translated || (c.title ? c.title.replace(/Chapter\s+(\d+)/i, "Chương $1") : ""),
                    content: c.content_translated || ""
                }
            })).filter(s => s.before.content); // Only snapshots chapters with translation

            if (snapshot.length === 0) {
                toast.info("Không có chương nào đã dịch để áp dụng.");
                return;
            }

            await db.history.add({
                workspaceId,
                actionType: 'batch_correction',
                summary: `Áp dụng ${corrections.length} quy tắc cải chính`,
                timestamp: new Date(),
                affectedCount: snapshot.length,
                snapshot
            });

            // 2. Perform Replacements
            let totalReplacements = 0;
            for (const chapter of chapters) {
                let content = chapter.content_translated || "";
                let title = chapter.title_translated || (chapter.title ? chapter.title.replace(/Chapter\s+(\d+)/i, "Chương $1") : "");
                let changed = false;

                for (const correction of corrections) {
                    const regex = new RegExp(correction.original, 'g');

                    // Check content
                    const contentMatches = content.match(regex);
                    if (contentMatches) {
                        content = content.replace(regex, correction.replacement);
                        totalReplacements += contentMatches.length;
                        changed = true;
                    }

                    // Check title
                    if (title.includes(correction.original)) {
                        title = title.split(correction.original).join(correction.replacement);
                        changed = true;
                    }
                }

                if (changed) {
                    await db.chapters.update(chapter.id!, {
                        content_translated: content,
                        title_translated: title
                    });
                }
            }

            toast.success(`Đã áp dụng ${totalReplacements} thay thế cho ${snapshot.length} chương.`);
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
