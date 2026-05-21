import { resolveNERRuntimeConfig } from './ai-ner.runtime';
import { dedupeEntitiesByChinese, filterExistingEntities } from './ai-ner.filter';
import { runGeminiNERChunk } from './ai-ner.gemini';
import { runVertexNERChunk } from './ai-ner.vertex';
import { EntityType, ExtractedEntity, ExtractionOptions } from './ai-ner.types';

export { EntityType };
export type { ExtractedEntity, ExtractionOptions };

/**
 * AI NER Service
 *
 * Public API mỏng cho feature quét thuật ngữ.
 * Provider-specific flow, parsing, và filtering đã được tách ra module riêng.
 */
export async function extractEntities(
    chineseText: string,
    workspaceId: string,
    options: ExtractionOptions = {}
): Promise<ExtractedEntity[]> {
    const {
        allowedTypes = [EntityType.Person, EntityType.Location, EntityType.Organization, EntityType.Skill, EntityType.Item],
        onProgress
    } = options;

    if (!chineseText || chineseText.trim().length === 0) {
        return [];
    }

    onProgress?.('Đang phân tích văn bản bằng Gemini AI...');

    const runtime = await resolveNERRuntimeConfig(onProgress);
    const chunkSize = runtime.provider === 'vertex' ? 6000 : 8000;
    const chunks: string[] = [];

    for (let i = 0; i < chineseText.length; i += chunkSize) {
        chunks.push(chineseText.slice(i, i + chunkSize));
    }

    const allResults: ExtractedEntity[] = [];
    let successfulChunks = 0;
    let lastChunkFailure: string | null = null;

    for (let i = 0; i < chunks.length; i++) {
        if (chunks.length > 1) {
            onProgress?.(`Đang quét chunk ${i + 1}/${chunks.length}...`);
        }

        try {
            const entities = runtime.provider === 'vertex'
                ? await runVertexNERChunk(chunks[i], allowedTypes, runtime.model, i + 1, chunks.length, onProgress)
                : await runGeminiNERChunk(chunks[i], allowedTypes, runtime.model, onProgress);

            successfulChunks++;
            console.log(`[AI NER] Chunk ${i + 1} raw entities:`, entities.map(e => `${e.chinese}→${e.original} (${e.type})`));
            allResults.push(...entities);
        } catch (error) {
            console.error(`Chunk ${i + 1} extraction failed:`, error);
            lastChunkFailure = error instanceof Error ? error.message : String(error);
            onProgress?.(`⚠️ Chunk ${i + 1}: ${lastChunkFailure}`);
        }
    }

    if (successfulChunks === 0 && chunks.length > 0) {
        throw new Error(lastChunkFailure || `AI quét thuật ngữ thất bại với model ${runtime.model}.`);
    }

    const deduplicated = dedupeEntitiesByChinese(allResults);
    console.log(`[AI NER] Total after dedup: ${deduplicated.length}`, deduplicated.map(e => `${e.chinese}→${e.original}`));

    const filtered = await filterExistingEntities(deduplicated, workspaceId);
    if (filtered.filteredCount > 0) {
        onProgress?.(`Đã tìm thấy ${filtered.entities.length} thực thể mới (loại bỏ ${filtered.filteredCount} trùng lặp với từ điển)`);
    } else {
        onProgress?.(`Đã tìm thấy ${filtered.entities.length} thực thể mới!`);
    }

    return filtered.entities;
}

export async function extractEntitiesBatch(
    chapters: Array<{ id: number; content: string }>,
    workspaceId: string,
    options: ExtractionOptions = {}
): Promise<Map<number, ExtractedEntity[]>> {
    const results = new Map<number, ExtractedEntity[]>();

    for (const chapter of chapters) {
        options.onProgress?.(`Đang quét chapter ${chapter.id}...`);
        const entities = await extractEntities(chapter.content, workspaceId, options);
        results.set(chapter.id, entities);
    }

    return results;
}
