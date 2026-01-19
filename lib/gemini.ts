import { GoogleGenAI, Type } from "@google/genai";
import { db } from "./db";
import { AI_MODELS, DEFAULT_MODEL } from "./ai-models";

/**
 * Record API usage metadata to IndexedDB
 */
async function recordUsage(modelId: string, usage: any) {
    try {
        if (!usage) return;
        const modelInfo = AI_MODELS.find(m => m.value === modelId.trim()) || AI_MODELS[0];
        const inputTokens = usage.promptTokenCount || 0;
        const outputTokens = usage.candidatesTokenCount || 0;

        // Simple cost calculation (per 1M tokens)
        const cost = ((inputTokens * (modelInfo.inputPrice || 0)) / 1_000_000) +
            ((outputTokens * (modelInfo.outputPrice || 0)) / 1_000_000);

        const existing = await db.apiUsage.get(modelInfo.value);
        if (existing) {
            await db.apiUsage.update(modelInfo.value, {
                inputTokens: (existing.inputTokens || 0) + inputTokens,
                outputTokens: (existing.outputTokens || 0) + outputTokens,
                totalCost: (existing.totalCost || 0) + cost,
                updatedAt: new Date()
            });
        } else {
            await db.apiUsage.add({
                model: modelInfo.value,
                inputTokens,
                outputTokens,
                totalCost: cost,
                updatedAt: new Date()
            });
        }
    } catch (err) {
        // Silently fail usage recording
    }
}

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
            // Standardizing on v1beta for feature support, with flexibility for custom endpoints.
            const ai = new GoogleGenAI({
                apiKey: key,
                apiVersion: 'v1beta'
            });

            return await fn(ai);
        } catch (error: any) {
            lastError = error;
            continue;
        }
    }
    throw lastError;
}

// --- Main Translation Function ---
export const translateChapter = async (
    workspaceId: string, // Added
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
    const dict = await db.dictionary.where('workspaceId').equals(workspaceId).toArray();
    const blacklist = await db.blacklist.where('workspaceId').equals(workspaceId).toArray();
    const blockedWords = new Set(blacklist.map(b => b.word.toLowerCase()));

    // Lọc glossary: Bỏ blacklist, chỉ lấy từ xuất hiện, LIMIT 50 terms để tiết kiệm tokens
    const relevantDict = dict
        .filter(d => !blockedWords.has(d.original.toLowerCase()) && text.includes(d.original))
        .sort((a, b) => b.original.length - a.original.length)
        .slice(0, 50); // Limit to top 50 most relevant terms

    const glossaryContext = relevantDict.length > 0
        ? `\n\nTHUẬT NGỮ (ƯU TIÊN DÙNG):\n${relevantDict.map(d => `${d.original} -> ${d.translated}`).join('\n')}`
        : '';

    // 2. System Instruction (Static rules + Style + Context)
    const styleInstruction = customInstruction || "Mày là dịch giả chuyên nghiệp Trung - Việt. Dịch tự nhiên, giữ nguyên tên riêng.";

    // Static rules moved to systemInstruction for model consistency and potential caching
    const systemRules = `
QUY TẮC BẮT BUỘC (CRITICAL):
1. NGÔN NGỮ ĐẦU RA: 100% TIẾNG VIỆT.
2. TUYỆT ĐỐI KHÔNG TRẢ VỀ TIẾNG ANH (NO ENGLISH OUTPUT).
3. Dịch sát nghĩa, đầy đủ, không bỏ sót.
4. Giữ nguyên tên riêng (Hán Việt).
5. Ngôi kể chính xác (Hắn/Nàng/Ta/Ngươi).
6. Chỉ trả về JSON hợp lệ.
7. GIỮ NGUYÊN CẤU TRÚC ĐOẠN VĂN: Tuyệt đối không gộp dòng. Mỗi đoạn văn gốc là một dòng trong output.
8. Giữ nguyên cấu trúc danh sách theo chiều dọc.
9. Giữ nguyên tuyệt đối các ký hiệu hệ thống trong dấu ngoặc vuông [].
10. TUYỆT ĐỐI KHÔNG Xuống dòng SAU dấu đóng ngoặc vuông ].
11. CẤM TUYỆT ĐỐI VĂN BẢN THỪA (NO CHATTER).
12. CHỈ TRẢ VỀ JSON.

VÍ DỤ ĐÚNG (BẮT BUỘC): 
"...mắt hắn chợt sáng lên. [Phát hiện công thức vũ khí 'Trường mâu'] Công thức chế tạo!"`;

    const fullInstruction = `${styleInstruction}\n\n${systemRules}${glossaryContext}`;

    try {
        onLog({ timestamp: new Date(), message: `Đang dịch với model: ${aiModel}...`, type: 'info' });

        const result = await withKeyRotation(async (ai) => {
            const response = await ai.models.generateContent({
                model: aiModel.trim(),
                contents: [{ role: 'user', parts: [{ text: text }] }],
                config: {
                    systemInstruction: fullInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            translatedTitle: {
                                type: Type.STRING,
                                description: "Tiêu đề chương dịch sang Tiếng Việt (Vietnamese Title)"
                            },
                            translatedText: {
                                type: Type.STRING,
                                description: "Nội dung chương dịch sang Tiếng Việt (Vietnamese Content). Không được chứa tiếng Anh. Giữ nguyên các dấu xuống dòng như bản gốc."
                            }
                        },
                        required: ["translatedTitle", "translatedText"]
                    }
                }
            });

            // --- TRACK USAGE ---
            recordUsage(aiModel, response.usageMetadata);

            let jsonText = "";
            try {
                const res = response as any;
                if (typeof res.text === 'function') {
                    jsonText = res.text();
                } else if (typeof res.response?.text === 'function') {
                    jsonText = res.response.text();
                } else {
                    // Fallback for different SDK versions or response shapes
                    const candidates = res.candidates || res.response?.candidates;
                    jsonText = candidates?.[0]?.content?.parts?.[0]?.text || "";
                }
            } catch (e) {
                // Fallback to empty string if text extraction fails
                const candidates = (response as any).candidates;
                jsonText = candidates?.[0]?.content?.parts?.[0]?.text || "";
            }

            // Clean JSON: Remove markdown code blocks and ANY text outside the first { and last }
            jsonText = jsonText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

            const firstBrace = jsonText.indexOf('{');
            const lastBrace = jsonText.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
                jsonText = jsonText.substring(firstBrace, lastBrace + 1);
            }

            if (!jsonText) throw new Error("Empty response from AI");

            const parsed = JSON.parse(jsonText);
            if (!parsed.translatedText) throw new Error("Invalid JSON structure: missing translatedText");

            parsed.translatedText = scrubAIChatter(normalizeVietnameseContent(parsed.translatedText));
            if (parsed.translatedTitle) parsed.translatedTitle = scrubAIChatter(normalizeVietnameseContent(parsed.translatedTitle));

            // 4. Apply Auto-Corrections (Hard overrides)
            const corrections = await db.corrections.where('workspaceId').equals(workspaceId).toArray();
            if (corrections.length > 0) {
                let finalContent = parsed.translatedText;
                let finalTitle = parsed.translatedTitle || "";

                // Sort by length descending to avoid partial replacements of longer phrases
                corrections.sort((a, b) => b.original.length - a.original.length).forEach(c => {
                    if (finalContent.includes(c.original)) {
                        finalContent = finalContent.split(c.original).join(c.replacement);
                    }
                    if (finalTitle.includes(c.original)) {
                        finalTitle = finalTitle.split(c.original).join(c.replacement);
                    }
                });

                parsed.translatedText = finalContent;
                if (parsed.translatedTitle) parsed.translatedTitle = finalTitle;
            }

            return parsed as TranslationResult;
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
        onLog({ timestamp: new Date(), message: "Dịch hoàn tất!", type: 'success' });
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
        const result = JSON.parse(jsonText);

        // Enforce type="name" for characters
        if (result.characters && Array.isArray(result.characters)) {
            result.characters = result.characters.map((c: any) => ({ ...c, type: 'name' }));
        }
        return result;
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

// --- AI Inspector (Quality Control) ---
export interface InspectionIssue {
    original: string;
    suggestion: string;
    type: 'untranslated' | 'pronoun' | 'grammar' | 'spelling' | 'other';
    reason: string;
}

export const inspectChapter = async (workspaceId: string, text: string, onLog?: (msg: string) => void): Promise<InspectionIssue[]> => {
    // 1. Get Glossary to avoid false positives
    const dict = await db.dictionary.where('workspaceId').equals(workspaceId).toArray();
    const blacklist = await db.blacklist.where('workspaceId').equals(workspaceId).toArray();
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

// --- Prompt Lab AI Features ---
export const generatePromptVariants = async (keywords: string, onLog?: (msg: string) => void): Promise<{ promptA: string, promptB: string }> => {
    return withKeyRotation(async (ai) => {
        const prompt = `Bạn là chuyên gia Prompt Engineering cho việc dịch truyện Trung - Việt.
Nhiệm vụ: Tạo ra 2 phiên bản System Instructions khác nhau dựa trên yêu cầu người dùng.

Yêu cầu người dùng (Keywords/Goals): "${keywords}"

Output JSON:
{
    "promptA": "Phiên bản 1 (Base/Safe): Tập trung vào yêu cầu cơ bản, an toàn, chuẩn mực.",
    "promptB": "Phiên bản 2 (Creative/Strict/Styled): Tập trung vào phong cách cụ thể, sáng tạo hơn hoặc khắt khe hơn theo keywords."
}`;

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        promptA: { type: Type.STRING },
                        promptB: { type: Type.STRING }
                    },
                    required: ["promptA", "promptB"]
                }
            }
        });

        const rawResponse = response as any;
        const jsonText = typeof rawResponse.text === 'function' ? rawResponse.text() : rawResponse.text;
        return JSON.parse(jsonText || '{"promptA": "", "promptB": ""}');
    }, onLog);
};

export const evaluateTranslation = async (source: string, resultA: string, resultB: string, onLog?: (msg: string) => void): Promise<{ winner: 'A' | 'B' | 'Draw', reason: string, scoreA: number, scoreB: number }> => {
    return withKeyRotation(async (ai) => {
        const prompt = `So sánh 2 bản dịch tiếng Việt từ văn bản gốc tiếng Trung và chấm điểm.

Original (Chinese): "${source.substring(0, 1000)}"

Translation A: "${resultA.substring(0, 1000)}"

Translation B: "${resultB.substring(0, 1000)}"

Yêu cầu:
- Chấm điểm trên thang 1-10 dựa trên: Độ chính xác, Văn phong (tự nhiên, Hán Việt chuẩn), Ngữ pháp.
- Đưa ra lý do ngắn gọn tại sao bản này tốt hơn bản kia.

Output JSON:
{
    "winner": "A" | "B" | "Draw",
    "reason": "Giải thích ngắn",
    "scoreA": 8.5,
    "scoreB": 9.0
}`;

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        winner: { type: Type.STRING, enum: ["A", "B", "Draw"] },
                        reason: { type: Type.STRING },
                        scoreA: { type: Type.NUMBER },
                        scoreB: { type: Type.NUMBER }
                    },
                    required: ["winner", "reason", "scoreA", "scoreB"]
                }
            }
        });

        const rawResponse = response as any;
        const jsonText = typeof rawResponse.text === 'function' ? rawResponse.text() : rawResponse.text;
        return JSON.parse(jsonText || '{"winner": "Draw", "reason": "Error", "scoreA": 0, "scoreB": 0}');
    }, onLog);
};

// --- Text Normalization Helper ---
function normalizeVietnameseContent(text: string): string {
    if (!text) return "";
    return text
        // 1. Normalize Brackets: 【 】 -> [ ] (Direct replacement, no added spaces yet)
        .replace(/【/g, "[")
        .replace(/】/g, "]")
        // 2. Normalize Parentheses: （ ） -> ( )
        .replace(/（/g, "(")
        .replace(/）/g, ")")

        // 3. MOST CRITICAL: Remove ANY amount of whitespace/newlines before ]
        // This catches patterns like "text.\n]", "text.\n\n]", "text. \n \n ]", etc.
        .replace(/[\s\n]+\]/g, "]")

        // 4. CRITICAL FIX: Remove ALL whitespace/newlines INSIDE brackets first
        // This prevents "[Sentence 1.\n\nSentence 2]" from being split
        .replace(/\[([\s\S]*?)\]/g, (match) => {
            const inner = match.slice(1, -1); // Extract content between [ and ]
            const cleaned = inner.replace(/\s+/g, " ").trim(); // Collapse all whitespace to single space
            return `[${cleaned}]`;
        })
        .replace(/\(([^\)]*?)\)/g, (match) => {
            const inner = match.slice(1, -1);
            const cleaned = inner.replace(/\s+/g, " ").trim();
            return `(${cleaned})`;
        })

        // 5. AGGRESSIVE: Remove newlines/spaces *around* brackets
        // Must handle cases like "text.\n\n]" (double newline before ])
        .replace(/\[[\s\n]+/g, "[") // Remove ALL newlines and spaces AFTER [

        // 5. Fix: Squash newline between brackets: ] \n [ -> ] [
        .replace(/\]\s*\n+\s*\[/g, "] [")

        // 6. Fix: Remove newline after ] if it's not a paragraph break (double newline)
        .replace(/\]\n(?!\n)/g, "] ")

        // 7. Same for parentheses
        .replace(/\s*\)/g, ")")
        .replace(/\(\s*/g, "(")

        // 8. Add legitimate spacing
        .replace(/\](?=[^\s.,;!?\]])/g, "] ")
        .replace(/(?<=[^\s\[])\[/g, " [")

        // 9. Fix double spaces (horizontal only)
        .replace(/[ \t]{2,}/g, " ")
        // 10. Ensure max 2 newlines (paragraph break)
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

/**
 * Scrubs common AI meta-talk/preambles that leak into content
 */
function scrubAIChatter(text: string): string {
    if (!text) return "";

    return text
        // 1. Common preambles
        .replace(/^(Of course!|Here is the response|Strictly in JSON|Sure,|Certainly,)[^.]*[:\.]\s*/i, "")
        // 2. Common postscripts / self-corrections
        .replace(/\s*(Of course!|Here is the response|Strictly in JSON|Just kidding|I know you said|Here it is|Enjoy!|Hope this helps)[\s\S]*$/i, "")
        // 3. Trailing artifacts like JSON leftovers
        .replace(/["'\}\s\n]+$/g, "")
        .trim();
}

// --- Spirit Extraction (Style DNA) ---
export interface StyleDNA {
    tone: string;       // Giọng văn (Hào hùng, Bi thương, Hài hước...)
    setting: string;    // Bối cảnh (Tu tiên, Đô thị, Mạt thế...)
    pronouns: string;   // Cách xưng hô đặc trưng
    keywords: string[]; // Các từ khóa quan trọng để build prompt
    description: string; // Tóm tắt ngắn gọn để cho vào prompt
}

export const analyzeStyleDNA = async (chaptersContent: string[], onLog?: (msg: string) => void): Promise<StyleDNA> => {
    return withKeyRotation(async (ai) => {
        // Limit content to ~20k chars to save tokens but get enough context
        const sampleText = chaptersContent.join('\n\n').substring(0, 20000);

        const prompt = `Bạn là nhà phê bình văn học và chuyên gia phân tích văn phong.
Nhiệm vụ: Phân tích đoạn văn mẫu từ 5 chương đầu của một bộ truyện để trích xuất "DNA Văn Học" (Style DNA).

Input Text:
"${sampleText}..."

Yêu cầu output JSON:
{
    "tone": "Giọng văn chủ đạo (VD: Hài hước, Trầm mặc, Sôi nổi...)",
    "setting": "Bối cảnh câu chuyện (VD: Tiên hiệp cổ điển, Mạt thế hiện đại...)",
    "pronouns": "Cách xưng hô đặc trưng của nhân vật chính/phụ (VD: Ta-Ngươi, Hắn-Nàng, Tôi-Cậu...)",
    "keywords": ["từ khóa 1", "từ khóa 2", "từ khóa 3"],
    "description": "Một đoạn mô tả ngắn gọn (2-3 câu) tổng hợp phong cách để ra lệnh cho AI dịch thuật bắt chước theo."
}`;

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        tone: { type: Type.STRING },
                        setting: { type: Type.STRING },
                        pronouns: { type: Type.STRING },
                        keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                        description: { type: Type.STRING }
                    },
                    required: ["tone", "setting", "pronouns", "keywords", "description"]
                }
            }
        });

        const rawResponse = response as any;
        const jsonText = typeof rawResponse.text === 'function' ? rawResponse.text() : rawResponse.text;
        return JSON.parse(jsonText || '{}');
    }, onLog);
};

/**
 * Generate a book summary (blurb) based on context
 */
export async function generateBookSummary(context: string, aiModel: string, onLog?: (msg: string) => void) {
    return withKeyRotation(async (ai) => {
        const prompt = `Dựa vào các phần trích dẫn sau đây từ một bộ truyện, hãy viết một đoạn mô tả chi tiết và hấp dẫn (blurb) cho bộ truyện đó.

YÊU CẦU:
- Độ dài: 3-5 đoạn văn (khoảng 200-300 từ)
- Tập trung vào: Bối cảnh thế giới, hệ thống sức mạnh (nếu có), tính cách và hành trình của nhân vật chính
- Phong cách: Lôi cuốn, chuyên nghiệp như một dịch giả truyện, tạo sự tò mò cho độc giả
- Cấu trúc gợi ý:
  + Đoạn 1: Hook - Giới thiệu bối cảnh và tình huống đặc biệt
  + Đoạn 2-3: Mô tả nhân vật chính, thử thách họ phải đối mặt
  + Đoạn 4: Hệ thống sức mạnh/yếu tố đặc biệt của thế giới (nếu có)
  + Đoạn 5: Kết thúc mở, tạo sự tò mò
- Kết quả CHỈ bao gồm đoạn văn mô tả, KHÔNG chứa lời dẫn hay ký hiệu markdown

NỘI DUNG TRÍCH DẪN:
${context}

ĐOẠN MÔ TẢ CHI TIẾT (TIẾNG VIỆT):`;

        const response = await ai.models.generateContent({
            model: aiModel.trim(),
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                temperature: 0.8,
                topP: 0.95,
                maxOutputTokens: 2048, // Increased from 1024 to allow longer descriptions
            }
        });

        let text = "";
        try {
            const res = response as any;
            if (typeof res.text === 'function') {
                text = res.text();
            } else if (typeof res.response?.text === 'function') {
                text = res.response.text();
            } else {
                const candidates = res.candidates || res.response?.candidates;
                text = candidates?.[0]?.content?.parts?.[0]?.text || "";
            }
        } catch (e) {
            // Fallback to empty string if text extraction fails
        }

        // Track usage
        recordUsage(aiModel, (response as any).usageMetadata || (response as any).response?.usageMetadata);

        return text.trim();
    }, onLog);
}
