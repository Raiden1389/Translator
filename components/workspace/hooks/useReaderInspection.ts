import { useState, useEffect } from "react";
import { InspectionIssue } from "@/lib/gemini";
import { db } from "@/lib/db";
import { toast } from "sonner";

/**
 * Custom hook for managing AI inspection state and operations
 */
export function useReaderInspection(chapterId: number, chapter: any) {
    const [isInspecting, setIsInspecting] = useState(false);
    const [inspectionIssues, setInspectionIssues] = useState<InspectionIssue[]>([]);
    const [activeIssue, setActiveIssue] = useState<InspectionIssue | null>(null);

    // Sync inspection issues from DB on load
    useEffect(() => {
        if (chapter?.inspectionResults) {
            setInspectionIssues(chapter.inspectionResults);
        }

        // Cleanup on unmount to prevent memory leaks
        return () => {
            setInspectionIssues([]);
        };
    }, [chapter]);

    const handleFixIssue = async (issue: InspectionIssue, editContent: string, setEditContent: (content: string) => void) => {
        // 1. Add to corrections table
        const existingCorrection = await db.corrections
            .where('[workspaceId+original]')
            .equals([chapter.workspaceId, issue.original])
            .first();

        if (!existingCorrection) {
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

        // 2. Apply fix to content
        const newText = editContent.split(issue.original).join(issue.suggestion);
        setEditContent(newText);
        await db.chapters.update(chapterId, { content_translated: newText });

        // 3. Remove this issue from list
        const newIssues = inspectionIssues.filter(i => i.original !== issue.original);
        setInspectionIssues(newIssues);
        await db.chapters.update(chapterId, { inspectionResults: newIssues });
        setActiveIssue(null);
        toast.success("Đã sửa lỗi!");
    };

    const handleAutoFixAll = async (type: string, editContent: string, setEditContent: (content: string) => void) => {
        const targetIssues = inspectionIssues.filter(i => i.type === type);
        if (targetIssues.length === 0) return;

        let newText = editContent;
        targetIssues.forEach(issue => {
            newText = newText.split(issue.original).join(issue.suggestion);
        });

        setEditContent(newText);
        await db.chapters.update(chapterId, { content_translated: newText });

        const remainingIssues = inspectionIssues.filter(i => i.type !== type);
        setInspectionIssues(remainingIssues);
        await db.chapters.update(chapterId, { inspectionResults: remainingIssues });
        toast.success(`Đã tự động sửa ${targetIssues.length} lỗi ${type}!`);
    };

    return {
        isInspecting,
        setIsInspecting,
        inspectionIssues,
        setInspectionIssues,
        activeIssue,
        setActiveIssue,
        handleFixIssue,
        handleAutoFixAll,
    };
}
