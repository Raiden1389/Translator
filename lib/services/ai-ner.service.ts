import { withKeyRotation, recordUsage } from '../gemini/client';

/**
 * AI NER Service - Named Entity Recognition using Gemini API
 * 
 * Extracts entities (Person, Location, Organization, Skill) from Chinese text
 * Completely independent from legacy Name Hunter system
 */

export enum EntityType {
    Person = 'Person',
    Location = 'Location',
    Organization = 'Organization',
    Skill = 'Skill',
    Unknown = 'Unknown'
}

export interface ExtractedEntity {
    original: string;      // Vietnamese translation
    chinese: string;       // Original Chinese text
    type: EntityType;
    context: string;       // AI-generated description
    confidence?: number;
}

export interface ExtractionOptions {
    allowedTypes?: EntityType[];
    onProgress?: (message: string) => void;
}

interface GeminiResponse {
    candidates?: Array<{
        content: {
            parts: Array<{ text: string }>;
        };
    }>;
    usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        thoughtsTokenCount?: number;
    };
}

/**
 * Extract entities from Chinese text using Gemini AI
 */
export async function extractEntities(
    chineseText: string,
    options: ExtractionOptions = {}
): Promise<ExtractedEntity[]> {
    const { allowedTypes = [EntityType.Person, EntityType.Location, EntityType.Organization, EntityType.Skill], onProgress } = options;

    if (!chineseText || chineseText.trim().length === 0) {
        return [];
    }

    onProgress?.('Đang phân tích văn bản bằng Gemini AI...');

    const typesList = allowedTypes.join(', ');

    const prompt = `Bạn là chuyên gia dịch truyện Trung-Việt. Trích xuất các thực thể sau từ văn bản tiếng Trung và DỊCH SANG TIẾNG VIỆT:

Loại cần trích: ${typesList}

Văn bản tiếng Trung:
"""
${chineseText.slice(0, 8000)}
"""

YÊU CẦU QUAN TRỌNG:
1. "original" phải là TÊN TIẾNG VIỆT (dịch từ tiếng Trung)
2. "chinese" là tên gốc tiếng Trung
3. "context" mô tả ngắn bằng tiếng Việt

VÍ DỤ ĐÚNG:
[
  {"original":"Trương Tam Phong","chinese":"张三丰","type":"Person","context":"Cao thủ võ lâm"},
  {"original":"Võ Đang Sơn","chinese":"武当山","type":"Location","context":"Núi thiêng"}
]

Trả về JSON array theo format trên. CHỈ trả JSON, không thêm text khác.`;

    try {
        const response = await withKeyRotation<GeminiResponse>({
            model: 'gemini-2.0-flash',
            prompt,
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 2048,
            }
        }, onProgress);

        // Record usage
        if (response.usageMetadata) {
            await recordUsage('gemini-2.0-flash', response.usageMetadata);
        }

        onProgress?.('Đang xử lý kết quả...');

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Parse JSON response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.warn('No JSON array found in response:', text);
            return [];
        }

        const entities: ExtractedEntity[] = JSON.parse(jsonMatch[0]);

        // Filter by allowed types
        const filtered = entities.filter(e =>
            allowedTypes.includes(e.type as EntityType)
        );

        onProgress?.(`Đã tìm thấy ${filtered.length} thực thể!`);

        return filtered;
    } catch (error) {
        console.error('AI NER extraction failed:', error);
        throw new Error(`Lỗi khi trích xuất thực thể: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Extract entities from multiple chapters (batch processing)
 */
export async function extractEntitiesBatch(
    chapters: Array<{ id: number; content: string }>,
    options: ExtractionOptions = {}
): Promise<Map<number, ExtractedEntity[]>> {
    const results = new Map<number, ExtractedEntity[]>();

    for (const chapter of chapters) {
        options.onProgress?.(`Đang quét chapter ${chapter.id}...`);

        try {
            const entities = await extractEntities(chapter.content, {
                ...options,
                onProgress: undefined // Disable per-chapter progress
            });
            results.set(chapter.id, entities);
        } catch (error) {
            console.error(`Failed to extract from chapter ${chapter.id}:`, error);
            results.set(chapter.id, []);
        }
    }

    return results;
}
