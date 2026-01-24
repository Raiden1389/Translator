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

        const rawResult = await withKeyRotation<any>(
            {
                model: aiModel.trim(),
                systemInstruction: fullInstruction,
                prompt: text,
                generationConfig: {
                    temperature: 0.1,
                    topP: 0.95,
                    maxOutputTokens: 8192,
                    responseMimeType: "text/plain",
                }
            },
            (msg: string) => onLog({ timestamp: new Date(), message: msg, type: 'info' })
        );

        // Track usage (if available in bridge response)
        if (rawResult.usageMetadata) {
            recordUsage(aiModel, rawResult.usageMetadata);
        }

        const rawText = extractResponseText(rawResult).trim();
        let parsed: TranslationResult;

        try {
            // 1. Cleaner extraction: catch the first { and last }
            const firstBrace = rawText.indexOf('{');
            const lastBrace = rawText.lastIndexOf('}');

            if (firstBrace !== -1 && lastBrace !== -1) {
                let jsonStr = rawText.substring(firstBrace, lastBrace + 1);

                // 2. Try Standard Parse
                try {
                    const raw = JSON.parse(jsonStr);
                    parsed = {
                        translatedTitle: raw.title || raw.translatedTitle || raw.chapter_title || "",
                        translatedText: raw.content || raw.translatedText || raw.text || raw.translated_content || ""
                    };
                } catch (e) {
                    // 3. Last ditch: JSON is malformed, try regex-based extraction
                    const titleMatch = jsonStr.match(/"(?:title|translatedTitle|chapter_title)":\s*"([^"]*)"/);
                    const contentMatch = jsonStr.match(/"(?:content|translatedText|text|translated_content)":\s*"([\s\S]*?)"(?=\s*(?:,|\}|"|$))/);

                    parsed = {
                        translatedTitle: titleMatch ? titleMatch[1] : "",
                        translatedText: contentMatch ? contentMatch[1] : rawText
                    };
                }

                // 4. Critical Fix: Some AI models return literal "\n" strings instead of real newlines
                if (parsed.translatedText && parsed.translatedText.includes('\\n')) {
                    parsed.translatedText = parsed.translatedText
                        .replace(/\\n/g, '\n')
                        .replace(/\\r/g, '');
                }
            } else {
                throw new Error("Missing JSON braces");
            }
        } catch (err) {
            console.error("❌ Deep JSON failure. Using raw text.", err);
            parsed = {
                translatedTitle: "",
                translatedText: rawText
            };
        }

        // High-confidence filter: If we ended up with raw JSON as the content, it's a failure
        if (parsed.translatedText.trim().startsWith('{') && parsed.translatedText.includes('"content"')) {
            const lastMatch = parsed.translatedText.match(/"content":\s*"([\s\S]*?)"(?=\s*(?:,|\}|"|$))/);
            if (lastMatch) parsed.translatedText = lastMatch[1].replace(/\\n/g, '\n');
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

        const result = parsed;

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
