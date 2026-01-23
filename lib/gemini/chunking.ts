import { db } from "../db";
import { ChunkOptions, TranslationResult, TranslationLog } from "./types";

/**
 * Split text into chunks by paragraph boundaries
 */
export function splitByParagraph(text: string, maxCharsPerChunk: number): string[] {
    const paragraphs = text.split(/\n\n+/); // Split by double newlines
    const chunks: string[] = [];
    let currentChunk = "";

    for (const para of paragraphs) {
        // If adding this paragraph exceeds limit, save current chunk
        if (currentChunk.length + para.length > maxCharsPerChunk && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = para;
        } else {
            currentChunk += (currentChunk ? "\n\n" : "") + para;
        }
    }

    // Add remaining chunk
    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text]; // Fallback to original if no split
}

/**
 * Check if chunking should be enabled based on settings and text length
 */
export async function shouldUseChunking(text: string): Promise<ChunkOptions> {
    const chunkingSetting = await db.settings.get("enableChunking");
    const chunkSizeSetting = await db.settings.get("chunkSize");

    const enabled = chunkingSetting?.value === true || chunkingSetting?.value === "true";
    const maxCharsPerChunk = parseInt(chunkSizeSetting?.value || "1000");

    return {
        enabled: enabled && text.length > maxCharsPerChunk, // Only chunk if text is long enough
        maxCharsPerChunk,
        maxConcurrent: 3 // Paid tier 1 can handle 3 parallel requests safely
    };
}

/**
 * Translate a single chunk (used by parallel chunking)
 */
export async function translateSingleChunk(
    workspaceId: string,
    chunk: string,
    translateFn: (workspaceId: string, text: string, onLog: (log: TranslationLog) => void, onSuccess: (result: TranslationResult) => void, customInstruction?: string) => Promise<void>,
    customInstruction?: string
): Promise<TranslationResult> {
    return new Promise((resolve, reject) => {
        translateFn(
            workspaceId,
            chunk,
            () => { },  // Ignore logs for individual chunks
            (result) => resolve(result),
            customInstruction
        ).catch(reject);
    });
}

/**
 * Translate with parallel chunking (main export)
 */
export async function translateWithChunking(
    workspaceId: string,
    text: string,
    translateFn: (workspaceId: string, text: string, onLog: (log: TranslationLog) => void, onSuccess: (result: TranslationResult) => void, customInstruction?: string) => Promise<void>,
    onLog: (log: TranslationLog) => void,
    onProgress?: (current: number, total: number) => void,
    customInstruction?: string
): Promise<TranslationResult> {
    const options = await shouldUseChunking(text);

    // If chunking disabled or text too short, use normal translation
    if (!options.enabled) {
        return new Promise((resolve, reject) => {
            translateFn(workspaceId, text, onLog, resolve, customInstruction).catch(reject);
        });
    }

    // Split into chunks
    const chunks = splitByParagraph(text, options.maxCharsPerChunk);
    onLog({ timestamp: new Date(), message: `Chia thành ${chunks.length} chunks để dịch song song...`, type: 'info' });

    // Translate all chunks in parallel
    try {
        const results = await Promise.all(
            chunks.map((chunk, i) => {
                onProgress?.(i + 1, chunks.length);
                return translateSingleChunk(workspaceId, chunk, translateFn, customInstruction);
            })
        );

        // Merge results
        const translatedText = results.map(r => r.translatedText).join('\n\n');

        // Use title from the first chunk if available
        const translatedTitle = results.length > 0 ? results[0].translatedTitle : undefined;

        // Calculate total stats
        let totalTerms = 0;
        let totalChars = 0;
        results.forEach(r => {
            if (r.stats) {
                totalTerms += r.stats.terms;
                totalChars += r.stats.characters;
            }
        });

        onLog({ timestamp: new Date(), message: `Đã dịch xong ${chunks.length} chunks!`, type: 'success' });

        return {
            translatedText,
            translatedTitle,
            stats: { terms: totalTerms, characters: totalChars }
        };
    } catch (error: any) {
        onLog({ timestamp: new Date(), message: `Lỗi chunking: ${error.message}`, type: 'error' });
        throw error;
    }
}
