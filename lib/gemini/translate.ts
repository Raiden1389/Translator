import { db, DictionaryEntry } from "../db";
import { DEFAULT_MODEL } from "../ai-models";
import { TranslationResult, TranslationLog } from "./types";
import { withKeyRotation, recordUsage } from "./client";
import { extractResponseText } from "./contentProcessor";
import { analyzeTextHeuristics, assembleSystemInstruction } from "./rules/assembler";
import { withAdaptiveTokens } from "./adaptive-tokens";
import { buildGlossary } from "./translation/glossary-builder";
import { parsePlainTextChapter } from "./translation/parser";
import { applyPostProcessing } from "./translation/post-processor";
import { calculateStats } from "./translation/stats-calculator";

/**
 * Main Translation Function (Orchestrator)
 * 
 * Architecture:
 * - Modular design with clear separation of concerns
 * - Adaptive token management for cost optimization
 * - Smart retry logic for reliability
 * 
 * Flow:
 * 1. Build glossary context
 * 2. Analyze text heuristics
 * 3. Call API with adaptive tokens
 * 4. Parse response
 * 5. Post-process (corrections, validation)
 * 6. Calculate stats
 */
export const translateChapter = async (
    workspaceId: string,
    text: string,
    onLog: (log: TranslationLog) => void,
    onSuccess: (result: TranslationResult) => void,
    customInstruction?: string,
    sharedGlossary?: DictionaryEntry[],
    cacheId?: string
) => {
    const modelSetting = await db.settings.get("aiModel");
    const aiModel = modelSetting?.value || DEFAULT_MODEL;

    // Clean text: Normalize Unicode (NFC) and remove excessive whitespace
    text = text.normalize('NFC').trim().replace(/\n\s*\n/g, '\n\n');

    try {
        // 1. Build Glossary Context
        const { relevantDict, glossaryContext } = await buildGlossary(
            workspaceId,
            text,
            sharedGlossary
        );

        // 2. Analyze Text Heuristics
        const analysis = analyzeTextHeuristics(text);
        onLog({
            timestamp: new Date(),
            message: `🧠 Phân tích ngữ cảnh: ${analysis.detectedRegister} | Confidence: ${analysis.confidence}% | Combat: ${analysis.isCombat ? 'Có' : 'Không'}`,
            type: 'info'
        });

        // 3. Build System Instruction
        const fullInstruction = assembleSystemInstruction(analysis, glossaryContext, customInstruction, text);

        // 4. Call API with Adaptive Tokens (Smart Retry)
        const adaptiveResult = await withAdaptiveTokens(
            async (maxTokens: number) => {
                console.log(`📡 [PAYLOAD] Model: ${aiModel} | Content Size: ${text.length} chars | System Instruction Size: ${fullInstruction.length} chars | Dynamic maxTokens: ${maxTokens}`);

                return await withKeyRotation<Record<string, unknown>>(
                    {
                        model: (aiModel as string).trim(),
                        systemInstruction: cacheId ? undefined : fullInstruction,
                        cachedContent: cacheId,
                        prompt: text,
                        generationConfig: {
                            temperature: 0.1,
                            topP: 0.95,
                            maxOutputTokens: maxTokens,
                            responseMimeType: "text/plain",
                        }
                    },
                    (msg: string) => {
                        const prefixedMsg = cacheId ? `[TURBO] ${msg}` : msg;
                        onLog({ timestamp: new Date(), message: prefixedMsg, type: 'info' });
                    }
                );
            },
            (result) => {
                const candidates = (result as { candidates?: Array<{ finishReason?: string }> }).candidates;
                return candidates?.[0]?.finishReason;
            },
            {
                inputLength: text.length,
                baseBuffer: 3500,  // High buffer for Gemini 2.5 Flash thinking tokens (~2400)
                minTokens: 2048,
                maxTokens: 8192
            }
        );

        const rawResult = adaptiveResult.data;



        // Track retry for final message (don't toast immediately)
        const wasRetried = adaptiveResult.wasRetried;

        // Track usage
        if (rawResult.usageMetadata) {
            recordUsage(aiModel as string, rawResult.usageMetadata);
        }

        // 5. Extract & Validate Response
        const rawText = extractResponseText(rawResult).trim();

        if (!rawText || rawText.trim() === "") {
            throw new Error("❌ AI trả về nội dung rỗng! Có thể do: API lỗi, Prompt bị reject, hoặc Content vi phạm policy.");
        }

        // 6. Parse Plain Text Response
        const parsed = parsePlainTextChapter(rawText);

        // 7. Post-Process (Corrections, Validation, Final Sweep)
        const processed = await applyPostProcessing(parsed, workspaceId, relevantDict);

        // 8. Calculate Stats
        const stats = calculateStats(
            processed.translatedText,
            relevantDict,
            rawResult.usageMetadata as { promptTokenCount?: number; candidatesTokenCount?: number }
        );

        const result: TranslationResult = {
            ...processed,
            stats
        };

        // 9. Success - Consolidated message with all info
        const tokenMsg = stats.tokens
            ? ` [${stats.tokens.input}i + ${stats.tokens.output}o = ${stats.tokens.total}t]`
            : "";
        const cacheSuffix = cacheId ? " 🚀Turbo" : "";
        const retrySuffix = wasRetried ? " (retry)" : "";
        onLog({
            timestamp: new Date(),
            message: `✅ Dịch xong!${tokenMsg}${cacheSuffix}${retrySuffix}`,
            type: 'success'
        });
        onSuccess(result);

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        onLog({ timestamp: new Date(), message: `Lỗi: ${message}`, type: 'error' });
        throw error;
    }
};
