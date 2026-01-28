import { TermCandidate, TermType } from "./types";

export interface AIExtractorOptions {
    allowedTypes: TermType[];
    onProgress?: (message: string) => void;
}

export class AiExtractor {
    /**
     * Extracts named entities directly using AI from raw text.
     */
    public static async extract(
        text: string,
        options: AIExtractorOptions
    ): Promise<TermCandidate[]> {
        if (!text.trim()) return [];

        const { allowedTypes, onProgress } = options;

        // Split text if it's too long for a single prompt
        // roughly 3000 chars per chunk to stay safe with context limits and output space
        const CHUNK_SIZE = 4000;
        const chunks: string[] = [];
        for (let i = 0; i < text.length; i += CHUNK_SIZE) {
            chunks.push(text.slice(i, i + CHUNK_SIZE));
        }

        const seen = new Map<string, TermCandidate>();

        onProgress?.(`Bắt đầu trích xuất AI cho ${chunks.length} đoạn văn bản...`);

        for (let i = 0; i < chunks.length; i++) {
            onProgress?.(`Đang quét đoạn ${i + 1}/${chunks.length}...`);
            const chunkCandidates = await this._extractInternal(chunks[i], allowedTypes);

            // Merge results
            for (const cand of chunkCandidates) {
                const key = cand.chinese || cand.original;
                const existing = seen.get(key);
                if (existing) {
                    existing.count += 1;
                } else {
                    seen.set(key, {
                        ...cand,
                        id: `${cand.chinese || cand.original}_${cand.type}_${Math.random().toString(36).substring(2, 7)}`,
                        count: 1
                    });
                }
            }
        }

        return Array.from(seen.values());
    }

    private static async _extractInternal(
        textSnippet: string,
        allowedTypes: TermType[]
    ): Promise<TermCandidate[]> {
        const typeDefinitions = {
            [TermType.Person]: "Tên riêng người, nhân vật (VD: Tào Tháo, Lưu Bị).",
            [TermType.Location]: "Địa danh, thành trì, núi sông (VD: Lạc Dương, Trường Giang).",
            [TermType.Organization]: "Tông môn, bang phái, triều đình (VD: Thiếu Lâm, Cái Bang).",
            [TermType.Skill]: "Công pháp, chiêu thức, kỹ năng (VD: Thái Cực Quyền).",
            [TermType.Unknown]: "Các thuật ngữ quan trọng khác."
        };

        const activeTypesDescription = allowedTypes
            .map(type => `- ${type}: ${typeDefinitions[type as keyof typeof typeDefinitions] || ""}`)
            .join("\n");

        const prompt = `Bạn là chuyên gia trích xuất thực thể (NER) từ truyện Trung Quốc.
Nhiệm vụ: Tìm và trích xuất TẤT CẢ các thực thể quan trọng xuất hiện trong đoạn văn bản dưới đây.

CHỈ TRÍCH XUẤT CÁC LOẠI SAU (Sử dụng đúng nhãn loại này):
${activeTypesDescription}

VĂN BẢN GỐC:
"""
${textSnippet}
"""

YÊU CẦU ĐẦU RA (JSON BẮT BUỘC):
- Trả về JSON ARRAY chứa các object.
- Mỗi object: {"original": "Tên Hán Việt hoặc dịch", "chinese": "Chữ Hán gốc (nếu có)", "type": "Tên loại (Person/Location/...)", "description": "Giải nghĩa ngắn gọn vai trò hoặc ngữ cảnh (VD: Thuộc hạ của Tào Tháo, Thành chính của nước Thục...)"}
- Nếu văn bản có tiếng Trung, hãy lấy cả chữ Hán vào trường "chinese".
- Nếu văn bản chỉ có tiếng Việt, hãy đoán chữ Hán hoặc để trống trường "chinese".
- KHÔNG GIẢI THÍCH. KHÔNG CHÀO HỎI.

JSON:`;

        try {
            const { withKeyRotation } = await import("@/lib/gemini/client");
            const { extractResponseText, cleanJsonResponse } = await import("@/lib/gemini/helpers");
            const { DEFAULT_MODEL } = await import("@/lib/ai-models");

            const response = await withKeyRotation<unknown>({
                model: DEFAULT_MODEL,
                prompt: prompt,
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 2048,
                    responseMimeType: "application/json" // Force JSON mode if supported
                }
            });

            const rawText = extractResponseText(response);
            const jsonStr = cleanJsonResponse(rawText);

            if (!jsonStr) {
                console.warn("[AiExtractor] Empty JSON response from AI");
                return [];
            }

            let results: any;
            try {
                results = JSON.parse(jsonStr);
            } catch (e) {
                console.warn("[AiExtractor] JSON parse failed, attempting recovery...", e);
                // Recovery logic for truncated JSON
                if (jsonStr.trim().startsWith('[') && !jsonStr.trim().endsWith(']')) {
                    const lastBrace = jsonStr.lastIndexOf('}');
                    if (lastBrace !== -1) {
                        try {
                            results = JSON.parse(jsonStr.substring(0, lastBrace + 1) + ']');
                        } catch { return []; }
                    } else return [];
                } else return [];
            }

            // Standardize output to an array
            let finalArray: any[] = [];
            if (Array.isArray(results)) {
                finalArray = results;
            } else if (results && typeof results === 'object') {
                // Look for common keys like 'candidates', 'entities', 'results'
                const possible = results.candidates || results.entities || results.results || results.items || results.data;
                if (Array.isArray(possible)) finalArray = possible;
                else if (Object.keys(results).length > 0) {
                    // Maybe the object IS the list of types? Not standard, but let's be safe.
                    // For now, if no array found, we skip to avoid garbage.
                }
            }

            if (finalArray.length === 0) {
                console.log("[AiExtractor] AI returned empty list or incompatible format.");
                return [];
            }

            return finalArray.map((r: { original?: string; chinese?: string; type?: string; description?: string }) => ({
                id: '', // Will be set by caller
                original: (r.original || r.chinese || r.description || "").trim(),
                chinese: (r.chinese || "").trim(),
                type: (r.type as TermType) || TermType.Unknown,
                context: (r.description || "").trim(),
                count: 1,
                confidence: 100
            })).filter(cand => cand.original.length > 0);

        } catch (error) {
            console.error("[AiExtractor] Internal extraction failed:", error);
            return [];
        }
    }
}
