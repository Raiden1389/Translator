import { db, DictionaryEntry } from "../db";
import { ChunkOptions, TranslationResult, TranslationLog } from "./types";
import { finalSweep } from "./contentProcessor";
import pLimit from "p-limit";

/**
 * Split text into BALANCED chunks by paragraph boundaries
 */
export function splitByParagraph(text: string, maxCharsPerChunk: number): string[] {
    if (text.length <= maxCharsPerChunk) return [text];

    // 1. Identify all possible break points (single or double newlines)
    const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);
    if (paragraphs.length <= 1) return [text];

    // 2. Calculate ideal number of chunks and target size for each
    const totalLength = text.length;
    const numChunks = Math.ceil(totalLength / maxCharsPerChunk);
    const targetSize = Math.floor(totalLength / numChunks);

    const chunks: string[] = [];
    let currentChunk = "";

    for (const para of paragraphs) {
        const separator = currentChunk ? "\n\n" : "";

        // If current chunk is already big enough (near target), start a new one
        // EXCEPT if it's the very first paragraph (title) - we always try to attach it to content
        if (currentChunk.length >= targetSize && chunks.length < numChunks - 1) {
            chunks.push(currentChunk.trim());
            currentChunk = para;
        } else {
            currentChunk += separator + para;
        }
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    // Final safety check: if we somehow missed the mark, just return the chunks
    return chunks.length > 0 ? chunks : [text];
}

/**
 * Check if chunking should be enabled based on settings and text length
 * AUTO-DISABLES chunking when using OAuth to avoid RPH bottleneck
 */
export async function shouldUseChunking(text: string): Promise<ChunkOptions> {
    const chunkingSetting = await db.settings.get("enableChunking");
    const chunkSizeSetting = await db.settings.get("chunkSize");
    const maxConcurrentSetting = await db.settings.get("maxConcurrentChunks");

    const enabled = chunkingSetting?.value === true || chunkingSetting?.value === "true";

    // 🛡️ OAUTH BYPASS: Đã xóa bỏ logic tự động disable theo lệnh Tông chủ.
    // Chunking sẽ luôn hoạt động theo ý muốn của Sếp.

    // DEFAULT to 1100 chars per chunk (optimized for 2.5k chapters = 3 chunks)
    const maxCharsPerChunk = parseInt((chunkSizeSetting?.value as string) || "1100");
    const maxConcurrent = parseInt((maxConcurrentSetting?.value as string) || "3");

    return {
        enabled: enabled && text.length > maxCharsPerChunk,
        maxCharsPerChunk,
        maxConcurrent
    };
}

/**
 * Translate a single chunk (used by parallel chunking)
 */
export async function translateSingleChunk(
    workspaceId: string,
    chunk: string,
    translateFn: (
        workspaceId: string,
        text: string,
        onLog: (log: TranslationLog) => void,
        onSuccess: (result: TranslationResult) => void,
        customInstruction?: string,
        sharedGlossary?: DictionaryEntry[],
        enableThinking?: boolean,
        thinkingLevel?: "minimal" | "low" | "medium" | "high"
    ) => Promise<void>,
    customInstruction?: string,
    sharedGlossary?: DictionaryEntry[],
    enableThinking?: boolean,
    thinkingLevel?: "minimal" | "low" | "medium" | "high"
): Promise<TranslationResult> {
    // Direct translation without cache
    return new Promise((resolve, reject) => {
        translateFn(
            workspaceId,
            chunk,
            () => { },  // Ignore logs for individual chunks
            (result) => resolve(result),
            customInstruction,
            sharedGlossary,
            enableThinking,
            thinkingLevel
        ).catch(reject);
    });
}

/**
 * Translate with parallel chunking (main export)
 */
export async function translateWithChunking(
    workspaceId: string,
    text: string,
    translateFn: (
        workspaceId: string,
        text: string,
        onLog: (log: TranslationLog) => void,
        onSuccess: (result: TranslationResult) => void,
        customInstruction?: string,
        sharedGlossary?: DictionaryEntry[],
        enableThinking?: boolean,
        thinkingLevel?: "minimal" | "low" | "medium" | "high"
    ) => Promise<void>,
    onLog: (log: TranslationLog) => void,
    options?: Partial<ChunkOptions> & {
        onProgress?: (current: number, total: number) => void,
        enableThinking?: boolean,
        thinkingLevel?: "minimal" | "low" | "medium" | "high"
    },
    customInstruction?: string,
    sharedGlossary?: DictionaryEntry[]
): Promise<TranslationResult> {
    const dbOptions = await shouldUseChunking(text);

    // 🛡️ CRITICAL: Ưu tiên settings từ Dialog (Sếp chỉnh) lên hàng đầu
    const finalOptions = {
        ...dbOptions,
        ...options,
        enabled: options?.enabled !== undefined ? options.enabled : dbOptions.enabled
    };

    // Nếu Sếp đã bật và text vượt quá giới hạn -> BẮT BUỘC chẻ!
    if (finalOptions.enabled && text.length > (finalOptions.maxCharsPerChunk || 8000)) {
        finalOptions.enabled = true;
    }

    // Force enable if text is longer than size and UI explicitly requested it
    const threshold = finalOptions.maxCharsPerChunk || 8000;
    if (options?.enabled && text.length > threshold) {
        finalOptions.enabled = true;
    }

    // If chunking disabled or text too short, use normal translation
    if (!finalOptions.enabled) {
        return new Promise((resolve, reject) => {
            translateFn(
                workspaceId,
                text,
                onLog,
                (res) => {
                    // ABSOLUTE FINAL SWEEP: Quét cửa lúc đi ra
                    res.translatedText = finalSweep(res.translatedText);
                    if (res.translatedTitle) res.translatedTitle = finalSweep(res.translatedTitle);
                    res.wasChunked = false; // No chunking happened
                    resolve(res);
                },
                customInstruction,
                sharedGlossary,
                finalOptions.enableThinking,
                finalOptions.thinkingLevel
            ).catch(reject);
        });
    }

    // Split into chunks
    const chunks = splitByParagraph(text, finalOptions.maxCharsPerChunk!);
    const batchId = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Notify user about chunking
    onLog({
        timestamp: new Date(),
        message: `📦 Chương này chia làm ${chunks.length} chunks`,
        type: 'info'
    });
    finalOptions.onProgress?.(0, chunks.length);

    try {
        // Use local limit for chunks to avoid Global Queue Deadlock
        const chunkLimit = pLimit(finalOptions.maxConcurrent || 3);

        const promises = chunks.map((chunk, index) => {
            return chunkLimit(async () => {
                // Update progress BEFORE starting translation
                finalOptions.onProgress?.(index + 1, chunks.length);

                try {
                    // 🛡️ CONTINUITY: Only the first chunk should handle the title
                    let chunkInstruction = customInstruction;
                    if (index > 0) {
                        const continuityNote = "\n[CHÚ Ý: Đây là đoạn nối tiếp của cùng một chương. GIỮ NGUYÊN khóa xưng hô đã áp dụng từ trước: 我=Ta, 你=Ngươi, 他=Hắn, 她=Nàng, 它=Nó. CẤM dùng tôi, cô, cô ấy, anh, em, bạn, mình, cậu. KHÔNG suy diễn quan hệ hiện đại. KHÔNG dịch lại tiêu đề, KHÔNG thêm giải thích, chỉ dịch tiếp nội dung.]";
                        chunkInstruction = (customInstruction || "") + continuityNote;
                    }

                    const res = await translateSingleChunk(
                        workspaceId,
                        chunk,
                        translateFn,
                        chunkInstruction,
                        sharedGlossary,
                        finalOptions.enableThinking,
                        finalOptions.thinkingLevel
                    );
                    return res;
                } catch (err) {
                    console.error(`❌ [${batchId}] Chunk ${index + 1} thất bại:`, err);
                    throw err;
                }
            });
        });

        const results = await Promise.all(promises);

        let translatedText = results.map(r => r.translatedText).join('\n\n');
        // ABSOLUTE FINAL SWEEP: Quét cửa lúc đi ra
        translatedText = finalSweep(translatedText);

        let translatedTitle = results.length > 0 ? results[0].translatedTitle : undefined;
        if (translatedTitle) translatedTitle = finalSweep(translatedTitle);

        let totalTerms = 0;
        let totalChars = 0;
        let totalInputTokens = 0;
        let totalOutputTokens = 0;

        results.forEach(r => {
            if (r.stats) {
                totalTerms += r.stats.terms;
                totalChars += r.stats.characters;
                if (r.stats.tokens) {
                    totalInputTokens += r.stats.tokens.input;
                    totalOutputTokens += r.stats.tokens.output;
                }
            }
        });

        const totalTokens = totalInputTokens + totalOutputTokens;
        const tokenMsg = totalTokens > 0 ? ` [${totalInputTokens}i + ${totalOutputTokens}o = ${totalTokens}t]` : "";
        const chunkSuffix = ` (${chunks.length} chunks)`;
        onLog({
            timestamp: new Date(),
            message: `✅ Dịch xong!${tokenMsg}${chunkSuffix}`,
            type: 'success'
        });

        return {
            translatedText,
            translatedTitle,
            wasChunked: true, // Yes, it was chunked
            stats: {
                terms: totalTerms,
                characters: totalChars,
                tokens: {
                    input: totalInputTokens,
                    output: totalOutputTokens,
                    total: totalTokens
                }
            }
        };
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        onLog({ timestamp: new Date(), message: `Lỗi chunking: ${errorMsg}`, type: 'error' });
        throw error;
    }
}
