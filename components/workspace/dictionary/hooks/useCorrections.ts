"use client";

import { useState, useMemo, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, CorrectionEntry, GLOBAL_WORKSPACE_ID } from "@/lib/db";
import { toast } from "sonner";
import { applyAllCorrections, finalSweep } from "@/lib/gemini/contentProcessor";
import { sweepSingleRule } from "@/lib/services/corrections.service";



export function useCorrections(workspaceId: string) {
    const liveCorrections = useLiveQuery(
        () => db.corrections.where('workspaceId').equals(GLOBAL_WORKSPACE_ID).toArray(),
        []  // No dependency on workspaceId — global pool
    );

    const corrections = useMemo(() => liveCorrections || [], [liveCorrections]);

    const [correctionSearch, setCorrectionSearch] = useState("");
    // UI State for Form - Adapted for multiple types
    const [ruleType, setRuleType] = useState<'replace' | 'wrap' | 'regex'>('replace');

    // Form fields mapped
    const [field1, setField1] = useState(""); // from / target / pattern
    const [field2, setField2] = useState(""); // to / open / replace
    const [field3, setField3] = useState(""); // close (only for wrap)

    const [isApplyingCorrections, setIsApplyingCorrections] = useState(false);

    const filteredCorrections = useMemo(() => {
        const search = correctionSearch.toLowerCase();
        return corrections.filter(c => {
            if (c.type === 'replace') return (c.from?.toLowerCase().includes(search) || c.to?.toLowerCase().includes(search));
            if (c.type === 'wrap') return (c.target?.toLowerCase().includes(search));
            if (c.type === 'regex') return (c.pattern?.toLowerCase().includes(search));
            // Legacy fallback
            return (c.original?.toLowerCase().includes(search) || c.replacement?.toLowerCase().includes(search));
        });
    }, [corrections, correctionSearch]);

    const handleAddCorrection = useCallback(async () => {
        const entry: Partial<CorrectionEntry> = {
            workspaceId: GLOBAL_WORKSPACE_ID,  // All corrections are global (Luyện Văn)
            type: ruleType,
            createdAt: new Date()
        };

        if (ruleType === 'replace') {
            const f1 = field1.trim().normalize('NFC');
            const f2 = field2.trim().normalize('NFC');
            if (!f1 || !f2) {
                toast.error("Vui lòng nhập đủ từ sai và từ đúng");
                return;
            }
            // Duplicate Check
            const exists = corrections.find(c =>
                c.type === 'replace' &&
                (c.from || c.original || "").normalize('NFC').toLowerCase() === f1.toLowerCase()
            );
            if (exists) {
                toast.error("Quy tắc này đã tồn tại rồi!");
                return;
            }
            entry.from = f1;
            entry.to = f2;
            entry.original = f1;
            entry.replacement = f2;
        } else if (ruleType === 'wrap') {
            const f1 = field1.trim().normalize('NFC');
            const f2 = field2.trim();
            const f3 = field3.trim();
            if (!f1 || !f2 || !f3) {
                toast.error("Vui lòng nhập Target, Open, Close");
                return;
            }
            // Duplicate Check
            const exists = corrections.find(c =>
                c.type === 'wrap' &&
                c.target?.normalize('NFC').toLowerCase() === f1.toLowerCase()
            );
            if (exists) {
                toast.error("Quy tắc bọc cho từ này đã có rồi!");
                return;
            }
            entry.target = f1;
            entry.open = f2;
            entry.close = f3;
            entry.original = f1;
            entry.replacement = `${f2}${f1}${f3}`;
        } else if (ruleType === 'regex') {
            const f1 = field1.trim();
            const f2 = field2.trim();
            if (!f1) {
                toast.error("Vui lòng nhập Pattern");
                return;
            }
            const exists = corrections.find(c => c.type === 'regex' && c.pattern === f1);
            if (exists) {
                toast.error("Quy tắc Regex này đã tồn tại!");
                return;
            }
            entry.pattern = f1;
            entry.replace = f2;
            entry.original = f1;
            entry.replacement = f2;
        }

        await db.corrections.add(entry as CorrectionEntry);

        setField1("");
        setField2("");
        setField3("");

        // 🔥 Luyện Văn: Silent auto-apply to ALL chapters
        sweepSingleRule(entry).then(affected => {
            if (affected > 0) {
                toast.success(`🔥 Đã thêm & áp dụng — ${affected} chương cập nhật`);
            } else {
                toast.success("Đã thêm quy tắc.");
            }
        }).catch(err => {
            console.error("[Luyện Văn] sweep error:", err);
            toast.success("Đã thêm quy tắc.");
        });
    }, [ruleType, field1, field2, field3, corrections]);

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

            // Filter only valid chapters (sanity check)
            const validChapters = chapters.filter(c => c.content_translated);

            if (validChapters.length === 0) {
                toast.info("Không có chương nào đã dịch để áp dụng.");
                return;
            }

            // 1. Snapshot for Persistent Undo
            const snapshot = validChapters.map(c => ({
                chapterId: c.id!,
                before: {
                    title: c.title_translated || c.title,
                    content: c.content_translated || ""
                }
            }));

            await db.history.add({
                workspaceId,
                actionType: 'batch_correction',
                summary: `Áp dụng ${corrections.length} quy tắc cải chính`,
                timestamp: new Date(),
                affectedCount: snapshot.length,
                snapshot
            });

            // 2. Perform Replacements
            let affectedChapters = 0;
            const affectedNames: string[] = [];

            for (const chapter of validChapters) {
                const originalContent = chapter.content_translated || "";
                const originalTitle = chapter.title_translated || chapter.title;

                // Apply ALL rules at once (Efficient & Sorted)
                let content = applyAllCorrections(originalContent, corrections);
                let title = applyAllCorrections(originalTitle, corrections);

                // Final Sweep (Safety Net)
                content = finalSweep(content);
                title = finalSweep(title);

                // Check if changed
                if (content !== originalContent || title !== originalTitle) {
                    await db.chapters.update(chapter.id!, {
                        content_translated: content,
                        title_translated: title
                    });
                    affectedChapters++;
                    affectedNames.push(chapter.title);
                }
            }

            if (affectedChapters > 0) {
                const namesFn = affectedNames.length > 3
                    ? `${affectedNames.slice(0, 3).join(", ")}... (+${affectedNames.length - 3})`
                    : affectedNames.join(", ");
                toast.success(`Đã cập nhật ${affectedChapters} chương: ${namesFn}`);
            } else {
                toast.info("Không có chương nào thay đổi (Nội dung đã sạch hoặc không khớp quy tắc).");
            }
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

        // New State
        ruleType,
        setRuleType,
        field1, setField1,
        field2, setField2,
        field3, setField3,

        isApplyingCorrections,
        handleAddCorrection,
        handleDeleteCorrection,
        handleApplyCorrections,
    };
}
