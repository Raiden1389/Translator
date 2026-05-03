/**
 * Post-Processing Module
 * Handles corrections, validation, and final cleanup
 */

import { db, DictionaryEntry, CorrectionEntry } from "../../db";
import { TranslationResult } from "../types";
import { finalSweep } from "../contentProcessor";
import { normalizeTitleCase } from "../../utils/title-normalizer";
import { normalizeChapterTitle } from "../../utils/chapter-title-normalizer";

export interface PostProcessingOptions {
    originalTitle?: string;
    corrections?: CorrectionEntry[];
}

function finalizeTitle(title: string, originalTitle?: string): string {
    if (!title.trim()) {
        return originalTitle
            ? normalizeChapterTitle("", originalTitle)
            : "Chương: (Tiêu đề chưa xác định)";
    }

    return originalTitle
        ? normalizeChapterTitle(title, originalTitle)
        : normalizeTitleCase(title);
}

/**
 * Apply post-processing to translation result
 * 
 * Steps:
 * 1. Validate title (no Chinese characters)
 * 2. Apply user corrections
 * 3. Final sweep (clean up artifacts)
 * 4. Fallback for empty title
 */
export async function applyPostProcessing(
    parsed: TranslationResult,
    workspaceId: string,
    relevantDict: DictionaryEntry[],
    options: PostProcessingOptions = {}
): Promise<TranslationResult> {
    // 🔥 AUTO-FIX: Nếu Title còn chữ Hán → Tự động fix bằng translateTitleOnly
    if (parsed.translatedTitle && /[\u4e00-\u9fff]/.test(parsed.translatedTitle)) {
        console.warn(`⚠️ [POST-PROCESSOR] Title contains Chinese characters: "${parsed.translatedTitle}" - Auto-fixing...`);

        try {
            const { translateTitleOnly } = await import("../titleFixer");
            const fixedTitle = await translateTitleOnly(parsed.translatedTitle);

            // Verify fixed title doesn't have Chinese
            if (fixedTitle && !/[\u4e00-\u9fff]/.test(fixedTitle)) {
                parsed.translatedTitle = fixedTitle;
                console.log(`✅ [POST-PROCESSOR] Title auto-fixed: "${fixedTitle}"`);
            } else {
                // If still has Chinese after fix, use fallback
                console.error(`❌ [POST-PROCESSOR] Title fix failed, using fallback`);
                parsed.translatedTitle = "Chương: (Tiêu đề chưa dịch)";
            }
        } catch (error) {
            console.error(`❌ [POST-PROCESSOR] Title fix error:`, error);
            parsed.translatedTitle = "Chương: (Tiêu đề chưa dịch)";
        }
    }

    // Apply Auto-Corrections (Universal Logic: NFC + LongestFirst + CasePreserve)
    const corrections = options.corrections ?? await db.corrections.where('workspaceId').equals(workspaceId).toArray();
    if (corrections.length > 0) {
        const { applyAllCorrections } = await import("../contentProcessor");
        parsed.translatedText = applyAllCorrections(parsed.translatedText, corrections);
        if (parsed.translatedTitle) {
            parsed.translatedTitle = applyAllCorrections(parsed.translatedTitle, corrections);
        }
    }

    // Final Sweep — ONLY for body content (heavy: glossary enforce, capitalization, structure repair)
    parsed.translatedText = finalSweep(parsed.translatedText, relevantDict);
    if (parsed.translatedTitle) {
        // Title: light cleanup only — no glossary enforce, no structure repair, no idiom strip
        const { normalizeVietnameseContent } = await import("../contentProcessor");
        const { scrubAIChatter } = await import("../contentProcessor");
        const cleanedTitle = scrubAIChatter(normalizeVietnameseContent(parsed.translatedTitle));
        parsed.translatedTitle = finalizeTitle(cleanedTitle, options.originalTitle);
    }

    // 🛡️ FALLBACK: Nếu mọi nỗ lực parse đều thất bại, không để trống title
    if (!parsed.translatedTitle || parsed.translatedTitle.trim() === "") {
        parsed.translatedTitle = finalizeTitle("", options.originalTitle);
    }

    // 🔍 QUALITY CHECK: Detect leftover Chinese in body (common with non-thinking mode)
    const { detectChineseLeftover } = await import("../text/post-cleanup");
    const chineseCheck = detectChineseLeftover(parsed.translatedText);
    if (chineseCheck.hasChinese) {
        console.warn(`⚠️ [POST-PROCESSOR] Body contains ${chineseCheck.count} Chinese chars (${(chineseCheck.ratio * 100).toFixed(1)}%) — may need re-translation`);
    }

    return parsed;
}
