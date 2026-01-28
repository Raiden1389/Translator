import { db } from "@/lib/db";

/**
 * Xóa một chương khỏi DB
 */
export async function deleteChapter(id: number) {
    return await db.chapters.delete(id);
}

/**
 * Xóa nhiều chương
 */
export async function bulkDeleteChapters(ids: number[]) {
    return await db.chapters.bulkDelete(ids);
}

/**
 * Cập nhật trạng thái chương
 */
export async function updateChapterStatus(id: number, status: 'draft' | 'translated') {
    return await db.chapters.update(id, { status });
}

/**
 * Xóa bản dịch của chương
 */
export async function clearChapterTranslation(id: number) {
    return await db.chapters.update(id, {
        content_translated: "",
        title_translated: "",
        status: 'draft',
        lastTranslatedAt: undefined,
        translationModel: undefined
    });
}
