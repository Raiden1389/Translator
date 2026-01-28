import { db, Chapter } from "@/lib/db";
import { inspectChapter as aiInspectChapter } from "@/lib/gemini";
import { applyCorrectionRule } from "@/lib/gemini/helpers";
import { InspectionIssue } from "@/lib/types";

/**
 * Phân tách chuỗi range (ví dụ: "1-5, 10, 15-20") thành tập hợp các order numbers
 */
export function parseRangeString(rangeStr: string): Set<number> {
    const orders = new Set<number>();
    if (!rangeStr.trim()) return orders;

    const parts = rangeStr.split(',').map(p => p.trim());
    parts.forEach(part => {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(num => parseInt(num.trim()));
            if (!isNaN(start) && !isNaN(end)) {
                const min = Math.min(start, end);
                const max = Math.max(start, end);
                for (let i = min; i <= max; i++) orders.add(i);
            }
        } else {
            const num = parseInt(part);
            if (!isNaN(num)) orders.add(num);
        }
    });
    return orders;
}

/**
 * Gọi AI rà soát lỗi và cập nhật vào DB
 */
export async function runChapterInspection(workspaceId: string, chapterId: number): Promise<{ issues: InspectionIssue[], title: string }> {
    const chapter = await db.chapters.get(chapterId);
    if (!chapter || !chapter.content_translated) {
        throw new Error("Chương này chưa dịch hoặc không tồn tại.");
    }

    const issues = await aiInspectChapter(workspaceId, chapter.content_translated);
    await db.chapters.update(chapterId, { inspectionResults: issues });

    return { issues, title: chapter.title };
}

/**
 * Áp dụng hàng loạt quy tắc cải chính (Corrections)
 */
export async function applyBulkCorrections(workspaceId: string, selectedChapterIds: number[]) {
    const corrections = await db.corrections.where('workspaceId').equals(workspaceId).toArray();
    if (corrections.length === 0) {
        throw new Error("Chưa có dữ liệu Cải chính (Corrections).");
    }

    const chaptersToFix = await db.chapters.where("id").anyOf(selectedChapterIds).toArray();
    let updatedCount = 0;

    // Snapshot để Undo (Lưu trạng thái TRƯỚC khi sửa)
    const snapshot = chaptersToFix.map(c => ({
        chapterId: c.id,
        before: { title: c.title_translated || "", content: c.content_translated || "" }
    }));

    await db.transaction('rw', db.chapters, db.history, async () => {
        let anyChange = false;

        for (const correction of corrections) {
            for (const chapter of chaptersToFix) {
                if (!chapter.content_translated) continue;

                let newContent = chapter.content_translated;
                let newTitle = chapter.title_translated || "";
                let hasChanges = false;

                const originalContent = newContent;
                const originalTitle = newTitle;

                newContent = applyCorrectionRule(newContent, correction);
                if (newTitle) {
                    newTitle = applyCorrectionRule(newTitle, correction);
                }

                if (newContent !== originalContent || newTitle !== originalTitle) {
                    hasChanges = true;
                }

                if (hasChanges) {
                    await db.chapters.update(chapter.id!, {
                        content_translated: newContent,
                        title_translated: newTitle,
                        updatedAt: new Date()
                    });
                    updatedCount++;
                    anyChange = true;
                }
            }
        }

        if (anyChange) {
            // Xóa history cũ (Single Undo Strategy)
            await db.history.where("workspaceId").equals(workspaceId).delete();

            // Lưu History mới
            await db.history.add({
                workspaceId,
                actionType: 'batch_correction',
                summary: `Áp dụng cải chính (${updatedCount} chương)`,
                timestamp: new Date(),
                affectedCount: updatedCount,
                snapshot: snapshot
            });
        }
    });

    return { updatedCount };
}
