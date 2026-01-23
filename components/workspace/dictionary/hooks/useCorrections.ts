"use client";

import { useState, useMemo, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, CorrectionEntry } from "@/lib/db";
import { toast } from "sonner";
import { finalSweep, escapeRegExp, safeReplace, safeWrap } from "@/lib/gemini/helpers";

function applyRule(text: string, rule: CorrectionEntry): string {
    if (!text) return "";

    // Fallback for legacy rules (migration should handle this, but safe check)
    const type = rule.type || 'replace';

    switch (type) {
        case 'replace':
            return safeReplace(text, rule.from || rule.original || "", rule.to || rule.replacement || ""); // Support legacy fields fallback
        case 'wrap':
            return safeWrap(text, rule.target || "", rule.open || "", rule.close || "");
        case 'regex':
            if (rule.pattern && rule.replace) {
                try {
                    return text.replace(new RegExp(rule.pattern, 'g'), rule.replace);
                } catch (e) {
                    console.error("Invalid regex rule:", rule);
                    return text;
                }
            }
            return text;
        default:
            return text;
    }
}

export function useCorrections(workspaceId: string) {
    const liveCorrections = useLiveQuery(
        () => db.corrections.where('workspaceId').equals(workspaceId).toArray(),
        [workspaceId]
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
        const entry: any = {
            workspaceId,
            type: ruleType,
            createdAt: new Date()
        };

        if (ruleType === 'replace') {
            if (!field1 || !field2) {
                toast.error("Vui lòng nhập đủ từ sai và từ đúng");
                return;
            }
            entry.from = field1;
            entry.to = field2;
            // Legacy support
            entry.original = field1;
            entry.replacement = field2;
        } else if (ruleType === 'wrap') {
            if (!field1 || !field2 || !field3) {
                toast.error("Vui lòng nhập Target, Open, Close");
                return;
            }
            if (field1.includes('[') || field1.includes(']')) {
                toast.error("Target không được chứa dấu ngoặc [ ]");
                return;
            }
            if (field2 === field3) {
                toast.error("Open và Close không được giống nhau");
                return;
            }
            entry.target = field1;
            entry.open = field2;
            entry.close = field3;
            // Mock legacy for display
            entry.original = field1;
            entry.replacement = `${field2}${field1}${field3}`;
        } else if (ruleType === 'regex') {
            if (!field1 || !field2) {
                toast.error("Vui lòng nhập Pattern và Replacement");
                return;
            }
            entry.pattern = field1;
            entry.replace = field2;
            entry.original = field1;
            entry.replacement = field2;
        }

        await db.corrections.add(entry);

        setField1("");
        setField2("");
        setField3("");
        toast.success("Đã thêm quy tắc sửa lỗi!");
    }, [ruleType, field1, field2, field3, workspaceId]);

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
                let content = chapter.content_translated || "";
                let title = chapter.title_translated || chapter.title;
                const originalContent = content;
                const originalTitle = title;

                // Apply ALL rules sequentially
                for (const rule of corrections) {
                    content = applyRule(content, rule);
                    title = applyRule(title, rule);
                }

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
