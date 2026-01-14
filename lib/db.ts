import Dexie, { type EntityTable } from 'dexie';

export interface Workspace {
    id: string; // UUID
    title: string;
    author?: string;
    cover?: string; // Base64 or URL
    description?: string;
    genre?: string; // Added
    sourceLang?: string; // Added (e.g., 'zh')
    targetLang?: string; // Added (e.g., 'vi')
    createdAt: Date;
    updatedAt: Date;
}

export interface Chapter {
    id: number; // Auto-inc
    workspaceId: string;
    title: string;
    content_original: string; // zh
    content_translated?: string; // vi
    title_translated?: string; // Added: Separate translated title
    wordCountOriginal?: number; // Added
    wordCountTranslated?: number; // Added
    order: number;
    status: 'draft' | 'translated' | 'reviewing'; // Expanded status
}

export interface DictionaryEntry {
    id?: number;
    original: string;
    translated: string;
    type: 'name' | 'term' | 'phrase' | 'correction';
    gender?: 'male' | 'female' | 'unknown'; // Added for Characters
    role?: 'main' | 'support' | 'villain' | 'mob'; // Added for Characters
    description?: string; // Added for Characters
    createdAt: Date;
}

export interface Setting {
    key: string;
    value: any;
}

const db = new Dexie('AITranslatorDB') as Dexie & {
    workspaces: EntityTable<Workspace, 'id'>;
    chapters: EntityTable<Chapter, 'id'>;
    dictionary: EntityTable<DictionaryEntry, 'id'>;
    settings: EntityTable<Setting, 'key'>;
};

// Define Schema
db.version(1).stores({
    workspaces: 'id, title, updatedAt',
    chapters: '++id, workspaceId, order',
    dictionary: '++id, original, type', // Index for fast lookup
    settings: 'key'
});

// V2: Add 'translated' index for Reverse Lookup
db.version(2).stores({
    workspaces: 'id, title, updatedAt',
    chapters: '++id, workspaceId, order',
    dictionary: '++id, original, translated, type',
    settings: 'key'
});

// V3: Add Character fields
db.version(3).stores({
    dictionary: '++id, original, translated, type, gender, role' // Index for filtering
});

export { db };
