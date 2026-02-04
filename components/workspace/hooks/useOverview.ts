"use client";

import { useState, useEffect, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Workspace } from "@/lib/db";
import {
    processCoverImage,
    getWorkspaceStats,
    generateAiSummary,
    getUsageHistory
} from "@/lib/services/overview.service";
import { toast } from "sonner";

export function useOverview(workspace: Workspace) {
    const [isDragging, setIsDragging] = useState(false);
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

    // Dynamic stats
    const stats = useLiveQuery(
        () => getWorkspaceStats(workspace.id!),
        [workspace.id]
    ) || {
        totalChapters: 0,
        translatedChapters: 0,
        termCount: 0,
        charCount: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalThinkingTokens: 0,
        totalCostUSD: 0,
        totalCostVND: 0
    };

    const usageHistory = useLiveQuery(
        () => getUsageHistory(workspace.id!),
        [workspace.id]
    ) || [];

    const handleUpdateField = useCallback(async <K extends keyof Workspace>(field: K, value: Workspace[K]) => {
        try {
            await db.workspaces.update(workspace.id!, {
                [field]: value,
                updatedAt: new Date()
            });
        } catch {
            toast.error("Lỗi khi cập nhật dữ liệu.");
        }
    }, [workspace.id]);

    const handleProcessFile = useCallback(async (file: File) => {
        if (file.size > 10 * 1024 * 1024) {
            toast.warning("Ảnh quá lớn (< 10MB)");
            return;
        }

        try {
            const optimizedBase64 = await processCoverImage(file);
            await handleUpdateField('cover', optimizedBase64);
            toast.success("Đã cập nhật ảnh bìa.");
        } catch {
            toast.error("Lỗi xử lý ảnh bìa.");
        }
    }, [handleUpdateField]);

    const handleAutoSummary = async () => {
        setIsGeneratingSummary(true);
        try {
            const summary = await generateAiSummary(workspace);
            await db.workspaces.update(workspace.id!, {
                description: summary,
                isAiDescription: true,
                updatedAt: new Date()
            });
            toast.success("Đã tạo tóm tắt mới!");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Lỗi khi tạo tóm tắt.";
            toast.error(msg);
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    // Clipboard Paste Listener
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        e.preventDefault();
                        handleProcessFile(file);
                    }
                    break;
                }
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, [handleProcessFile]);

    return {
        state: {
            stats,
            usageHistory,
            isDragging,
            isGeneratingSummary
        },
        actions: {
            setIsDragging,
            handleProcessFile,
            handleAutoSummary,
            handleUpdateField
        }
    };
}

