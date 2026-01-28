"use client";

import { useState, useEffect, useCallback } from "react";
import { InspectionIssue, getErrorMessage } from "@/lib/types";
import { db, Chapter } from "@/lib/db";
import { inspectChapter } from "@/lib/gemini";
import { toast } from "sonner";

/**
 * Hook for managing AI inspection state and operations.
 */
export function useReaderInspection(chapterId: number, chapter: Chapter | undefined) {
    const [isInspecting, setIsInspecting] = useState(false);
    const [inspectionIssues, setInspectionIssues] = useState<InspectionIssue[]>([]);
    const [activeIssue, setActiveIssue] = useState<InspectionIssue | null>(null);

    // Sync inspection issues from chapter when it changes
    useEffect(() => {
        if (chapter) {
            setInspectionIssues(chapter.inspectionResults || []);
        }
        return () => setInspectionIssues([]);
    }, [chapter?.id, chapter?.inspectionResults, chapter]);

    const handleInspect = useCallback(async (content: string) => {
        if (!content || isInspecting || !chapter) return;
        setIsInspecting(true);
        try {
            const issues = await inspectChapter(chapter.workspaceId, content);
            setInspectionIssues(issues);
            await db.chapters.update(chapterId, { inspectionResults: issues });
            if (issues.length === 0) toast.success("Không tìm thấy lỗi nào!");
            else toast.warning(`Tìm thấy ${issues.length} vấn đề.`);
            return issues;
        } catch (error) {
            toast.error("Lỗi kiểm tra: " + getErrorMessage(error));
            return null;
        } finally {
            setIsInspecting(false);
        }
    }, [chapter, chapterId, isInspecting]);

    const handleApplyFix = useCallback(async (
        issue: InspectionIssue,
        currentContent: string,
        saveToCorrections: boolean,
        updateContent: (newContent: string) => void
    ) => {
        if (!currentContent || !chapter) return;

        // 1. Save to corrections if requested
        if (saveToCorrections) {
            await db.corrections.add({
                workspaceId: chapter.workspaceId,
                type: 'replace',
                from: issue.original,
                to: issue.suggestion,
                original: issue.original,
                replacement: issue.suggestion,
                createdAt: new Date()
            });
        }

        if (!issue.original || !issue.suggestion) return;

        // 2. Apply fix to content
        const newText = currentContent.split(issue.original).join(issue.suggestion);
        updateContent(newText);
        await db.chapters.update(chapterId, { content_translated: newText });

        // 3. Update issue list
        const newIssues = inspectionIssues.filter(i => i.original !== issue.original);
        setInspectionIssues(newIssues);
        await db.chapters.update(chapterId, { inspectionResults: newIssues });
        setActiveIssue(null);
        toast.success("Đã sửa lỗi!");
    }, [chapter, chapterId, inspectionIssues]);

    return {
        isInspecting,
        inspectionIssues,
        setInspectionIssues,
        activeIssue,
        setActiveIssue,
        handleInspect,
        handleApplyFix
    };
}
