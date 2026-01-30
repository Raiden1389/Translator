import { db } from "@/lib/db";
import { fetchShubaChapter, fetchFanqieChapter } from "./crawler/shubaCrawler";
import { scrubSourceRags } from "../gemini/text/scrub";

/**
 * Ensures a chapter has its original content.
 * If content is missing but sourceUrl is present, it crawls the content.
 */
export async function ensureChapterContent(chapterId: number): Promise<string> {
    const chapter = await db.chapters.get(chapterId);
    if (!chapter) throw new Error("Chapter not found");

    if (chapter.content_original && chapter.content_original.trim().length > 0) {
        return chapter.content_original;
    }

    if (!chapter.sourceUrl) {
        throw new Error("No content and no source URL available for this chapter.");
    }

    console.log(`[Crawler] Fetching content for: ${chapter.title} from ${chapter.sourceUrl}`);

    try {
        let result: { title: string; content: string };

        if (chapter.sourceUrl.includes("69shuba") || chapter.sourceUrl.includes("69xinshu")) {
            result = await fetchShubaChapter(chapter.sourceUrl);
        } else if (chapter.sourceUrl.includes("fanqie")) {
            result = await fetchFanqieChapter(chapter.sourceUrl);
        } else {
            throw new Error("Nguồn web này chưa được hỗ trợ để tải nội dung.");
        }

        // Scrub the content (only for 69shuba, Fanqie is usually cleaner but we can apply it too)
        const cleanedContent = scrubSourceRags(result.content);

        // Update DB
        await db.chapters.update(chapterId, {
            content_original: cleanedContent,
            wordCountOriginal: cleanedContent.length,
            updatedAt: new Date()
        });

        return cleanedContent;
    } catch (error) {
        console.error(`[Crawler] Failed to fetch chapter ${chapterId}:`, error);
        throw new Error("Không thể tải nội dung chương từ nguồn web.");
    }
}

/**
 * Bulk ensures content for multiple chapters.
 */
export async function bulkEnsureChapterContent(chapterIds: number[], onProgress?: (current: number, total: number) => void) {
    let count = 0;
    for (const id of chapterIds) {
        try {
            await ensureChapterContent(id);
        } catch (e) {
            console.error(e);
        }
        count++;
        onProgress?.(count, chapterIds.length);
    }
}
