import { EntityType, VertexSeedEntity } from './ai-ner.types';

export function previewNERText(rawText: string): string {
    return rawText
        .replace(/\s+/g, ' ')
        .replace(/```json|```/gi, '')
        .trim()
        .slice(0, 180);
}

export function normalizeNERJsonText(rawText: string): string {
    const cleaned = rawText.replace(/```json|```/gi, '').trim();
    if (!cleaned) return cleaned;
    if (cleaned.startsWith('[')) return cleaned;

    if (cleaned.startsWith('{')) {
        return `[${cleaned
            .replace(/}\s*,\s*{/g, '},{')
            .replace(/}\s*\n+\s*{/g, '},{')}]`;
    }

    return cleaned;
}

export function extractNERArrayCandidate(rawText: string): string | null {
    const normalized = normalizeNERJsonText(rawText);
    if (!normalized) return null;

    const arrayStart = normalized.indexOf('[');
    const lastBracket = normalized.lastIndexOf(']');
    const lastBrace = normalized.lastIndexOf('}');

    if (arrayStart !== -1) {
        if (lastBracket > arrayStart) return normalized.slice(arrayStart, lastBracket + 1);
        if (lastBrace > arrayStart) return `${normalized.slice(arrayStart, lastBrace + 1)}]`;
    }

    if (normalized.startsWith('{') && lastBrace !== -1) {
        return `[${normalized.slice(0, lastBrace + 1)}]`;
    }

    return null;
}

export function normalizeEntityType(value: unknown): EntityType | null {
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

export function parseVertexSeedEntities(rawData: unknown): VertexSeedEntity[] {
    if (!Array.isArray(rawData)) return [];

    return rawData
        .map((item) => {
            if (!item || typeof item !== "object") return null;
            const record = item as Record<string, unknown>;
            const chinese = typeof record.chinese === "string" ? record.chinese.trim() : "";
            const type = normalizeEntityType(record.type);
            const context = typeof record.context === "string" ? record.context.trim() : "";

            if (!chinese || !type) return null;
            return { chinese, type, context } satisfies VertexSeedEntity;
        })
        .filter((item): item is VertexSeedEntity => item !== null);
}
