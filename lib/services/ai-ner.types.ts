export enum EntityType {
    Person = 'Person',
    Location = 'Location',
    Organization = 'Organization',
    Skill = 'Skill',
    Item = 'Item',
    Unknown = 'Unknown'
}

export interface ExtractedEntity {
    original: string;
    chinese: string;
    type: EntityType;
    context: string;
    confidence?: number;
}

export interface ExtractionOptions {
    allowedTypes?: EntityType[];
    onProgress?: (message: string) => void;
}

export interface NERRuntimeConfig {
    provider: 'gemini' | 'vertex';
    model: string;
}

export interface VertexSeedEntity {
    chinese: string;
    type: EntityType;
    context: string;
}

export interface GeminiResponse {
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
