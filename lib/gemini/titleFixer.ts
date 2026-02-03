import { db } from "../db";
import { withKeyRotation } from "./client";
import { DEFAULT_MODEL } from "../ai-models";
import { SyllableRepository } from "../repositories/syllable-repo";

/**
 * Translate ONLY the chapter title (ultra-cheap, ~$0.000005/title)
 * Used to fix chapters with Chinese characters remaining in titles
 */
export async function translateTitleOnly(chineseTitle: string, retryCount = 0): Promise<string> {
    const modelSetting = await db.settings.get("aiModel");
    const aiModel = modelSetting?.value || DEFAULT_MODEL;

    const prompt = `BẠN LÀ MỘT CHUYÊN GIA DỊCH THUẬT CẤP CAO.
NHIỆM VỤ: Dịch tiêu đề chương này sang Tiếng Việt.

Tiêu đề gốc: "${chineseTitle}"

QUY TẮC SỐNG CÒN:
1. TRẢ VỀ DUY NHẤT TIÊU ĐỀ TIẾNG VIỆT. CẤM GIẢI THÍCH.
2. TUYỆT ĐỐI KHÔNG ĐƯỢC GIỮ LẠI BẤT KỲ CHỮ HÁN NÀO ([\u4e00-\u9fff]).
3. NẾU KHÔNG BIẾT DỊCH, HÃY PHIÊN ÂM HÁN VIỆT.
4. ĐẢM BẢO 100% KÝ TỰ LATIN.

VÍ DỤ SAI: "Chương 34 血竹林" (VÌ CÒN CHỮ HÁN)
VÍ DỤ ĐÚNG: "Chương 34: Huyết Trúc Lâm"`;

    try {
        interface GeminiResponse {
            candidates: Array<{
                content: {
                    parts: Array<{ text: string }>
                }
            }>
        }

        const result = (await withKeyRotation<GeminiResponse>(
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
        ));

        let text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
        text = text.trim().replace(/^"|"$/g, '');

        // 🛡️ Logic tự sửa lỗi (Self-Correction)
        if (hasChinese(text)) {
            if (retryCount < 2) {
                console.warn(`[Title Fixer] AI thất bại lần ${retryCount + 1}, đang thử lại cho: ${chineseTitle}`);
                return translateTitleOnly(chineseTitle, retryCount + 1);
            } else {
                // 🆘 CỨU HỘ CUỐI CÙNG: Dùng Hán Việt cục bộ
                console.warn(`[Title Fixer] AI bó tay, dùng cứu hiệu Hán Việt cho: ${text || chineseTitle}`);
                return forceRescue(text || chineseTitle);
            }
        }

        return text;
    } catch (error) {
        console.error(`[Title Translation Error]`, error);
        // Nếu lỗi mạng/AI, cũng dùng cứu hộ nếu có thể
        if (hasChinese(chineseTitle)) return forceRescue(chineseTitle);
        throw error;
    }
}

/**
 * Buộc chuyển đổi Hán tự sang Hán Việt để đảm bảo sạch 100%
 */
function forceRescue(text: string): string {
    const repo = SyllableRepository.getInstance();
    // Comprehensive CJK range: Common, Ext A, Compatibility
    const cjkRegex = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+/g;
    return text.replace(cjkRegex, (match) => {
        return Array.from(match)
            .map(char => {
                const hv = repo.get(char);
                if (hv) return hv.charAt(0).toUpperCase() + hv.slice(1);
                // Fallback: If not in dict, maybe it's punctuation or special symbol, keep if not CJK
                return hasChinese(char) ? '' : char;
            })
            .join(' ');
    }).replace(/\s+/g, ' ').trim();
}

/**
 * Detect if a title contains Chinese characters
 */
export function hasChinese(text: string): boolean {
    return /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(text);
}

/**
 * Fix all chapter titles in a workspace that contain Chinese characters
 * Returns: { fixed: number, skipped: number, errors: string[] }
 */
export async function fixAllTitles(
    workspaceId: string,
    onProgress?: (current: number, total: number, title: string) => void
): Promise<{ fixed: number; skipped: number; errors: string[] }> {
    // Đảm bảo dữ liệu Hán Việt đã tải
    await SyllableRepository.getInstance().load("/dicts/ChinesePhienAmWords.txt");

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
