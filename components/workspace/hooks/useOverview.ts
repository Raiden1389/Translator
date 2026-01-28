"use client";

import { useState, useEffect, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Workspace } from "@/lib/db";
import {
    processCoverImage,
    getWorkspaceStats,
    generateAiSummary
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
        totalCostUSD: 0,
        totalCostVND: 0
    };

    const handleUpdateField = useCallback(async (field: keyof Workspace, value: any) => {
        try {
            await db.workspaces.update(workspace.id!, {
                [field]: value,
                updatedAt: new Date()
            });
        } catch (err) {
            toast.error("Lỗi khi cập nhật dữ liệu.");
        }
    }, [workspace.id]);

    const handleProcessFile = async (file: File) => {
        if (file.size > 10 * 1024 * 1024) {
            toast.warning("Ảnh quá lớn (< 10MB)");
            return;
        }

        try {
            const optimizedBase64 = await processCoverImage(file);
            await handleUpdateField('cover', optimizedBase64);
            toast.success("Đã cập nhật ảnh bìa.");
        } catch (err) {
            toast.error("Lỗi xử lý ảnh bìa.");
        }
    };

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
        } catch (err: any) {
            toast.error(err.message || "Lỗi khi tạo tóm tắt.");
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
    }, [workspace.id]);

    return {
        state: {
            stats,
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
