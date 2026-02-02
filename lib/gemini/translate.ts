import { db, DictionaryEntry } from "../db";
import { DEFAULT_MODEL } from "../ai-models";
import { TranslationResult, TranslationLog } from "./types";
import { withKeyRotation, recordUsage } from "./client";
import { extractResponseText, finalSweep } from "./contentProcessor";
import { analyzeTextHeuristics, assembleSystemInstruction } from "./rules/assembler";

/**
 * Main Translation Function
 */
export const translateChapter = async (
    workspaceId: string,
    text: string,
    onLog: (log: TranslationLog) => void,
    onSuccess: (result: TranslationResult) => void,
    customInstruction?: string,
    sharedGlossary?: DictionaryEntry[]
) => {
    const modelSetting = await db.settings.get("aiModel");
    const aiModel = modelSetting?.value || DEFAULT_MODEL;

    // Clean text: Normalize Unicode (NFC) and remove excessive whitespace
    text = text.normalize('NFC').trim().replace(/\n\s*\n/g, '\n\n');

    // 1. Get Glossary & Blacklist
    let relevantDict: DictionaryEntry[] = [];

    if (sharedGlossary && sharedGlossary.length > 0) {
        relevantDict = sharedGlossary;
    } else {
        const dict = await db.dictionary.where('workspaceId').equals(workspaceId).toArray();
        const blacklist = await db.blacklist.where('workspaceId').equals(workspaceId).toArray();
        const blockedWords = new Set(blacklist.map(b => b.word.toLowerCase()));

        // Filter glossary: Remove blacklisted, only keep terms that appear, LIMIT 30 terms
        relevantDict = dict
            .filter(d => !blockedWords.has(d.original.toLowerCase()) && text.includes(d.original))
            .sort((a, b) => b.original.length - a.original.length)
            .slice(0, 30);
    }

    const glossaryContext = relevantDict.length > 0
        ? `\n\nTHUẬT NGỮ (ƯU TIÊN DÙNG):\n${relevantDict.map(d => `${d.original} -> ${d.translated}`).join('\n')}`
        : '';

    // 2. Perform Heuristic Scan (Multi-point Start-Middle-End)
    const analysis = analyzeTextHeuristics(text);
    onLog({
        timestamp: new Date(),
        message: `🧠 Phân tích ngữ cảnh: ${analysis.detectedRegister} | Confidence: ${analysis.confidence}% | Combat: ${analysis.isCombat ? 'Có' : 'Không'}`,
        type: 'info'
    });

    // 3. Build System Instruction (Dynamic Assembly v5.0)
    const fullInstruction = assembleSystemInstruction(analysis, glossaryContext, customInstruction, text);

    try {
        console.log(`📡 [PAYLOAD] Model: ${aiModel} | Content Size: ${text.length} chars | System Instruction Size: ${fullInstruction.length} chars`);

        const rawResult = await withKeyRotation<Record<string, unknown>>(
            {
                model: (aiModel as string).trim(),
                systemInstruction: fullInstruction,
                prompt: text,
                generationConfig: {
                    temperature: 0.1,
                    topP: 0.95,
                    maxOutputTokens: 4096, // Patched: Reduced from 8192 to prevent token runaway (Audit v1.1)
                    responseMimeType: "text/plain",
                }
            },
            (msg: string) => onLog({ timestamp: new Date(), message: msg, type: 'info' })
        );

        // Track usage (if available in bridge response)
        if (rawResult.usageMetadata) {
            recordUsage(aiModel as string, rawResult.usageMetadata);
        }

        const rawText = extractResponseText(rawResult).trim();
        let parsed: TranslationResult = {
            translatedTitle: "",
            translatedText: rawText
        };

        // 1. Try to detect and parse Plain Text format (Title\n\nContent)
        const lines = rawText.split('\n').filter(l => l.trim() !== "");
        if (lines.length >= 2 && !rawText.trim().startsWith('{')) {
            let potentialTitle = lines[0].trim();
            potentialTitle = potentialTitle.replace(/^(Tiêu đề|Title|Chapter|Chương)\s*[:\-]\s*/i, "");

            if (potentialTitle.length < 250) {
                parsed = {
                    translatedTitle: potentialTitle,
                    translatedText: lines.slice(1).join('\n\n').trim()
                };
            }
        }

        // 2. Fallback: Try JSON extraction if Plain Text didn't match or looks like JSON
        if (!parsed.translatedTitle && (rawText.includes('{') || rawText.includes('"'))) {
            try {
                const firstBrace = rawText.indexOf('{');
                const lastBrace = rawText.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1) {
                    const jsonStr = rawText.substring(firstBrace, lastBrace + 1);
                    try {
                        const raw = JSON.parse(jsonStr);
                        parsed = {
                            translatedTitle: (raw.title || raw.translatedTitle || raw.chapter_title || "").replace(/^(Tiêu đề|Title|Chapter|Chương)\s*[:\-]\s*/i, ""),
                            translatedText: raw.content || raw.translatedText || raw.text || raw.translated_content || ""
                        };
                    } catch {
                        // Regex-based partial JSON extraction
                        const titleMatch = jsonStr.match(/"(?:title|translatedTitle|chapter_title)":\s*"([^"]*)"/);
                        const contentMatch = jsonStr.match(/"(?:content|translatedText|text|translated_content)":\s*"([\s\S]*?)"(?=\s*(?:,|\}|"|$))/);
                        if (titleMatch || contentMatch) {
                            parsed = {
                                translatedTitle: titleMatch ? titleMatch[1] : "",
                                translatedText: contentMatch ? contentMatch[1] : rawText
                            };
                        }
                    }
                }
            } catch (err) {
                console.error("❌ JSON/Text extraction failed.", err);
            }
        }

        // 3. Post-cleanup: Fix literal "\n" strings if they exist
        if (parsed.translatedText && parsed.translatedText.includes('\\n')) {
            parsed.translatedText = parsed.translatedText
                .replace(/\\n/g, '\n')
                .replace(/\\r/g, '');
        }

        // Final safety check: if we somehow have JSON in content, clean it
        if (parsed.translatedText.trim().startsWith('{') && (parsed.translatedText.includes('"content"') || parsed.translatedText.includes('"translated"'))) {
            const lastMatch = parsed.translatedText.match(/"(?:content|translatedText|text)":\s*"([\s\S]*?)"(?=\s*(?:,|\}|"|$))/);
            if (lastMatch) parsed.translatedText = lastMatch[1].replace(/\\n/g, '\n');
        }

        // 3. Apply Auto-Corrections (Universal Logic: NFC + LongestFirst + CasePreserve)
        const corrections = await db.corrections.where('workspaceId').equals(workspaceId).toArray();
        if (corrections.length > 0) {
            const { applyAllCorrections } = await import("./contentProcessor");
            parsed.translatedText = applyAllCorrections(parsed.translatedText, corrections);
            if (parsed.translatedTitle) {
                parsed.translatedTitle = applyAllCorrections(parsed.translatedTitle, corrections);
            }
        }

        // 4. Final Sweep (Clean up brackets, explanations, and structure)
        parsed.translatedText = finalSweep(parsed.translatedText, relevantDict);
        if (parsed.translatedTitle) {
            parsed.translatedTitle = finalSweep(parsed.translatedTitle, relevantDict);
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

        const usage = (rawResult as any).usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0 };
        const tokens = {
            input: usage.promptTokenCount || 0,
            output: usage.candidatesTokenCount || 0,
            total: (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0)
        };

        result.stats = {
            terms: termUsage,
            characters: charUsage,
            tokens
        };

        const tokenMsg = tokens.total > 0 ? ` [${tokens.input}i + ${tokens.output}o = ${tokens.total}t]` : "";
        onLog({ timestamp: new Date(), message: `Dịch hoàn tất!${tokenMsg}`, type: 'success' });
        onSuccess(result);

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        onLog({ timestamp: new Date(), message: `Lỗi: ${message}`, type: 'error' });
        throw error;
    }
};
