import { Type } from "@google/genai";
import { db } from "../db";
import { DEFAULT_MODEL } from "../ai-models";
import { AnalyzedEntity } from "./types";
import { withKeyRotation } from "./client";
import { extractResponseText } from "./helpers";

/**
 * Extract Glossary (Characters + Terms)
 */
export const extractGlossary = async (text: string, onLog?: (msg: string) => void, model: string = DEFAULT_MODEL) => {
    return withKeyRotation(async (ai) => {
        const prompt = `Trích xuất thực thể từ văn bản truyện để làm từ điển:
- Characters: Tên người (xác định Nam/Nữ, Vai trò).
- Terms: Chiêu thức, địa danh, vật phẩm đặc biệt.
- Yêu cầu: Trả về tên Hán Việt chuẩn.`;

        const response = await ai.models.generateContent({
            model: model,
            contents: text.substring(0, 30000),
            config: {
                systemInstruction: prompt,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        characters: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    original: { type: Type.STRING },
                                    translated: { type: Type.STRING },
                                    gender: { type: Type.STRING },
                                    description: { type: Type.STRING }
                                },
                                required: ["original", "translated"]
                            }
                        },
                        terms: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    original: { type: Type.STRING },
                                    translated: { type: Type.STRING },
                                    type: { type: Type.STRING }
                                },
                                required: ["original", "translated"]
                            }
                        }
                    }
                }
            }
        });

        const jsonText = extractResponseText(response);
        const result = JSON.parse(jsonText);

        // Enforce type="name" for characters
        if (result.characters && Array.isArray(result.characters)) {
            result.characters = result.characters.map((c: any) => ({ ...c, type: 'name' }));
        }
        return result;
    }, onLog);
};

/**
 * Categorize Terms
 */
export const categorizeTerms = async (terms: string[], onLog?: (msg: string) => void): Promise<{ original: string, category: string }[]> => {
    return withKeyRotation(async (ai) => {
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

        const response = await ai.models.generateContent({
            model: DEFAULT_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            original: { type: Type.STRING },
                            category: { type: Type.STRING }
                        },
                        required: ["original", "category"]
                    }
                }
            }
        });

        const jsonText = extractResponseText(response);
        return JSON.parse(jsonText || "[]");
    }, onLog);
};

/**
 * Translate Terms
 */
export const translateTerms = async (terms: string[], onLog?: (msg: string) => void): Promise<{ original: string, translated: string }[]> => {
    return withKeyRotation(async (ai) => {
        const prompt = `Translate terms to Vietnamese Hán Việt:
${terms.join('\n')}

Output: JSON array { "original", "translated" }`;

        const response = await ai.models.generateContent({
            model: DEFAULT_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            original: { type: Type.STRING },
                            translated: { type: Type.STRING }
                        },
                        required: ["original", "translated"]
                    }
                }
            }
        });

        const jsonText = extractResponseText(response);
        return JSON.parse(jsonText || "[]");
    }, onLog);
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
