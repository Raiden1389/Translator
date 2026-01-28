export enum TermType {
    Person = 'Person',
    Location = 'Location',
    Organization = 'Organization',
    Skill = 'Skill',
    Unknown = 'Unknown',
    Junk = 'Junk'
}

export interface TermCandidate {
    id: string;      // Unique identifier (e.g., composite)
    original: string; // The Vietnamese name
    chinese?: string; // The original Chinese characters
    context: string;
    count: number;
    type?: TermType;
    confidence?: number;
    metadata?: {
        description?: string;
        role?: string;
        gender?: string;
        [key: string]: any;
    };
}

/**
 * Specialized candidate for Chinese engine where chinese property is mandatory
 */
export interface ChineseTermCandidate extends TermCandidate {
    chinese: string;
}

export interface ExtractionConfig {
    ignoreSentenceStarts?: boolean;
    minFrequency?: number;
}
