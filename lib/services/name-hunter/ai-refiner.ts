import { TermCandidate, TermType } from "./types";

export class AIRefiner {
    /**
     * Re-judges "Unknown" or low-confidence candidates using the AI Model.
     * We batch them to save tokens and time.
     */
    public static async refine(
        candidates: TermCandidate[],
        contextText: string,
        onProgress?: (message: string) => void
    ): Promise<TermCandidate[]> {
        if (candidates.length === 0) return candidates;

        const BATCH_SIZE = 40;
        const totalBatches = Math.ceil(candidates.length / BATCH_SIZE);
        const allRefined: TermCandidate[] = [];

        console.log(`[AIRefiner] Splitting ${candidates.length} candidates into ${totalBatches} batches.`);

        for (let i = 0; i < totalBatches; i++) {
            const batch = candidates.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
            const batchProgress = (msg: string) => onProgress?.(`[Batch ${i + 1}/${totalBatches}] ${msg}`);

            try {
                const refinedBatch = await Promise.race([
                    this._refineInternal(batch, contextText, batchProgress),
                    new Promise<TermCandidate[]>((_, reject) =>
                        setTimeout(() => reject(new Error(`Batch ${i + 1} timed out (60s)`)), 60000)
                    )
                ]);
                allRefined.push(...refinedBatch);
            } catch (error) {
                console.error(`[AIRefiner] Batch ${i + 1} failed:`, error);
                // Return current batch unrefined on failure
                allRefined.push(...batch);
            }
        }

        return allRefined;
    }

    private static async _refineInternal(
        candidates: TermCandidate[],
        contextText: string,
        onProgress?: (message: string) => void
    ): Promise<TermCandidate[]> {
        onProgress?.(`Đang soạn thảo danh sách ${candidates.length} nhân vật...`);
        console.log(`[AIRefiner] Starting refinement for ${candidates.length} candidates...`);

        // 1. Prepare Prompt
        const persona = "Bạn là một chuyên gia hiệu đính truyện võ hiệp, tiên hiệp và lịch sử cổ đại.";
        const prompt = `${persona}
Nhiệm vụ: Phân loại danh sách từ dưới đây vào các nhóm: Person, Location, Organization, Skill, Junk.

QUY TẮC PHÂN LOẠI:
- Person: Tên riêng người, nhân vật (VD: Tào Tháo, Lưu Bị, Quan Vũ).
- Location: Địa danh, thành trì, quận huyện, núi sông (VD: Thọ Xuân, Giang Đông, Lạc Dương, Trường Giang, núi Võ Đang).
- Organization: Tông môn, bang phái, quân đội, triều đình (VD: Thiếu Lâm, Cái Bang, Tào quân).
- Skill: Công pháp, chiêu thức, kỹ năng (VD: Giáng Long Thập Bát Chưởng, Thái Cực Quyền).
- Junk: Từ rác, động từ, danh từ chung, hoặc từ ghép sai (VD: Đi tới, Nói rằng, Thanh kiếm).

DANH SÁCH CẦN PHÂN LOẠI:
${candidates.map(c => `- ${c.original}`).join('\n')}

LƯU Ý: Mày là một JSON API server. KHÔNG GIẢI THÍCH, KHÔNG CHÀO HỎI. 
Chỉ trả về duy nhất một mảng JSON các object.
Mỗi object có "original" (tên gốc) và "type" (loại).
JSON ARRAY:`;

        try {
            onProgress?.(`Đang kết nối AI...`);
            const { withKeyRotation } = await import("@/lib/gemini/client");
            const { extractResponseText, cleanJsonResponse } = await import("@/lib/gemini/helpers");
            const { DEFAULT_MODEL } = await import("@/lib/ai-models");

            const response = await withKeyRotation<unknown>({
                model: DEFAULT_MODEL,
                prompt: prompt,
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 2048,
                }
            });

            onProgress?.(`Đang phân tích kết quả...`);
            const rawText = extractResponseText(response);

            // Use the helper for robust JSON extraction
            const jsonStr = cleanJsonResponse(rawText);

            let refinedResults: { original: string; type: TermType }[];
            try {
                refinedResults = JSON.parse(jsonStr);

                // Fallback: If it's an object with a candidates/results array
                if (!Array.isArray(refinedResults) && typeof refinedResults === 'object' && refinedResults !== null) {
                    const obj = refinedResults as Record<string, unknown>;
                    const possibleArray = obj.candidates || obj.results || obj.data;
                    if (Array.isArray(possibleArray)) {
                        refinedResults = possibleArray as { original: string; type: TermType }[];
                    }
                }
            } catch {
                console.group("AIRefiner Parse Error");
                console.info("Raw Text:", rawText);
                console.info("Target String:", jsonStr);
                console.groupEnd();
                throw new Error("AI returned invalid JSON formatting.");
            }

            if (!Array.isArray(refinedResults)) {
                throw new Error("AI response parsed successfully but is not an array.");
            }

            onProgress?.(`Đã đồng bộ hóa ${refinedResults.length} thực thể!`);
            const resultMap = new Map(refinedResults.map(r => [r.original, r]));

            return candidates.map(c => {
                const refined = resultMap.get(c.original);
                if (refined) {
                    return {
                        ...c,
                        type: (refined.type || c.type) as TermType,
                        confidence: 100
                    };
                }
                return c;
            });

        } catch (error: unknown) {
            console.error("AI Refining error:", error);
            throw error;
        }
    }
}
