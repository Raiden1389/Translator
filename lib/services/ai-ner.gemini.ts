import { withKeyRotation, recordUsage } from '../gemini/client';
import { safeParseNERResponse } from '../schemas/ai-services.schema';
import { buildGeminiNERPrompt } from './ai-ner.prompt';
import { extractNERArrayCandidate, previewNERText } from './ai-ner.parse';
import { EntityType, ExtractedEntity, GeminiResponse } from './ai-ner.types';

const NER_RESPONSE_SCHEMA = {
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

export async function runGeminiNERChunk(
    chunkText: string,
    allowedTypes: EntityType[],
    model: string,
    onProgress?: (message: string) => void,
): Promise<ExtractedEntity[]> {
    const response = await withKeyRotation<GeminiResponse>({
        model,
        systemInstruction: `Bạn là bộ trích xuất thực thể cho app dịch truyện. CHỈ trả JSON hợp lệ theo schema đã yêu cầu. Không markdown, không prose, không giải thích, không bọc \`\`\`. Nếu không có thực thể phù hợp thì trả về []`,
        prompt: buildGeminiNERPrompt(chunkText, allowedTypes.join(', ')),
        generationConfig: {
            temperature: 0,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
            responseSchema: NER_RESPONSE_SCHEMA,
        }
    }, onProgress);

    if (response.usageMetadata) {
        await recordUsage(model, response.usageMetadata);
    }

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonCandidate = extractNERArrayCandidate(text);
    if (!jsonCandidate) {
        throw new Error(`Gemini NER không trả JSON hợp lệ${previewNERText(text) ? ` | preview: ${previewNERText(text)}` : ""}`);
    }

    const validationResult = safeParseNERResponse(JSON.parse(jsonCandidate));
    if (!validationResult.success) {
        throw new Error(`Gemini NER trả format sai: ${validationResult.error}${previewNERText(text) ? ` | preview: ${previewNERText(text)}` : ""}`);
    }

    return (validationResult.data as ExtractedEntity[]).filter((entity) =>
        allowedTypes.includes(entity.type as EntityType)
    );
}
