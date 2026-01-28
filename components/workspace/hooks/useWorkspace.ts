"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { deleteWorkspace, clearSessionHistory } from "@/lib/services/workspace.service";
import { useRaiden } from "@/components/theme/RaidenProvider";
import { toast } from "sonner";
import { ReviewData, GlossaryCharacter, GlossaryTerm } from "@/lib/types";

export function useWorkspace(id: string) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeTabParam = searchParams.get("tab");

    const workspace = useLiveQuery(() => db.workspaces.get(id), [id]);
    const { isRaidenMode, toggleRaidenMode } = useRaiden();

    // Stats calculation
    const stats = useLiveQuery(async () => {
        const total = await db.chapters.where("workspaceId").equals(id).count();
        const translated = await db.chapters.where("workspaceId").equals(id).filter(c => c.status === 'translated').count();
        return { total, translated };
    }, [id]);

    const progress = stats ? (stats.total > 0 ? (stats.translated / stats.total) * 100 : 0) : 0;
    const activeTab = activeTabParam || "overview";

    // Review logic
    const [reviewData, setReviewData] = useState<ReviewData | null>(null);

    // Auto-cleanup hook
    useEffect(() => {
        return () => {
            clearSessionHistory(id);
        };
    }, [id]);

    const changeTab = (tab: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab);
        router.push(`?${params.toString()}`, { scroll: false });
    };

    const handleDeleteWorkspace = async () => {
        const result = await deleteWorkspace(id);
        if (result.success) {
            toast.success("Đã xóa Workspace thành công!");
            router.push("/");
        } else {
            toast.error(result.error || "Lỗi khi xóa Workspace.");
        }
    };

    const handleReviewSave = async (saveChars: GlossaryCharacter[], saveTerms: GlossaryTerm[], blacklistChars: GlossaryCharacter[], blacklistTerms: GlossaryTerm[]) => {
        const allSave = [...saveChars, ...saveTerms].map(item => ({ ...item, workspaceId: id, createdAt: new Date() }));
        if (allSave.length > 0) {
            await db.dictionary.bulkAdd(allSave);
        }

        const allBlacklist = [...blacklistChars, ...blacklistTerms];
        for (const item of allBlacklist) {
            const existing = await db.blacklist.where({ word: item.original, workspaceId: id }).first();
            if (!existing) {
                await db.blacklist.add({
                    workspaceId: id,
                    word: item.original,
                    translated: item.translated,
                    source: 'manual',
                    createdAt: new Date()
                });
            }
        }

        toast.success(`Đã lưu: ${allSave.length} từ vào từ điển, ${allBlacklist.length} từ vào blacklist.`);
        setReviewData(null);
    };

    return {
        state: {
            workspace,
            activeTab,
            progress,
            isRaidenMode,
            reviewData
        },
        actions: {
            changeTab,
            toggleRaidenMode,
            handleDeleteWorkspace,
            handleReviewSave,
            setReviewData
        }
    };
}
