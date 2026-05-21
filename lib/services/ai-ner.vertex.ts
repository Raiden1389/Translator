import { withKeyRotation, recordUsage } from '../gemini/client';
import { safeParseNERResponse } from '../schemas/ai-services.schema';
import { extractNERArrayCandidate, previewNERText } from './ai-ner.parse';
import { buildGeminiNERPrompt } from './ai-ner.prompt';
import { EntityType, ExtractedEntity, GeminiResponse } from './ai-ner.types';

const VERTEX_NER_RESPONSE_SCHEMA = {
    type: "ARRAY",
    items: {
        type: "OBJECT",
        properties: {
            original: { type: "STRING" },
            chinese: { type: "STRING" },
            type: { type: "STRING", enum: ["Person", "Location", "Organization", "Skill", "Item", "Unknown"] },
            context: { type: "STRING" },
        },
        required: ["original", "chinese", "type", "context"],
    },
} as const;

async function requestVertexNERText(
    params: {
        model: string;
        systemInstruction: string;
        prompt: string;
        generationConfig: {
            temperature?: number;
            topP?: number;
            maxOutputTokens?: number;
            responseMimeType?: string;
            responseSchema?: unknown;
        };
    },
    onProgress?: (message: string) => void,
): Promise<string> {
    const response = await withKeyRotation<GeminiResponse>(params, onProgress);
    if (response.usageMetadata) {
        await recordUsage(params.model, response.usageMetadata);
    }
    return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function extractVertexEntities(
    chunkText: string,
    allowedTypes: EntityType[],
    model: string,
    onProgress?: (message: string) => void,
): Promise<ExtractedEntity[]> {
    const rawText = await requestVertexNERText({
        model,
        systemInstruction: "Bạn là bộ trích xuất thuật ngữ cho app dịch truyện. Chỉ trả JSON array hợp lệ theo schema. Không markdown, không prose. Chỉ lấy tên riêng/địa danh/tổ chức/công pháp/vật phẩm thật; bỏ qua danh từ chung như nam tử, nữ tử, thiếu niên, lão giả.",
        prompt: buildGeminiNERPrompt(chunkText, allowedTypes.join(', ')),
        generationConfig: {
            temperature: 0,
            topP: 0.95,
            maxOutputTokens: 3072,
            responseMimeType: "application/json",
            responseSchema: VERTEX_NER_RESPONSE_SCHEMA,
        }
    }, onProgress);

    const jsonCandidate = extractNERArrayCandidate(rawText);
    if (!jsonCandidate) {
        throw new Error(`Vertex NER không trả JSON hợp lệ${previewNERText(rawText) ? ` | preview: ${previewNERText(rawText)}` : ""}`);
    }

    const validationResult = safeParseNERResponse(JSON.parse(jsonCandidate));
    if (!validationResult.success) {
        throw new Error(`Vertex NER trả format sai: ${validationResult.error}${previewNERText(rawText) ? ` | preview: ${previewNERText(rawText)}` : ""}`);
    }

    return (validationResult.data as ExtractedEntity[]).filter((entity) =>
        allowedTypes.includes(entity.type as EntityType)
    );
}

export async function runVertexNERChunk(
    chunkText: string,
    allowedTypes: EntityType[],
    model: string,
    chunkIndex: number,
    chunkCount: number,
    onProgress?: (message: string) => void,
): Promise<ExtractedEntity[]> {
    onProgress?.(`⚡ Vertex NER: quét thuật ngữ chunk ${chunkIndex}/${chunkCount}...`);
    return extractVertexEntities(chunkText, allowedTypes, model, onProgress);
}
