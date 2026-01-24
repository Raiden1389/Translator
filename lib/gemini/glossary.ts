import { db } from "../db";
import { DEFAULT_MODEL } from "../ai-models";
import { AnalyzedEntity } from "./types";
import { withKeyRotation } from "./client";
import { extractResponseText, cleanJsonResponse } from "./helpers";

/**
 * Extract Glossary (Characters + Terms)
 */
export const extractGlossary = async (text: string, onLog?: (msg: string) => void, model: string = DEFAULT_MODEL): Promise<{
    characters: any[],
    terms: any[]
}> => {
    const prompt = `Trích xuất thực thể từ văn bản truyện để làm từ điển dịch thuật Hán-Việt chuyên nghiệp.
YÊU CẦU:
1. "characters": Danh sách các nhân vật riêng biệt (tên người).
2. "terms": Danh sách các thuật ngữ đặc biệt (địa danh, công pháp, vật phẩm, tổ chức).
3. LUÔN ƯU TIÊN tên Hán Việt chuẩn cho phần "translated".
4. "description": Giải nghĩa ngắn gọn ngữ cảnh của từ đó trong chương này.
5. "type": Phân loại cụ thể (cho terms: location, skill, item, organization, other).

MẪU PHẢN HỒI (JSON BẮT BUỘC):
{
  "characters": [
    { "original": "tên gốc", "translated": "tên Hán Việt", "gender": "male|female|unknown", "description": "vai trò/ngữ cảnh" }
  ],
  "terms": [
    { "original": "từ gốc", "translated": "nghĩa Hán Việt", "type": "skill", "description": "mô tả chiêu thức" }
  ]
}

LƯU Ý: Nếu không tìm thấy thực thể nào đáng chú ý, trả về các mảng trống. Không được thêm bất kỳ lời dẫn nào ngoài JSON.`;

    try {
        const response: any = await withKeyRotation({
            model,
            systemInstruction: prompt,
            prompt: `TRÍCH XUẤT TỪ ĐOẠN VĂN SAU:\n\n${text.substring(0, 15000)}`,
            generationConfig: {
                responseMimeType: "application/json",
            }
        }, onLog);

        const rawText = extractResponseText(response);
        const jsonStr = cleanJsonResponse(rawText);

        let glossaryData = { characters: [], terms: [] };

        try {
            glossaryData = JSON.parse(jsonStr);
        } catch (e) {
            console.error("Failed to parse glossary JSON", e, jsonStr);
            // Fallback: If JSON fail but we have raw text, we might try regex here?
            // For now, return empty to avoid crashes
        }

        // Clean and normalize
        const finalCharacters = (Array.isArray(glossaryData.characters) ? glossaryData.characters : [])
            .map((c: any) => ({
                ...c,
                type: 'name',
                original: c.original?.trim(),
                translated: c.translated?.trim()
            }))
            .filter(c => c.original && c.translated);

        const finalTerms = (Array.isArray(glossaryData.terms) ? glossaryData.terms : [])
            .map((t: any) => ({
                ...t,
                original: t.original?.trim(),
                translated: t.translated?.trim()
            }))
            .filter(t => t.original && t.translated);

        return {
            characters: finalCharacters,
            terms: finalTerms
        };
    } catch (error) {
        console.error("Glossary extraction fatal error:", error);
        return { characters: [], terms: [] };
    }
};

/**
 * Categorize Terms
 */
export const categorizeTerms = async (terms: string[], onLog?: (msg: string) => void): Promise<{ original: string, category: string }[]> => {
    const prompt = `Classify terms:
- character (Tên người)
- location (Địa danh)
- organization (Tổ chức)
- cultivation (Tu vi)
- skill (Công pháp)
- item (Vật phẩm)
- beast (Yêu thú)
- plant (Dược thảo)
- trash (Rác)
- other (Khác)

Terms:
${terms.join('\n')}

Output: JSON array { "original", "category" }`;

    const response: any = await withKeyRotation({
        model: DEFAULT_MODEL,
        prompt,
        generationConfig: {
            responseMimeType: "application/json",
        }
    }, onLog);

    try {
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        return JSON.parse(text);
    } catch {
        return [];
    }
};

/**
 * Translate Terms
 */
export const translateTerms = async (terms: string[], onLog?: (msg: string) => void): Promise<{ original: string, translated: string }[]> => {
    const prompt = `Translate terms to Vietnamese Hán Việt:
${terms.join('\n')}

Output: JSON array { "original", "translated" }`;

    const response: any = await withKeyRotation({
        model: DEFAULT_MODEL,
        prompt,
        generationConfig: {
            responseMimeType: "application/json",
        }
    }, onLog);

    try {
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        return JSON.parse(text);
    } catch {
        return [];
    }
};

/**
 * Analyze Entities (for CharacterSidebar)
 */
export const analyzeEntities = async (workspaceId: string, text: string, onLog?: (msg: string) => void, model: string = DEFAULT_MODEL): Promise<AnalyzedEntity[]> => {
    const raw = await extractGlossary(text, onLog, model);
    const entities: AnalyzedEntity[] = [];

    if (raw?.characters) {
        raw.characters.forEach((char: any) => {
            entities.push({
                src: char.original,
                dest: char.translated,
                category: 'character',
                reason: char.description || '',
                metadata: char
            });
        });
    }

    if (raw?.terms) {
        raw.terms.forEach((term: any) => {
            entities.push({
                src: term.original,
                dest: term.translated,
                category: (term.type as any) || 'other',
                reason: 'Thuật ngữ',
                metadata: term
            });
        });
    }

    // Filter against blacklist
    const blacklist = await db.blacklist.where('workspaceId').equals(workspaceId).toArray();
    const blockedSet = new Set(blacklist.map(b => b.word.toLowerCase()));
    return entities.filter(e => !blockedSet.has(e.src.toLowerCase()));
};
