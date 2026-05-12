import { db } from '../db';
import { DEFAULT_MODEL, migrateModelId } from '../ai-models';
import { normalizeAIProvider, normalizeVertexAuthMode, sanitizeModelForProvider } from '../ai-provider';
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
    Item = 'Item',
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

interface NERRuntimeConfig {
    provider: 'gemini' | 'vertex';
    model: string;
}

interface VertexSeedEntity {
    chinese: string;
    type: EntityType;
    context: string;
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

function previewNERText(rawText: string): string {
    return rawText
        .replace(/\s+/g, ' ')
        .replace(/```json|```/gi, '')
        .trim()
        .slice(0, 180);
}

function normalizeNERJsonText(rawText: string): string {
    const cleaned = rawText.replace(/```json|```/gi, '').trim();

    if (!cleaned) {
        return cleaned;
    }

    if (cleaned.startsWith('[')) {
        return cleaned;
    }

    if (cleaned.startsWith('{')) {
        const normalizedObjects = cleaned
            .replace(/}\s*,\s*{/g, '},{')
            .replace(/}\s*\n+\s*{/g, '},{');
        return `[${normalizedObjects}]`;
    }

    return cleaned;
}

function extractNERArrayCandidate(rawText: string): string | null {
    const normalized = normalizeNERJsonText(rawText);
    if (!normalized) {
        return null;
    }

    const arrayStart = normalized.indexOf('[');
    const lastBracket = normalized.lastIndexOf(']');
    const lastBrace = normalized.lastIndexOf('}');

    if (arrayStart !== -1) {
        if (lastBracket > arrayStart) {
            return normalized.slice(arrayStart, lastBracket + 1);
        }
        if (lastBrace > arrayStart) {
            return `${normalized.slice(arrayStart, lastBrace + 1)}]`;
        }
    }

    if (normalized.startsWith('{') && lastBrace !== -1) {
        return `[${normalized.slice(0, lastBrace + 1)}]`;
    }

    return null;
}

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

async function resolveNERModel(onProgress?: (message: string) => void): Promise<string> {
    const [providerSetting, vertexAuthModeSetting, modelSetting] = await Promise.all([
        db.settings.get("aiProvider"),
        db.settings.get("vertexAuthMode"),
        db.settings.get("aiModel"),
    ]);

    const provider = normalizeAIProvider(providerSetting?.value);
    const vertexAuthMode = normalizeVertexAuthMode(vertexAuthModeSetting?.value);
    const configuredModel = sanitizeModelForProvider(
        provider,
        migrateModelId((modelSetting?.value as string) || DEFAULT_MODEL),
        vertexAuthMode
    );

    if (provider === "vertex" && vertexAuthMode === "apiKey" && configuredModel.includes("flash-lite")) {
        onProgress?.(`ℹ️ Vertex AI tại Singapore không hợp với ${configuredModel}, AI quét thuật ngữ tạm dùng gemini-2.5-flash.`);
        return "gemini-2.5-flash";
    }

    // Gemini 3 (preview) chưa support Structured JSON Output ổn định trên Vertex AI.
    // Khi dùng responseSchema, nó trả về content={role:"model"} không có parts → lỗi Zod.
    // Block cả apiKey lẫn serviceAccount để an toàn.
    if (provider === "vertex" && configuredModel.startsWith("gemini-3")) {
        onProgress?.(`ℹ️ ${configuredModel} chưa hỗ trợ Structured JSON trên Vertex AI, AI quét thuật ngữ tạm dùng gemini-2.5-flash.`);
        return "gemini-2.5-flash";
    }

    return configuredModel;
}

async function resolveNERRuntimeConfig(onProgress?: (message: string) => void): Promise<NERRuntimeConfig> {
    const providerSetting = await db.settings.get("aiProvider");
    const provider = normalizeAIProvider(providerSetting?.value);
    const model = await resolveNERModel(onProgress);
    return { provider, model };
}

async function requestNERText(
    params: {
        model: string;
        systemInstruction?: string;
        prompt: string;
        generationConfig?: {
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

function normalizeEntityType(value: unknown): EntityType | null {
    if (typeof value !== "string") return null;
    const normalized = value.trim().toLowerCase();
    if (normalized === "person" || normalized === "nhân vật") return EntityType.Person;
    if (normalized === "location" || normalized === "địa danh") return EntityType.Location;
    if (normalized === "organization" || normalized === "tổ chức") return EntityType.Organization;
    if (normalized === "skill" || normalized === "công pháp" || normalized === "kỹ năng") return EntityType.Skill;
    if (normalized === "item" || normalized === "vật phẩm" || normalized === "pháp bảo") return EntityType.Item;
    if (normalized === "unknown") return EntityType.Unknown;
    return null;
}

function parseVertexSeedEntities(rawData: unknown): VertexSeedEntity[] {
    if (!Array.isArray(rawData)) return [];

    return rawData
        .map((item) => {
            if (!item || typeof item !== "object") return null;
            const record = item as Record<string, unknown>;
            const chinese = typeof record.chinese === "string" ? record.chinese.trim() : "";
            const type = normalizeEntityType(record.type);
            const context = typeof record.context === "string" ? record.context.trim() : "";

            if (!chinese || !type) return null;

            return {
                chinese,
                type,
                context,
            } satisfies VertexSeedEntity;
        })
        .filter((item): item is VertexSeedEntity => item !== null);
}

async function extractVertexSeedEntities(
    chunkText: string,
    typesList: string,
    model: string,
    onProgress?: (message: string) => void,
): Promise<VertexSeedEntity[]> {
    const prompt = `Bạn là bộ quét thực thể cho app dịch truyện Trung-Việt.
NHIỆM VỤ: vét CÀNG ĐỦ CÀNG TỐT tất cả thực thể mới xuất hiện trong đoạn, không bỏ sót tên chỉ xuất hiện 1 lần.

Loại cần trích: ${typesList}

Văn bản tiếng Trung:
"""
${chunkText}
"""

QUY TẮC:
1. Ưu tiên RECALL: thà trả hơi dư còn hơn bỏ sót.
2. Mỗi thực thể trả 1 object gồm:
   - "chinese": chữ Hán gốc
   - "type": chỉ được là Person | Location | Organization | Skill | Item | Unknown
   - "context": mô tả ngắn bằng tiếng Việt
3. Không cần dịch sang tiếng Việt ở bước này.
4. Gộp mục trùng nhau trong cùng đoạn.
5. Nếu không có thì trả [].

CHỈ trả JSON array, không thêm giải thích.`;

    const rawText = await requestNERText({
        model,
        systemInstruction: "Chỉ trả JSON array hợp lệ. Không markdown. Không prose. Ưu tiên liệt kê ĐẦY ĐỦ thực thể hơn là chọn vài thực thể nổi bật.",
        prompt,
        generationConfig: {
            temperature: 0,
            topP: 0.95,
            maxOutputTokens: 3072,
            responseMimeType: "application/json",
        }
    }, onProgress);

    const jsonCandidate = extractNERArrayCandidate(rawText);
    if (!jsonCandidate) {
        throw new Error(`Vertex pass 1 không trả JSON hợp lệ${previewNERText(rawText) ? ` | preview: ${previewNERText(rawText)}` : ""}`);
    }

    const parsed = JSON.parse(jsonCandidate);
    return parseVertexSeedEntities(parsed);
}

async function translateVertexSeedEntities(
    seeds: VertexSeedEntity[],
    model: string,
    onProgress?: (message: string) => void,
): Promise<ExtractedEntity[]> {
    if (seeds.length === 0) return [];

    const prompt = `Bạn là chuyên gia đặt thuật ngữ Trung-Việt cho app dịch truyện.
Hãy đổi danh sách thực thể sau sang tên tiếng Việt chuẩn.

QUY TẮC:
1. Giữ nguyên số lượng phần tử, không được bỏ mục nào.
2. "original" phải là tên tiếng Việt/Hán Việt/phiên âm Latin phù hợp ngữ cảnh.
3. "chinese" giữ nguyên chữ Hán đầu vào.
4. "type" giữ nguyên giá trị đầu vào.
5. "context" viết ngắn gọn bằng tiếng Việt, có thể cải thiện cho tự nhiên hơn.
6. Với tên người Tây phương, ưu tiên dạng Latin tự nhiên (ví dụ Arthur, Patrick).
7. Với địa danh/công pháp/vật phẩm kiểu tiên hiệp, ưu tiên Hán Việt chuẩn.

Input JSON:
${JSON.stringify(seeds)}

CHỈ trả JSON array theo dạng:
[
  {"original":"...","chinese":"...","type":"Person","context":"..."}
]`;

    const rawText = await requestNERText({
        model,
        systemInstruction: "Chỉ trả JSON array hợp lệ, đủ số lượng mục như input. Không markdown. Không prose.",
        prompt,
        generationConfig: {
            temperature: 0,
            topP: 0.9,
            maxOutputTokens: 3072,
            responseMimeType: "application/json",
        }
    }, onProgress);

    const jsonCandidate = extractNERArrayCandidate(rawText);
    if (!jsonCandidate) {
        throw new Error(`Vertex pass 2 không trả JSON hợp lệ${previewNERText(rawText) ? ` | preview: ${previewNERText(rawText)}` : ""}`);
    }

    const rawData = JSON.parse(jsonCandidate);
    const validationResult = safeParseNERResponse(rawData);
    if (!validationResult.success) {
        throw new Error(`Vertex pass 2 trả format sai: ${validationResult.error}${previewNERText(rawText) ? ` | preview: ${previewNERText(rawText)}` : ""}`);
    }

    return validationResult.data as ExtractedEntity[];
}

/**
 * Extract entities from Chinese text using Gemini AI
 */
export async function extractEntities(
    chineseText: string,
    workspaceId: string,
    options: ExtractionOptions = {}
): Promise<ExtractedEntity[]> {
    const { allowedTypes = [EntityType.Person, EntityType.Location, EntityType.Organization, EntityType.Skill, EntityType.Item], onProgress } = options;

    if (!chineseText || chineseText.trim().length === 0) {
        return [];
    }

    onProgress?.('Đang phân tích văn bản bằng Gemini AI...');

    const typesList = allowedTypes.join(', ');
    const runtime = await resolveNERRuntimeConfig(onProgress);
    const nerModel = runtime.model;
    const useVertexRecallFlow = runtime.provider === "vertex";

    // Vertex gets smaller chunks for better exhaustive recall.
    const CHUNK_SIZE = useVertexRecallFlow ? 6000 : 8000;
    const chunks: string[] = [];

    for (let i = 0; i < chineseText.length; i += CHUNK_SIZE) {
        chunks.push(chineseText.slice(i, i + CHUNK_SIZE));
    }

    const allResults: ExtractedEntity[] = [];
    let successfulChunks = 0;
    let lastChunkFailure: string | null = null;
    let lastChunkPreview: string | null = null;

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
            let entities: ExtractedEntity[];
            if (useVertexRecallFlow) {
                onProgress?.(`⚡ Vertex pass 1/2: vét thực thể chunk ${i + 1}/${chunks.length}...`);
                const seeds = await extractVertexSeedEntities(chunks[i], typesList, nerModel, onProgress);
                onProgress?.(`⚡ Vertex pass 2/2: chuẩn hóa ${seeds.length} thực thể...`);
                entities = await translateVertexSeedEntities(seeds, nerModel, onProgress);
            } else {
                const text = await requestNERText({
                    model: nerModel,
                    systemInstruction: `Bạn là bộ trích xuất thực thể cho app dịch truyện. CHỈ trả JSON hợp lệ theo schema đã yêu cầu. Không markdown, không prose, không giải thích, không bọc \`\`\`. Nếu không có thực thể phù hợp thì trả về []`,
                    prompt,
                    generationConfig: {
                        temperature: 0,
                        maxOutputTokens: 2048,
                        responseMimeType: "application/json",
                        responseSchema: NER_RESPONSE_SCHEMA,
                    }
                }, onProgress);

                lastChunkPreview = previewNERText(text);
                const jsonCandidate = extractNERArrayCandidate(text);

                if (!jsonCandidate) {
                    console.warn(`Chunk ${i + 1}: No JSON array found in response`);
                    lastChunkFailure = `Chunk ${i + 1} không trả JSON hợp lệ${lastChunkPreview ? ` | preview: ${lastChunkPreview}` : ""}`;
                    onProgress?.(`⚠️ Chunk ${i + 1}: AI không trả JSON hợp lệ, đang thử chunk khác...`);
                    continue;
                }

                const rawData = JSON.parse(jsonCandidate);
                const validationResult = safeParseNERResponse(rawData);

                if (!validationResult.success) {
                    console.error(`Chunk ${i + 1}: AI response validation failed:`, validationResult.error);
                    lastChunkFailure = `Chunk ${i + 1} trả format sai: ${validationResult.error}${lastChunkPreview ? ` | preview: ${lastChunkPreview}` : ""}`;
                    onProgress?.(`⚠️ Chunk ${i + 1}: AI trả về format sai, bỏ qua...`);
                    continue;
                }

                entities = validationResult.data as ExtractedEntity[];
            }

            successfulChunks++;
            console.log(`[AI NER] Chunk ${i + 1} raw entities:`, entities.map(e => `${e.chinese}→${e.original} (${e.type})`));

            // Filter by allowed types
            const filtered = entities.filter(e =>
                allowedTypes.includes(e.type as EntityType)
            );

            allResults.push(...filtered);

        } catch (error) {
            console.error(`Chunk ${i + 1} extraction failed:`, error);
            const baseError = error instanceof Error ? error.message : String(error);
            lastChunkFailure = `${baseError}${lastChunkPreview ? ` | preview: ${lastChunkPreview}` : ""}`;
            onProgress?.(`⚠️ Chunk ${i + 1}: ${lastChunkFailure}`);
            // Continue with other chunks
        }
    }

    if (successfulChunks === 0 && chunks.length > 0) {
        throw new Error(lastChunkFailure || `AI quét thuật ngữ thất bại với model ${nerModel}.`);
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

    const [existingTerms, blacklistTerms, heuristicTerms] = await Promise.all([
        db.dictionary.where("workspaceId").equals(workspaceId).toArray(),
        db.blacklist.where("workspaceId").equals(workspaceId).toArray(),
        db.heuristicTerms.where("workspaceId").equals(workspaceId).toArray()
    ]);

    const existingChinese = new Set(existingTerms.map(t => t.original));
    const blacklistedChinese = new Set(blacklistTerms.map(b => b.word));
    const approvedHeuristic = new Set(
        heuristicTerms.filter(h => h.isApproved).map(h => h.original)
    );

    const newEntities = deduplicated.filter(e => {
        const inDict = existingChinese.has(e.chinese);
        const inBlacklist = blacklistedChinese.has(e.chinese);
        const inHeuristic = approvedHeuristic.has(e.chinese);
        if (inDict || inBlacklist || inHeuristic) {
            console.log(`[AI NER] FILTERED OUT: ${e.chinese}→${e.original} (dict:${inDict}, bl:${inBlacklist}, heu:${inHeuristic})`);
        }
        return !inDict && !inBlacklist && !inHeuristic;
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
