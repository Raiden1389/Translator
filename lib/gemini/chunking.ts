import { db } from "../db";
import { ChunkOptions, TranslationResult, TranslationLog } from "./types";
import { finalSweep, generateCacheKey } from "./helpers";
import { SYSTEM_VERSION } from "./constants";
import pLimit from "p-limit";
import { DEFAULT_MODEL } from "../ai-models";

/**
 * Split text into BALANCED chunks by paragraph boundaries
 */
export function splitByParagraph(text: string, maxCharsPerChunk: number): string[] {
    if (text.length <= maxCharsPerChunk * 1.1) return [text];

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
 */
export async function shouldUseChunking(text: string): Promise<ChunkOptions> {
    const chunkingSetting = await db.settings.get("enableChunking");
    const chunkSizeSetting = await db.settings.get("chunkSize");
    const maxConcurrentSetting = await db.settings.get("maxConcurrentChunks");

    const enabled = chunkingSetting?.value === true || chunkingSetting?.value === "true";

    // DEFAULT to 1000 chars per chunk to engage parallel slots efficiently
    const maxCharsPerChunk = parseInt((chunkSizeSetting?.value as string) || "1000");
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
    translateFn: (workspaceId: string, text: string, onLog: (log: TranslationLog) => void, onSuccess: (result: TranslationResult) => void, customInstruction?: string, sharedGlossary?: any[]) => Promise<void>,
    customInstruction?: string,
    sharedGlossary?: any[]
): Promise<TranslationResult> {
    const modelSetting = await db.settings.get("aiModel");
    const aiModel = (modelSetting?.value as string) || DEFAULT_MODEL;

    // 1. Generate Cache Key
    const cacheKey = await generateCacheKey(chunk, aiModel, (customInstruction || "") + SYSTEM_VERSION + (sharedGlossary ? JSON.stringify(sharedGlossary) : ""));

    // 2. Check Cache
    const cached = await db.translationCache.get(cacheKey);
    if (cached) {
        console.log(`⚡ [CACHE HIT] Skip translation for chunk (${chunk.length} chars)`);
        return cached.result;
    }

    // 3. Translate & Cache
    return new Promise((resolve, reject) => {
        translateFn(
            workspaceId,
            chunk,
            () => { },  // Ignore logs for individual chunks
            (result) => {
                // Save to Cache
                db.translationCache.put({
                    key: cacheKey,
                    result: result,
                    model: aiModel,
                    timestamp: new Date()
                }).catch(console.error);

                resolve(result);
            },
            customInstruction,
            sharedGlossary
        ).catch(reject);
    });
}

/**
 * Translate with parallel chunking (main export)
 */
export async function translateWithChunking(
    workspaceId: string,
    text: string,
    translateFn: (workspaceId: string, text: string, onLog: (log: TranslationLog) => void, onSuccess: (result: TranslationResult) => void, customInstruction?: string, sharedGlossary?: any[]) => Promise<void>,
    onLog: (log: TranslationLog) => void,
    options?: Partial<ChunkOptions> & { onProgress?: (current: number, total: number) => void },
    customInstruction?: string,
    sharedGlossary?: any[]
): Promise<TranslationResult> {
    const dbOptions = await shouldUseChunking(text);
    const finalOptions = { ...dbOptions, ...options };

    // If chunking disabled or text too short, use normal translation
    if (!finalOptions.enabled) {
        return new Promise((resolve, reject) => {
            translateFn(workspaceId, text, onLog, (res) => {
                // ABSOLUTE FINAL SWEEP: Quét cửa lúc đi ra
                res.translatedText = finalSweep(res.translatedText);
                if (res.translatedTitle) res.translatedTitle = finalSweep(res.translatedTitle);
                resolve(res);
            }, customInstruction, sharedGlossary).catch(reject);
        });
    }

    // Split into chunks
    const chunks = splitByParagraph(text, finalOptions.maxCharsPerChunk!);
    const chunkSizes = chunks.map(c => c.length);
    const batchId = Math.random().toString(36).substring(2, 8).toUpperCase();

    const msg = `[${batchId}] Đã chia đều thành ${chunks.length} chunks song song: [${chunkSizes.join(", ")} chars]`;
    console.log(`🚀 ${msg}`);
    onLog({ timestamp: new Date(), message: msg, type: 'info' });

    try {
        const { aiQueue } = await import("../services/ai-queue");

        const promises = chunks.map((chunk, index) => {
            return aiQueue.enqueue('MEDIUM', async () => {
                const chunkStart = Date.now();
                console.log(`📦 [${batchId}] Chunk ${index + 1}/${chunks.length} Bắt đầu (${chunk.length} ký tự)`);
                finalOptions.onProgress?.(index + 1, chunks.length);

                try {
                    const res = await translateSingleChunk(workspaceId, chunk, translateFn, customInstruction, sharedGlossary);
                    console.log(`✅ [${batchId}] Chunk ${index + 1}/${chunks.length} xong sau ${Date.now() - chunkStart}ms`);
                    return res;
                } catch (err) {
                    console.error(`❌ [${batchId}] Chunk ${index + 1} thất bại:`, err);
                    throw err;
                }
            }, `${batchId}-chunk-${index}`);
        });

        const results = await Promise.all(promises);

        let translatedText = results.map(r => r.translatedText).join('\n\n');
        // ABSOLUTE FINAL SWEEP: Quét cửa lúc đi ra
        translatedText = finalSweep(translatedText);

        let translatedTitle = results.length > 0 ? results[0].translatedTitle : undefined;
        if (translatedTitle) translatedTitle = finalSweep(translatedTitle);

        let totalTerms = 0;
        let totalChars = 0;
        results.forEach(r => {
            if (r.stats) {
                totalTerms += r.stats.terms;
                totalChars += r.stats.characters;
            }
        });

        onLog({ timestamp: new Date(), message: `Đã dịch song song xong ${chunks.length} chunks!`, type: 'success' });

        return {
            translatedText,
            translatedTitle,
            stats: { terms: totalTerms, characters: totalChars }
        };
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        onLog({ timestamp: new Date(), message: `Lỗi chunking: ${errorMsg}`, type: 'error' });
        throw error;
    }
}
