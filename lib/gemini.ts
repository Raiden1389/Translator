import { GoogleGenAI, Type } from "@google/genai";
import { db } from "./db";
import { AI_MODELS, DEFAULT_MODEL } from "./ai-models";

// --- Types ---
export interface TranslationResult {
    translatedText: string;
    translatedTitle?: string;
    stats?: {
        terms: number;
        characters: number;
    };
}

export interface TranslationLog {
    timestamp: Date;
    message: string;
    type: 'info' | 'error' | 'success';
}

// --- Helper: Key Rotation (Giữ nguyên logic cũ của mày) ---
const getAvailableKeys = async (): Promise<string[]> => {
    const primaryKey = await db.settings.get("apiKeyPrimary");
    const poolKeys = await db.settings.get("apiKeyPool");
    const keys: string[] = [];
    if (primaryKey?.value) keys.push(primaryKey.value);
    if (poolKeys?.value) {
        const pool = poolKeys.value.split(/[\n,;]+/).map((k: string) => k.trim()).filter((k: string) => k.length > 10);
        keys.push(...pool);
    }
    return Array.from(new Set(keys)).filter(k => !!k);
};

async function withKeyRotation<T>(fn: (ai: GoogleGenAI) => Promise<T>, onLog?: (message: string) => void): Promise<T> {
    const keys = await getAvailableKeys();
    if (keys.length === 0) throw new Error("Missing API Key.");
    let lastError: any = null;
    for (const key of keys) {
        try {
            const ai = new GoogleGenAI({ apiKey: key });
            return await fn(ai);
        } catch (error: any) {
            lastError = error;
            console.warn(`Rotating key due to error...`);
            continue;
        }
    }
    throw lastError;
}

// --- Main Translation Function ---
export const translateChapter = async (
    text: string,
    onLog: (log: TranslationLog) => void,
    onSuccess: (result: TranslationResult) => void,
    customInstruction?: string
) => {
    const modelSetting = await db.settings.get("aiModel");
    let aiModel = modelSetting?.value || DEFAULT_MODEL;

    // Clean text: Remove excessive whitespace to save tokens
    text = text.trim().replace(/\n\s*\n/g, '\n\n');

    // 1. Get Glossary & Blacklist
    const dict = await db.dictionary.toArray();
    const blacklist = await db.blacklist.toArray();
    const blockedWords = new Set(blacklist.map(b => b.word.toLowerCase()));

    // Lọc glossary: Bỏ blacklist, chỉ lấy từ xuất hiện, LIMIT 50 terms để tiết kiệm tokens
    const relevantDict = dict
        .filter(d => !blockedWords.has(d.original.toLowerCase()) && text.includes(d.original))
        .sort((a, b) => b.original.length - a.original.length)
        .slice(0, 50); // Limit to top 50 most relevant terms

    const glossaryContext = relevantDict.length > 0
        ? `\n\nTHUẬT NGỮ (ƯU TIÊN DÙNG):\n${relevantDict.map(d => `${d.original} -> ${d.translated}`).join('\n')}`
        : '';

    // 2. System Instruction (Clean separation: Preset = Style, System = Rules)
    const styleInstruction = customInstruction || "Mày là dịch giả chuyên nghiệp Trung - Việt. Dịch tự nhiên, giữ nguyên tên riêng.";

    const fullInstruction = `${styleInstruction}${glossaryContext}

QUY TẮC:
1. Dịch sát nghĩa 100%, không sót chữ Hán
2. Ngôi 3: Nam='Hắn', Nữ='Nàng'/'Cô ta'. Cấm 'Anh'/'Chị' trong dẫn truyện
3. Cấm: giải thích, phóng tác, lặp lại, bình luận
4. Chỉ trả JSON theo schema`;

    try {
        onLog({ timestamp: new Date(), message: `Đang dịch với model: ${aiModel}...`, type: 'info' });

        const result = await withKeyRotation(async (ai) => {
            const response = await ai.models.generateContent({
                model: aiModel,
                contents: text,
                config: {
                    systemInstruction: fullInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            translatedTitle: { type: Type.STRING },
                            translatedText: { type: Type.STRING }
                        },
                        required: ["translatedTitle", "translatedText"]
                    }
                }
            });

            const rawResponse = response as any;
            let jsonText = typeof rawResponse.text === 'function' ? rawResponse.text() : rawResponse.text;
            if (!jsonText) jsonText = rawResponse.candidates?.[0]?.content?.parts?.[0]?.text;

            return JSON.parse(jsonText) as TranslationResult;
        }, (msg) => onLog({ timestamp: new Date(), message: msg, type: 'info' }));

        // 3. Stats & Success
        let termUsage = 0;
        let charUsage = 0;
        if (result.translatedText) {
            const lowerText = result.translatedText.toLowerCase();
            relevantDict.forEach(d => {
                if (lowerText.includes(d.translated.toLowerCase())) {
                    if (d.type === 'character' || d.type === 'name') charUsage++;
                    else termUsage++;
                }
            });
        }

        result.stats = { terms: termUsage, characters: charUsage };
        onLog({ timestamp: new Date(), message: "Dịch xong!", type: 'success' });
        onSuccess(result);

    } catch (e: any) {
        onLog({ timestamp: new Date(), message: `Lỗi: ${e.message}`, type: 'error' });
        throw e;
    }
};

// --- Extract Glossary (Giữ nguyên cấu trúc xịn để mày dùng sau) ---
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
        const jsonText = typeof (response as any).text === 'function' ? (response as any).text() : (response as any).text;
        return JSON.parse(jsonText);
    }, onLog);
};

// --- Missing Exports for DictionaryTab ---
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

        const rawResponse = response as any;
        const jsonText = typeof rawResponse.text === 'function' ? rawResponse.text() : rawResponse.text;
        return JSON.parse(jsonText || "[]");
    }, onLog);
};

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

        const rawResponse = response as any;
        const jsonText = typeof rawResponse.text === 'function' ? rawResponse.text() : rawResponse.text;
        return JSON.parse(jsonText || "[]");
    }, onLog);
};

// --- Missing Exports for CharacterSidebar ---
export interface AnalyzedEntity {
    src: string;
    dest: string;
    category: 'character' | 'weapon' | 'item' | 'location' | 'organization' | 'ability' | 'plant' | 'beast' | 'phenomenon' | 'honorific' | 'phrase' | 'idiom' | 'other';
    contextLabel?: string;
    reason: string;
    metadata?: any;
}

export const analyzeEntities = async (text: string, onLog?: (msg: string) => void, model: string = DEFAULT_MODEL): Promise<AnalyzedEntity[]> => {
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
    const blacklist = await db.blacklist.toArray();
    const blockedSet = new Set(blacklist.map(b => b.word.toLowerCase()));
    return entities.filter(e => !blockedSet.has(e.src.toLowerCase()));
};

// --- AI Inspector (Quality Control) ---
export interface InspectionIssue {
    original: string;
    suggestion: string;
    type: 'untranslated' | 'pronoun' | 'grammar' | 'spelling' | 'other';
    reason: string;
}

export const inspectChapter = async (text: string, onLog?: (msg: string) => void): Promise<InspectionIssue[]> => {
    // 1. Get Glossary to avoid false positives
    const dict = await db.dictionary.toArray();
    const blacklist = await db.blacklist.toArray();
    const blockedWords = new Set(blacklist.map(b => b.word.toLowerCase()));

    // Filter relevant terms present in text
    const relevantDict = dict.filter(d =>
        !blockedWords.has(d.original.toLowerCase()) &&
        text.includes(d.translated) // Check if the TRANSLATED term is in the text (since input is translated text)
    );

    // Create Context String
    const glossaryContext = relevantDict.length > 0
        ? `\n\nDANH SÁCH THUẬT NGỮ ĐÚNG (KHÔNG BÁO LỖI): \n${relevantDict.map(d => `- "${d.translated}" (Gốc: ${d.original})`).join('\n')}`
        : '';

    return withKeyRotation(async (ai) => {
        const prompt = `Bạn là biên tập viên khó tính (Strict Editor). Hãy rà soát văn bản dịch này và tìm lỗi:
- Untranslated: Những chữ Hán hoặc cụm từ chưa được dịch (tuyệt đối ưu tiên).
- Pronoun: Xưng hô bất nhất (đang huynh đệ chuyển sang anh em, hoặc ngôi thứ loạn).
- Grammar: Lỗi ngữ pháp nghiêm trọng khiến câu vô nghĩa.

${glossaryContext}

Input:
"${text.substring(0, 30000)}"

Yêu cầu:
- Chỉ báo lỗi nếu chắc chắn 100%. Nếu nghi ngờ thì bỏ qua.
- Strict Mode: Không báo những lỗi nhỏ nhặt về văn phong.
- BỎ QUA các từ có trong "DANH SÁCH THUẬT NGỮ ĐÚNG".

Output JSON:
[
  { "original": "text lỗi", "suggestion": "đề xuất sửa", "type": "untranslated", "reason": "chưa dịch" }
]`;

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            original: { type: Type.STRING },
                            suggestion: { type: Type.STRING },
                            type: { type: Type.STRING },
                            reason: { type: Type.STRING }
                        },
                        required: ["original", "suggestion", "type", "reason"]
                    }
                }
            }
        });

        const rawResponse = response as any;
        const jsonText = typeof rawResponse.text === 'function' ? rawResponse.text() : rawResponse.text;
        return JSON.parse(jsonText || "[]");
    }, onLog);
};
