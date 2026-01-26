export enum TermType {
    Person = 'Person',
    Location = 'Location',
    Organization = 'Organization',
    Skill = 'Skill',
    Unknown = 'Unknown',
    Junk = 'Junk'
}

export interface TermCandidate {
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

export interface ExtractionConfig {
    ignoreSentenceStarts?: boolean;
    minFrequency?: number;
}
