import { db } from "../db";
import { withKeyRotation } from "./client";
import { DEFAULT_MODEL } from "../ai-models";

/**
 * Translate ONLY the chapter title (ultra-cheap, ~$0.000005/title)
 * Used to fix chapters with Chinese characters remaining in titles
 */
export async function translateTitleOnly(chineseTitle: string, retryCount = 0): Promise<string> {
    const modelSetting = await db.settings.get("aiModel");
    const aiModel = modelSetting?.value || DEFAULT_MODEL;

    const prompt = `Dịch tiêu đề chương này sang tiếng Việt hoàn toàn. 
Tiêu đề gốc: "${chineseTitle}"

QUY TẮC BẤT DI BẤT DỊCH:
1. Trả về DUY NHẤT tiêu đề tiếng Việt. CẤM giải thích.
2. KHÔNG ĐƯỢC giữ lại bất kỳ ký tự Trung Quốc (Hán tự) nào.
3. Dịch thoát ý hoặc Hán Việt đều được, miễn là 100% chữ cái Latinh.

VÍ DỤ:
- "第104章 顺势" → "Chương 104: Thuận Thế"
- "第34章 血竹林" → "Chương 34: Huyết Trúc Lâm"

⛔ CẤM TUYỆT ĐỐI: "Chương 34 血竹林" (SAI VÌ CÒN CHỮ HÁN)`;

    try {
        const result = (await withKeyRotation<any>(
            {
                model: (aiModel as string).trim(),
                prompt,
                generationConfig: {
                    temperature: 0.1, // Low temperature for stability
                    topP: 0.95,
                    maxOutputTokens: 100,
                    responseMimeType: "text/plain",
                }
            },
            (msg: string) => console.log(`[Title Fixer] ${msg}`)
        )) as any;

        let text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
        text = text.trim().replace(/^"|"$/g, ''); // Remove quotes if AI adds them

        // Self-Correction logic
        if (hasChinese(text) && retryCount < 1) {
            console.warn(`[Title Fixer] AI failed, retrying once for: ${chineseTitle}`);
            return translateTitleOnly(chineseTitle, retryCount + 1);
        }

        return text;
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
