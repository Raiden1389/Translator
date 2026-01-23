import { Type } from "@google/genai";
import { db } from "../db";
import { DEFAULT_MODEL } from "../ai-models";
import { TranslationResult, TranslationLog } from "./types";
import { withKeyRotation, recordUsage } from "./client";
import { normalizeVietnameseContent, scrubAIChatter, extractResponseText, cleanJsonResponse } from "./helpers";
import { buildSystemInstruction } from "./constants";

/**
 * Main Translation Function
 */
export const translateChapter = async (
    workspaceId: string,
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

    // Filter glossary: Remove blacklisted, only keep terms that appear, LIMIT 50 terms
    const relevantDict = dict
        .filter(d => !blockedWords.has(d.original.toLowerCase()) && text.includes(d.original))
        .sort((a, b) => b.original.length - a.original.length)
        .slice(0, 50);

    const glossaryContext = relevantDict.length > 0
        ? `\n\nTHUẬT NGỮ (ƯU TIÊN DÙNG):\n${relevantDict.map(d => `${d.original} -> ${d.translated}`).join('\n')}`
        : '';

    // 2. Build System Instruction (with pronoun mapping + line alignment)
    const fullInstruction = buildSystemInstruction(customInstruction, glossaryContext);

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
                                description: "Nội dung chương dịch sang Tiếng Việt (Vietnamese Content). Không được chứa tiếng Anh."
                            }
                        },
                        required: ["translatedTitle", "translatedText"]
                    }
                }
            });

            // Track usage
            recordUsage(aiModel, response.usageMetadata);

            // Extract and clean JSON
            let jsonText = extractResponseText(response);
            jsonText = cleanJsonResponse(jsonText);

            if (!jsonText) throw new Error("Empty response from AI");

            let parsed: TranslationResult;
            try {
                parsed = JSON.parse(jsonText);
            } catch (e) {
                // FALLBACK: If JSON parse fails, assume the entire text is the translation
                // but only if it doesn't look like a JSON error message or totally garbage
                console.warn("JSON Parse Failed, falling back to raw text:", jsonText);
                const rawText = extractResponseText(response).trim();

                // If raw text is just the JSON string that failed, stripping it might help?
                // For now, treat raw text as content, but scrub it
                parsed = {
                    translatedTitle: "",
                    translatedText: rawText
                };
            }

            if (!parsed.translatedText) {
                // FALLBACK STRATEGY for valid JSON but wrong schema
                // 1. Check for common alternative keys
                const candidate = (parsed as any).text || (parsed as any).content || (parsed as any).translation || (parsed as any).response;
                if (typeof candidate === 'string') {
                    parsed.translatedText = candidate;
                } else if (typeof parsed === 'string') {
                    // 2. If the JSON itself turned out to be a string
                    parsed = { translatedTitle: "", translatedText: parsed };
                } else {
                    // 3. Last resort: If we can't find the text, maybe the parsing was "too successful" on a non-JSON structure?
                    // Actually, let's treat the original cleaned text as the content if it's long enough
                    console.warn("JSON schema violation. Salvaging content...");
                    const rawCleaned = cleanJsonResponse(extractResponseText(response));
                    if (rawCleaned && rawCleaned.length > 0) {
                        parsed.translatedText = rawCleaned;
                    } else {
                        throw new Error(`Invalid JSON structure: missing translatedText. Keys found: ${Object.keys(parsed).join(", ")}`);
                    }
                }
            }

            // Normalize content
            parsed.translatedText = scrubAIChatter(normalizeVietnameseContent(parsed.translatedText));
            if (parsed.translatedTitle) parsed.translatedTitle = scrubAIChatter(normalizeVietnameseContent(parsed.translatedTitle));

            // 3. Apply Auto-Corrections (Hard overrides)
            const corrections = await db.corrections.where('workspaceId').equals(workspaceId).toArray();
            if (corrections.length > 0) {
                let finalContent = parsed.translatedText;
                let finalTitle = parsed.translatedTitle || "";

                // Sort by length descending to avoid partial replacements
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

        // 4. Calculate Stats
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
