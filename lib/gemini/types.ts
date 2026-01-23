// --- Core Types ---
export interface TranslationResult {
    translatedText: string;
    translatedTitle?: string;
    stats?: {
        terms: number;
        characters: number;
    };
}

export interface TranslationLog {
    timestamp: Date;
    message: string;
    type: 'info' | 'error' | 'success';
}

// --- Entity Analysis ---
export interface AnalyzedEntity {
    src: string;
    dest: string;
    category: 'character' | 'weapon' | 'item' | 'location' | 'organization' | 'ability' | 'plant' | 'beast' | 'phenomenon' | 'honorific' | 'phrase' | 'idiom' | 'other';
    contextLabel?: string;
    reason: string;
    metadata?: any;
}

// --- Quality Inspection ---
export interface InspectionIssue {
    original: string;
    suggestion: string;
    type: 'untranslated' | 'pronoun' | 'grammar' | 'spelling' | 'other';
    reason: string;
}

// --- Style DNA ---
export interface StyleDNA {
    tone: string;       // Giọng văn (Hào hùng, Bi thương, Hài hước...)
    setting: string;    // Bối cảnh (Tu tiên, Đô thị, Mạt thế...)
    pronouns: string;   // Cách xưng hô đặc trưng
    keywords: string[]; // Các từ khóa quan trọng để build prompt
    description: string; // Tóm tắt ngắn gọn để cho vào prompt
}

// --- Chunking ---
export interface ChunkOptions {
    maxCharsPerChunk: number;  // Default: 1500
    maxConcurrent: number;     // Default: 3 (parallel requests)
    enabled: boolean;
}
