/**
 * Post-Processing Module
 * Handles corrections, validation, and final cleanup
 */

import { db, DictionaryEntry } from "../../db";
import { TranslationResult } from "../types";
import { finalSweep } from "../contentProcessor";

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
    relevantDict: DictionaryEntry[]
): Promise<TranslationResult> {
    // 🔥 VALIDATION: Nếu Title còn chữ Hán thì báo lỗi
    if (parsed.translatedTitle && /[\u4e00-\u9fff]/.test(parsed.translatedTitle)) {
        throw new Error("CẢNH BÁO: Phát hiện chữ Hán trong Tiêu đề! Gemini đang trả về dữ liệu rác.");
    }

    // Apply Auto-Corrections (Universal Logic: NFC + LongestFirst + CasePreserve)
    const corrections = await db.corrections.where('workspaceId').equals(workspaceId).toArray();
    if (corrections.length > 0) {
        const { applyAllCorrections } = await import("../contentProcessor");
        parsed.translatedText = applyAllCorrections(parsed.translatedText, corrections);
        if (parsed.translatedTitle) {
            parsed.translatedTitle = applyAllCorrections(parsed.translatedTitle, corrections);
        }
    }

    // Final Sweep (Clean up brackets, explanations, and structure)
    parsed.translatedText = finalSweep(parsed.translatedText, relevantDict);
    if (parsed.translatedTitle) {
        parsed.translatedTitle = finalSweep(parsed.translatedTitle, relevantDict);
    }

    // 🛡️ FALLBACK: Nếu mọi nỗ lực parse đều thất bại, không để trống title
    if (!parsed.translatedTitle || parsed.translatedTitle.trim() === "") {
        parsed.translatedTitle = "Chương: (Tiêu đề chưa xác định)";
    }

    return parsed;
}
