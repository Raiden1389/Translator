import { withKeyRotation, recordUsage } from '../gemini/client';
import { safeParseNERResponse } from '../schemas/ai-services.schema';

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
    workspaceId: string,
    options: ExtractionOptions = {}
): Promise<ExtractedEntity[]> {
    const { allowedTypes = [EntityType.Person, EntityType.Location, EntityType.Organization, EntityType.Skill], onProgress } = options;

    if (!chineseText || chineseText.trim().length === 0) {
        return [];
    }

    onProgress?.('Đang phân tích văn bản bằng Gemini AI...');

    const typesList = allowedTypes.join(', ');

    // Chunk text if too long (8000 chars per chunk for optimal performance)
    const CHUNK_SIZE = 8000;
    const chunks: string[] = [];

    for (let i = 0; i < chineseText.length; i += CHUNK_SIZE) {
        chunks.push(chineseText.slice(i, i + CHUNK_SIZE));
    }

    const allResults: ExtractedEntity[] = [];

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
        if (chunks.length > 1) {
            onProgress?.(`Đang quét chunk ${i + 1}/${chunks.length}...`);
        }

        const prompt = `Bạn là chuyên gia dịch truyện Trung-Việt. Trích xuất các thực thể (Tên người, Địa danh, Tổ chức, Công pháp/Kỹ năng) từ văn bản tiếng Trung và PHẢI DỊCH/PHIÊN ÂM SANG TIẾNG VIỆT:

Loại cần trích: ${typesList}

Văn bản tiếng Trung:
"""
${chunks[i]}
"""

YÊU CẦU BẮT BUỘC:
1. "original": Phải là TÊN TIẾNG VIỆT (Hán Việt hoặc phiên âm Latin). TUYỆT ĐỐI KHÔNG ĐỂ NGUYÊN CHỮ HÁN.
   - Ví dụ: 埃克西利昂 -> Ecxilion, 卡缪 -> Camille, 帕特里克 -> Patrick.
2. "chinese": Tên gốc tiếng Trung (chữ Hán).
3. "context": Mô tả ngắn bằng tiếng Việt về thực thể này trong cốt truyện.

VÍ DỤ ĐÚNG:
[
  {"original":"Trương Tam Phong","chinese":"张三丰","type":"Person","context":"Cao thủ võ lâm của phái Võ Đang"},
  {"original":"Võ Đang Sơn","chinese":"武当山","type":"Location","context":"Địa điểm tu luyện chính"},
  {"original":"Arthur","chinese":"亚瑟","type":"Person","context":"Kỵ sĩ vương"}
]

Trả về JSON array. CHỈ trả JSON, không thêm text giải thích.`;

        try {
            const response = await withKeyRotation<GeminiResponse>({
                model: 'gemini-2.5-flash-lite',
                prompt,
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 2048,
                }
            }, onProgress);

            // Record usage
            if (response.usageMetadata) {
                await recordUsage('gemini-2.5-flash-lite', response.usageMetadata);
            }

            const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

            // Parse JSON response
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                console.warn(`Chunk ${i + 1}: No JSON array found in response`);
                continue; // Skip this chunk, continue with next
            }

            // ✅ Validate with Zod
            const rawData = JSON.parse(jsonMatch[0]);
            const validationResult = safeParseNERResponse(rawData);

            if (!validationResult.success) {
                console.error(`Chunk ${i + 1}: AI response validation failed:`, validationResult.error);
                onProgress?.(`⚠️ Chunk ${i + 1}: AI trả về format sai, bỏ qua...`);
                continue;
            }

            const entities = validationResult.data as ExtractedEntity[];
            console.log(`[AI NER] Chunk ${i + 1} raw entities:`, entities.map(e => `${e.chinese}→${e.original} (${e.type})`));

            // Filter by allowed types
            const filtered = entities.filter(e =>
                allowedTypes.includes(e.type as EntityType)
            );

            allResults.push(...filtered);

        } catch (error) {
            console.error(`Chunk ${i + 1} extraction failed:`, error);
            // Continue with other chunks
        }
    }

    // Deduplicate by chinese name (across chunks)
    const uniqueMap = new Map<string, ExtractedEntity>();
    allResults.forEach(entity => {
        if (!uniqueMap.has(entity.chinese)) {
            uniqueMap.set(entity.chinese, entity);
        }
    });

    const deduplicated = Array.from(uniqueMap.values());
    console.log(`[AI NER] Total after dedup: ${deduplicated.length}`, deduplicated.map(e => `${e.chinese}→${e.original}`));

    // Filter out entities already in dictionary
    const { db } = await import('../db');

    const [existingTerms, blacklistTerms, heuristicTerms] = await Promise.all([
        db.dictionary.where("workspaceId").equals(workspaceId).toArray(),
        db.blacklist.where("workspaceId").equals(workspaceId).toArray(),
        db.heuristicTerms.where("workspaceId").equals(workspaceId).toArray()
    ]);

    const existingChinese = new Set(existingTerms.map(t => t.original));
    const existingVietnamese = new Set(existingTerms.map(t => t.translated));
    const blacklistedChinese = new Set(blacklistTerms.map(b => b.word));
    const approvedHeuristic = new Set(
        heuristicTerms.filter(h => h.isApproved).map(h => h.original)
    );

    const newEntities = deduplicated.filter(e => {
        const inDict = existingChinese.has(e.chinese);
        const inDictVi = existingVietnamese.has(e.original);
        const inBlacklist = blacklistedChinese.has(e.chinese);
        const inHeuristic = approvedHeuristic.has(e.chinese);
        if (inDict || inDictVi || inBlacklist || inHeuristic) {
            console.log(`[AI NER] FILTERED OUT: ${e.chinese}→${e.original} (dict:${inDict}, dictVi:${inDictVi}, bl:${inBlacklist}, heu:${inHeuristic})`);
        }
        return !inDict && !inDictVi && !inBlacklist && !inHeuristic;
    });

    const filteredCount = deduplicated.length - newEntities.length;
    if (filteredCount > 0) {
        onProgress?.(`Đã tìm thấy ${newEntities.length} thực thể mới (loại bỏ ${filteredCount} trùng lặp với từ điển)`);
    } else {
        onProgress?.(`Đã tìm thấy ${newEntities.length} thực thể mới!`);
    }

    return newEntities;
}

/**
 * Extract entities from multiple chapters (batch processing)
 */
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