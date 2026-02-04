import { db } from "../db";
import { withKeyRotation } from "./client";
import { DEFAULT_MODEL } from "../ai-models";
import { SyllableRepository } from "../repositories/syllable-repo";
import { VietPhraseRepository } from "../repositories/viet-phrase-repo";
import { extractResponseText, scrubAIChatter } from "./contentProcessor";

/**
 * Detect if a title contains Chinese characters
 * Uses a broad range of CJK characters for maximum safety
 */
export function hasChinese(text: string): boolean {
    if (!text) return false;
    // Common Han (U+4E00-U+9FFF) + Ext A (U+3400-U+4DBF) + Compatibility (U+F900-U+FAFF)
    // Extended to cover Ext B-G (U+20000-U+2EBEF) via surrogate pairs
    return /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]|[\ud840-\ud87f][\udc00-\udfff]/.test(text);
}

/**
 * Nuclear Rescue: Forces conversion to VietPhrase/Hán Việt to ensure 100% Latin
 */
async function forceRescue(text: string): Promise<string> {
    console.log(`[Title Fixer] ☢️ Nuclear Rescue triggered for: "${text}"`);
    const vpRepo = VietPhraseRepository.getInstance();
    const sylRepo = SyllableRepository.getInstance();

    // Ensure dicts are loaded
    await Promise.all([
        sylRepo.load("/dicts/ChinesePhienAmWords.txt"),
        vpRepo.load("/dicts/VietPhrase.txt")
    ]);

    // Step 1: Broad VietPhrase conversion (handles common terms and names)
    let translated = vpRepo.convert(text);

    // Step 2: Individual Han character fallback (Hán Việt)
    // Use traditional Unicode ranges for Webpack compatibility
    const hanRegex = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]|[\ud840-\ud87f][\udc00-\udfff]/g;

    translated = translated.replace(hanRegex, (char) => {
        const hv = sylRepo.get(char);
        if (hv) return " " + hv.charAt(0).toUpperCase() + hv.slice(1) + " ";
        return ""; // Completely remove unknown Han chars to ensure "No Chinese" rule
    });

    const finalResult = translated.replace(/\s+/g, ' ').trim();
    console.log(`[Title Fixer] ✅ Nuclear Rescue result: "${finalResult}"`);
    return finalResult || "Tiêu đề không rõ"; // Fallback if result is somehow empty
}

/**
 * Translate ONLY the chapter title (ultra-cheap, ~$0.000005/title)
 */
export async function translateTitleOnly(chineseTitle: string, retryCount = 0): Promise<string> {
    const modelSetting = await db.settings.get("aiModel");
    const aiModel = (modelSetting?.value || DEFAULT_MODEL) as string;

    const prompt = `[QUY TẮC TIÊU ĐỀ - BẮT BUỘC]
Bạn là chuyên gia dịch thuật và Hán Việt.
Nhiệm vụ: Dịch tiêu đề chương này sang Tiếng Việt.

Tiêu đề gốc: "${chineseTitle}"

QUY TẮC:
1. CHỈ TRẢ VỀ DUY NHẤT TIÊU ĐỀ TIẾNG VIỆT.
2. TUYỆT ĐỐI KHÔNG ĐƯỢC GIỮ LẠI BẤT KỲ CHỮ HÁN NÀO.
3. Nếu không biết dịch, hãy phiên âm Hán Việt.

VÍ DỤ ĐÚNG: "Chương 2: Thuận Thế"`;

    try {
        const result = (await withKeyRotation<any>(
            {
                model: aiModel.trim(),
                prompt,
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 100,
                }
            },
            (msg: string) => console.log(`[Title Fixer] ${msg}`)
        ));

        let text = extractResponseText(result);
        text = scrubAIChatter(text).trim().replace(/^"|"$/g, '');

        if (hasChinese(text)) {
            if (retryCount < 1) {
                return translateTitleOnly(chineseTitle, retryCount + 1);
            } else {
                return await forceRescue(text || chineseTitle);
            }
        }

        return text;
    } catch (error) {
        console.error(`[Title Fixer] error:`, error);
        if (hasChinese(chineseTitle)) return await forceRescue(chineseTitle);
        return chineseTitle; // Return original if it somehow has no Chinese but failed AI
    }
}

/**
 * Fix all chapter titles in a workspace
 */
export async function fixAllTitles(
    workspaceId: string,
    onProgress?: (current: number, total: number, title: string) => void
): Promise<{ fixed: number; skipped: number; errors: string[] }> {

    const chapters = await db.chapters
        .where('workspaceId')
        .equals(workspaceId)
        .toArray();

    // Fix those where either raw title OR translated title has Chinese
    // IMPORTANT: Only fix chapters that have been translated/reviewing or already have a title_translated field.
    // This prevents translating titles for chapters that the user hasn't translated the content for yet.
    const needFix = chapters.filter(ch =>
        (ch.status === 'translated' || ch.status === 'reviewing' || !!ch.title_translated) &&
        hasChinese(ch.title_translated || ch.title)
    );
    const stats = { fixed: 0, skipped: 0, errors: [] as string[] };

    for (let i = 0; i < needFix.length; i++) {
        const chapter = needFix[i];
        const originalTitle = chapter.title_translated || chapter.title;

        try {
            onProgress?.(i + 1, needFix.length, originalTitle);

            const newTitle = await translateTitleOnly(originalTitle);

            if (!newTitle || hasChinese(newTitle)) {
                // If it STILL has Chinese even after forceRescue, something is very wrong with the regexes
                stats.errors.push(`Chương ${chapter.order}: Thất bại khi diệt chữ Hân (Sau cứu hộ)`);
                stats.skipped++;
                continue;
            }

            await db.chapters.update(chapter.id!, { title_translated: newTitle });
            stats.fixed++;

            // Minimal throttle
            await new Promise(r => setTimeout(r, 50));
        } catch (error: any) {
            stats.errors.push(`Chương ${chapter.order}: ${error.message || 'Lỗi không xác định'}`);
            stats.skipped++;
        }
    }

    return stats;
}
