import { db } from "../db";
import { withKeyRotation } from "./client";
import { DEFAULT_MODEL } from "../ai-models";

/**
 * Translate ONLY the chapter title (ultra-cheap, ~$0.000005/title)
 * Used to fix chapters with Chinese characters remaining in titles
 */
export async function translateTitleOnly(chineseTitle: string): Promise<string> {
    const modelSetting = await db.settings.get("aiModel");
    const aiModel = modelSetting?.value || DEFAULT_MODEL;

    const prompt = `Dịch tiêu đề chương này sang tiếng Việt:
"${chineseTitle}"

Quy tắc:
- Chỉ trả về tiêu đề đã dịch, KHÔNG giải thích
- Dịch HOÀN TOÀN sang tiếng Việt, KHÔNG giữ chữ Hán
- Giữ format "Chương X: Tên"

Ví dụ:
"第104章 顺势" → "Chương 104: Thuận Thế"
"第1章 开始" → "Chương 1: Khởi Đầu"`;

    try {
        const result = (await withKeyRotation<any>(
            {
                model: (aiModel as string).trim(),
                prompt,
                generationConfig: {
                    temperature: 0.1,
                    topP: 0.95,
                    maxOutputTokens: 50, // Tiny! Just a title
                    responseMimeType: "text/plain",
                }
            },
            (msg: string) => console.log(`[Title Translation] ${msg}`)
        )) as any;

        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
        return text.trim();
    } catch (error) {
        console.error(`[Title Translation Error]`, error);
        throw error;
    }
}

/**
 * Detect if a title contains Chinese characters
 */
export function hasChinese(text: string): boolean {
    return /[\u4e00-\u9fff]/.test(text);
}

/**
 * Fix all chapter titles in a workspace that contain Chinese characters
 * Returns: { fixed: number, skipped: number, errors: string[] }
 */
export async function fixAllTitles(
    workspaceId: string,
    onProgress?: (current: number, total: number, title: string) => void
): Promise<{ fixed: number; skipped: number; errors: string[] }> {
    const chapters = await db.chapters
        .where('workspaceId')
        .equals(workspaceId)
        .toArray();

    const needFix = chapters.filter(ch => hasChinese(ch.title_translated || ""));
    const stats = { fixed: 0, skipped: 0, errors: [] as string[] };

    console.log(`[Fix Titles] Found ${needFix.length} chapters with Chinese in TRANSLATED titles`);

    for (let i = 0; i < needFix.length; i++) {
        const chapter = needFix[i];
        try {
            const currentTitleToFix = chapter.title_translated || chapter.title;
            onProgress?.(i + 1, needFix.length, currentTitleToFix);

            const newTitle = await translateTitleOnly(currentTitleToFix);

            // Verify translation is valid
            if (!newTitle || hasChinese(newTitle)) {
                console.warn(`[Fix Titles] Translation still has Chinese: ${currentTitleToFix} → ${newTitle}`);
                stats.errors.push(`Chương ${chapter.order}: Dịch vẫn còn chữ Hán`);
                stats.skipped++;
                continue;
            }

            // Update database - Update THE CORRECT FIELD (title_translated)
            await db.chapters.update(chapter.id!, { title_translated: newTitle });
            console.log(`[Fix Titles] ✅ ${currentTitleToFix} → ${newTitle}`);
            stats.fixed++;

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[Fix Titles] Error for chapter ${chapter.order}:`, error);
            stats.errors.push(`Chương ${chapter.order}: ${errorMessage}`);
            stats.skipped++;
        }
    }

    return stats;
}
