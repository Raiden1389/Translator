import Dexie, { type EntityTable } from 'dexie';
import { storage } from './storageBridge';

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
    inspectionResults?: any; // JSON array of issues
    lastTranslatedAt?: Date;
    translationModel?: string; // e.g. "gemini-1.5-pro"
    translationDurationMs?: number; // e.g. 5000
}

export interface DictionaryEntry {
    id?: number;
    original: string;
    translated: string;
    type: 'name' | 'term' | 'phrase' | 'correction' | string; // Expanded to support AI categories
    gender?: 'male' | 'female' | 'unknown';
    role?: 'main' | 'support' | 'villain' | 'mob';
    description?: string;
    metadata?: any; // Added for rich data (relations, n-grams, etc.)
    createdAt: Date;
}

export interface Setting {
    key: string;
    value: any;
}

export interface TTSCacheEntry {
    id?: number;
    chapterId: number;
    voice: string;
    textHash: string;
    blob: ArrayBuffer; // Store raw bytes
    createdAt: Date;
}

const db = new Dexie('AITranslatorDB') as Dexie & {
    workspaces: EntityTable<Workspace, 'id'>;
    chapters: EntityTable<Chapter, 'id'>;
    dictionary: EntityTable<DictionaryEntry, 'id'>;
    settings: EntityTable<Setting, 'key'>;
    blacklist: EntityTable<BlacklistEntry, 'id'>;
    corrections: EntityTable<CorrectionEntry, 'id'>;
    prompts: EntityTable<PromptEntry, 'id'>;
    ttsCache: EntityTable<TTSCacheEntry, 'id'>; // Added
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

// V4: Add Blacklist
db.version(4).stores({
    blacklist: '++id, word'
});

// V5: Add translated to Blacklist
db.version(5).stores({
    blacklist: '++id, word, translated'
});

// V6: Add Corrections
db.version(6).stores({
    corrections: '++id, original'
});

// V7: Add Prompts
db.version(7).stores({
    prompts: '++id, title'
});

// V8: Add TTS Cache
db.version(8).stores({
    ttsCache: '++id, chapterId, voice'
});

// V9: Correct TTS Cache (Include textHash to avoid segment collisions)
db.version(9).stores({
    ttsCache: '++id, chapterId, voice, textHash'
});

// Tauri Hook: Sync to local files on change
if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    const syncWorkspace = async (workspaceId: string) => {
        const workspace = await db.workspaces.get(workspaceId);
        if (!workspace) return;

        const chapters = await db.chapters.where('workspaceId').equals(workspaceId).toArray();
        const dictionary = await db.dictionary.toArray(); // Global for now

        // Note: Prompts are global, not synced per workspace yet, but could be added if needed.

        await storage.saveWorkspace(workspaceId, {
            workspace,
            chapters,
            dictionary
        });
    };

    db.workspaces.hook('updating', (mods, prim, obj) => {
        setTimeout(() => syncWorkspace(obj.id), 100);
    });

    db.chapters.hook('creating', (prim, obj) => {
        setTimeout(() => syncWorkspace(obj.workspaceId), 100);
    });

    db.chapters.hook('updating', (mods, prim, obj) => {
        setTimeout(() => syncWorkspace(obj.workspaceId), 100);
    });

    db.chapters.hook('deleting', (prim, obj) => {
        setTimeout(() => syncWorkspace(obj.workspaceId), 100);
    });
}

export interface BlacklistEntry {
    id?: number;
    word: string;
    translated?: string;
    source?: 'manual' | 'ai';
    createdAt: Date;
}

export interface CorrectionEntry {
    id?: number;
    original: string; // The wrong phrase (e.g., "Thiên Linh Kiếm")
    replacement: string; // The correct phrase (e.g., "Thiên Minh Kiếm")
    createdAt: Date;
}

export interface PromptEntry {
    id?: number;
    title: string;
    content: string;
    createdAt: Date;
}

export { db };
