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
import { GeminiResponse } from "../schemas/gemini-response.schema";

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
    enableThinking?: boolean,  // 🧠 For Gemini 2.5 Flash
    thinkingLevel?: "minimal" | "low" | "medium" | "high",  // 🧠 For Gemini 3.0 Flash
) => {
    const modelSetting = await db.settings.get("aiModel");
    const aiModel = modelSetting?.value || DEFAULT_MODEL;

    /**
     * Build thinking config based on model version
     * Gemini 2.5: Uses thinkingBudget (-1 = dynamic, 0 = disabled)
     * Gemini 3.0: Uses thinking_level ("minimal" | "low" | "medium" | "high")
     */
    const buildThinkingConfig = (
        model: string,
        legacyEnableThinking?: boolean,
        level?: "minimal" | "low" | "medium" | "high"
    ): { thinkingBudget?: number; thinking_level?: string } => {
        const isGemini3 = model.includes('gemini-3');

        if (isGemini3) {
            // Gemini 3.0: Use thinking_level
            return {
                thinking_level: level || "minimal"  // Default to minimal to save cost
            };
        } else {
            // Gemini 2.5: Use thinkingBudget
            return {
                thinkingBudget: legacyEnableThinking ? -1 : 0
            };
        }
    };


    // Clean text: Normalize Unicode (NFC) and remove excessive whitespace
    text = text.normalize('NFC').trim().replace(/\n\s*\n/g, '\n\n');

    try {
        // 1. Build Glossary Context
        onLog({
            timestamp: new Date(),
            message: '📚 Đang tải từ điển...',
            type: 'info'
        });
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
        onLog({
            timestamp: new Date(),
            message: '🤖 Đang gửi yêu cầu đến AI...',
            type: 'info'
        });

        // 4. Call API with Adaptive Tokens (Smart Retry)
        const adaptiveResult = await withAdaptiveTokens(
            async (maxTokens: number) => {
                console.log(`📡 [PAYLOAD] Model: ${aiModel} | Content Size: ${text.length} chars | System Instruction Size: ${fullInstruction.length} chars | Dynamic maxTokens: ${maxTokens}`);

                return await withKeyRotation<GeminiResponse>(
                    {
                        model: (aiModel as string).trim(),
                        systemInstruction: fullInstruction,
                        prompt: text,
                        generationConfig: {
                            temperature: 0.1,
                            topP: 0.95,
                            maxOutputTokens: maxTokens,
                            responseMimeType: "text/plain",
                            thinkingConfig: buildThinkingConfig(aiModel as string, enableThinking, thinkingLevel)
                        }
                    },
                    (msg: string) => {
                        onLog({ timestamp: new Date(), message: msg, type: 'info' });
                    }
                );
            },
            (result) => {
                const candidates = (result as GeminiResponse).candidates;
                return candidates?.[0]?.finishReason;
            },
            {
                inputLength: text.length,  // Content length only (for output estimation)
                baseBuffer: 3500,  // Gemini 2.5 Flash thinking tokens (observed: 1858-3108, avg ~2500)
                minTokens: 2048,
                maxTokens: 16384   // Gemini 2.5 Flash supports up to 65K, but 16K is practical limit
            }
        );

        // Warn if chapter is too long for non-chunking
        if (text.length > 5000) {
            onLog({
                timestamp: new Date(),
                message: `⚠️ Chapter dài ${text.length} chars - Khuyến nghị bật Chunking để tránh lỗi MAX_TOKENS`,
                type: 'info'
            });
        }

        const rawResult = adaptiveResult.data;



        // Track retry for final message (don't toast immediately)
        const wasRetried = adaptiveResult.wasRetried;

        // Track usage with validated response
        if (rawResult.usageMetadata) {
            const metadata = rawResult.usageMetadata;
            const thinkingTokens = metadata.thoughtsTokenCount || 0;
            const inputTokens = metadata.promptTokenCount || 0;
            const outputTokens = metadata.candidatesTokenCount || 0;

            console.log(`🧠 [THINKING TOKENS] Input: ${inputTokens} | Output: ${outputTokens} | Thinking: ${thinkingTokens} | Total: ${inputTokens + outputTokens + thinkingTokens}`);

            recordUsage(aiModel as string, rawResult.usageMetadata);
        }

        // 5. Extract & Validate Response
        const rawText = extractResponseText(rawResult).trim();

        if (!rawText || rawText.trim() === "") {
            const finishReason = adaptiveResult.finishReason;
            if (finishReason === "MAX_TOKENS") {
                throw new Error(`❌ Chapter quá dài (${text.length} chars) - Output bị cắt do MAX_TOKENS! Hãy BẬT CHUNKING trong cấu hình dịch.`);
            }
            throw new Error(`❌ AI trả về nội dung rỗng! Finish reason: ${finishReason}. Có thể do: API lỗi, Prompt bị reject, hoặc Content vi phạm policy.`);
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
        const retrySuffix = wasRetried ? " (retry)" : "";
        onLog({
            timestamp: new Date(),
            message: `✅ Dịch xong!${tokenMsg}${retrySuffix}`,
            type: 'success'
        });
        onSuccess(result);

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        onLog({ timestamp: new Date(), message: `Lỗi: ${message}`, type: 'error' });
        throw error;
    }
};
