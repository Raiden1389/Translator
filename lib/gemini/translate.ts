import { HarmCategory, HarmBlockThreshold } from "@google/genai";
import { db } from "../db";
import { DEFAULT_MODEL } from "../ai-models";
import { TranslationResult, TranslationLog } from "./types";
import { withKeyRotation, recordUsage } from "./client";
import { extractResponseText } from "./helpers";
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
    const aiModel = modelSetting?.value || DEFAULT_MODEL;

    // Clean text: Remove excessive whitespace to save tokens
    text = text.trim().replace(/\n\s*\n/g, '\n\n');

    // 1. Get Glossary & Blacklist
    const dict = await db.dictionary.where('workspaceId').equals(workspaceId).toArray();
    const blacklist = await db.blacklist.where('workspaceId').equals(workspaceId).toArray();
    const blockedWords = new Set(blacklist.map(b => b.word.toLowerCase()));

    // Filter glossary: Remove blacklisted, only keep terms that appear, LIMIT 30 terms
    const relevantDict = dict
        .filter(d => !blockedWords.has(d.original.toLowerCase()) && text.includes(d.original))
        .sort((a, b) => b.original.length - a.original.length)
        .slice(0, 30);

    const glossaryContext = relevantDict.length > 0
        ? `\n\nTHUẬT NGỮ (ƯU TIÊN DÙNG):\n${relevantDict.map(d => `${d.original} -> ${d.translated}`).join('\n')}`
        : '';

    // 2. Build System Instruction (with pronoun mapping + line alignment)
    const fullInstruction = buildSystemInstruction(customInstruction, glossaryContext);

    try {
        console.log(`📡 [PAYLOAD] Model: ${aiModel} | Content Size: ${text.length} chars | System Instruction Size: ${fullInstruction.length} chars`);

        const result = await withKeyRotation(async (ai) => {
            const start = performance.now();
            const response = await ai.models.generateContent({
                model: aiModel.trim(),
                contents: [{ role: 'user', parts: [{ text: text }] }],
                config: {
                    systemInstruction: fullInstruction,
                    temperature: 0.1,
                    topP: 0.95,
                    safetySettings: [
                        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE }
                    ]
                }
            });
            const duration = (performance.now() - start) / 1000;
            console.log(`⏱️ Latency thực tế: ${duration.toFixed(2)}s`);

            // Track usage
            recordUsage(aiModel, response.usageMetadata);

            const rawText = extractResponseText(response).trim();
            let parsed: TranslationResult;

            try {
                // Try to find if there's any JSON block
                const jsonMatched = rawText.match(/\{[\s\S]*\}/);
                if (jsonMatched) {
                    const raw = JSON.parse(jsonMatched[0]);
                    parsed = {
                        translatedTitle: raw.title || raw.translatedTitle || "",
                        translatedText: raw.content || raw.translatedText || raw.text || ""
                    };
                } else {
                    throw new Error("No JSON found");
                }
            } catch {
                // FALLBACK: Treat whole text as content if JSON fails
                parsed = {
                    translatedTitle: "",
                    translatedText: rawText
                };
            }

            if (!parsed.translatedText || parsed.translatedText.length < 50) {
                parsed.translatedText = rawText;
            }

            // 3. Apply Auto-Corrections (Optimized Regex Replacement for simple replacements)
            const corrections = await db.corrections.where('workspaceId').equals(workspaceId).toArray();
            if (corrections.length > 0) {
                // 3a. Batch replacement for 'replace' types (Efficient)
                const replaceRules = corrections.filter(c =>
                    (c.type === 'replace' || !c.type) &&
                    (c.from || c.original)
                );

                if (replaceRules.length > 0) {
                    const sorted = [...replaceRules].sort((a, b) => {
                        const lenA = (a.from || a.original || "").length;
                        const lenB = (b.from || b.original || "").length;
                        return lenB - lenA;
                    });

                    const replacementMap = new Map(sorted.map(c => [
                        c.from || c.original || "",
                        c.to ?? c.replacement ?? ""
                    ]));

                    const pattern = new RegExp(
                        sorted
                            .map(c => (c.from || c.original || "").replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
                            .filter(p => p.length > 0)
                            .join('|'),
                        'g'
                    );

                    if (pattern.source !== "(?:)" && pattern.source !== "") {
                        parsed.translatedText = parsed.translatedText.replace(pattern, (match) => replacementMap.get(match) || match);
                        if (parsed.translatedTitle) {
                            parsed.translatedTitle = parsed.translatedTitle.replace(pattern, (match) => replacementMap.get(match) || match);
                        }
                    }
                }

                // 3b. Individual application for 'wrap' and 'regex' types
                const complexRules = corrections.filter(c => c.type === 'wrap' || c.type === 'regex');
                if (complexRules.length > 0) {
                    const { applyCorrectionRule } = await import("./helpers");
                    for (const rule of complexRules) {
                        parsed.translatedText = applyCorrectionRule(parsed.translatedText, rule);
                        if (parsed.translatedTitle) {
                            parsed.translatedTitle = applyCorrectionRule(parsed.translatedTitle, rule);
                        }
                    }
                }
            }

            // NOTE: Normalization moved to chunking.ts / batch-correction end-point
            return parsed;
        }, (msg: string) => onLog({ timestamp: new Date(), message: msg, type: 'info' }));

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

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        onLog({ timestamp: new Date(), message: `Lỗi: ${message}`, type: 'error' });
        throw error;
    }
};
