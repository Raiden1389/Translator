import Dexie, { type EntityTable } from 'dexie';
import { storage } from './storageBridge';

export interface Workspace {
    id: string; // UUID
    title: string;
    author?: string;
    cover?: string; // Base64 or URL
    description?: string;
    isAiDescription?: boolean; // Added: Track if description is AI-generated
    genre?: string; // Added
    sourceLang?: string; // Added (e.g., 'zh')
    targetLang?: string; // Added (e.g., 'vi')
    lastReadChapterId?: number; // Added: Track last read chapter
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
    glossaryExtractedAt?: Date; // Added: Track when glossary was extracted
    translationModel?: string; // e.g. "gemini-1.5-pro"
    translationDurationMs?: number; // e.g. 5000
    updatedAt?: Date;
}

export interface DictionaryEntry {
    id?: number;
    workspaceId: string; // Added for isolation
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
    pitch: string;
    rate: string;
    blob: ArrayBuffer; // Store raw bytes
    createdAt: Date;
}

export interface APIUsageEntry {
    model: string; // The model ID
    inputTokens: number;
    outputTokens: number;
    totalCost: number; // Accumulated cost in USD
    updatedAt: Date;
}

import { TranslationResult } from './gemini/types';

const db = new Dexie('AITranslatorDB') as Dexie & {
    workspaces: EntityTable<Workspace, 'id'>;
    chapters: EntityTable<Chapter, 'id'>;
    dictionary: EntityTable<DictionaryEntry, 'id'>;
    settings: EntityTable<Setting, 'key'>;
    blacklist: EntityTable<BlacklistEntry, 'id'>;
    corrections: EntityTable<CorrectionEntry, 'id'>;
    prompts: EntityTable<PromptEntry, 'id'>;
    ttsCache: EntityTable<TTSCacheEntry, 'id'>;
    apiUsage: EntityTable<APIUsageEntry, 'model'>;
    history: EntityTable<HistoryEntry, 'id'>;
    translationCache: EntityTable<TranslationCacheEntry, 'key'>; // New Cache Table
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

// V10: Add pitch and rate to TTS Cache
db.version(10).stores({
    ttsCache: '++id, chapterId, voice, textHash, pitch, rate'
});

// V11: Workspace Isolation for Dictionary, Blacklist and Corrections
db.version(11).stores({
    dictionary: '++id, workspaceId, original, translated, type, gender, role',
    blacklist: '++id, workspaceId, word, translated',
    corrections: '++id, workspaceId, original'
}).upgrade(async (trans) => {
    // Migration: Assign existing global data to the first workspace (usually "Dạ Vô Cương")
    const workspaces = await trans.table('workspaces').toArray();
    if (workspaces.length > 0) {
        // Heuristic: Try to find "Dạ Vô Cương" or just take the most recent one
        const targetWs = workspaces.find(w => w.title.includes("Dạ Vô Cương")) || workspaces[0];
        const wsId = targetWs.id;

        await trans.table('dictionary').toCollection().modify({ workspaceId: wsId });
        await trans.table('blacklist').toCollection().modify({ workspaceId: wsId });
        await trans.table('corrections').toCollection().modify({ workspaceId: wsId });
    }
});

// V12: Add glossaryExtractedAt for tracking extraction status
db.version(12).stores({
    chapters: '++id, workspaceId, order' // update schema if necessary, though no index change needed for this field
});

// V13: Compound index for TTS Cache optimization
db.version(13).stores({
    ttsCache: '++id, chapterId, voice, textHash, pitch, rate, [chapterId+voice+textHash+pitch+rate]'
});

// V14: Add Token Usage tracking
db.version(14).stores({
    apiUsage: 'model' // Model is the primary key
});

// V15: Auto-Summary support
db.version(15).stores({}); // No new indexes, just a schema iteration

// V16: Compound index for chapters and dictionary optimization
db.version(16).stores({
    chapters: '++id, workspaceId, order, [workspaceId+order]',
    dictionary: '++id, workspaceId, original, translated, type, gender, role, [workspaceId+original]'
});

// V17: Compound index for character filtering isolation
db.version(17).stores({
    dictionary: '++id, workspaceId, original, translated, type, gender, role, [workspaceId+original], [workspaceId+type]'
});

// V18: Optimize sorting by updatedAt
db.version(18).stores({
    workspaces: 'id, title, updatedAt',
    chapters: '++id, workspaceId, order, updatedAt, [workspaceId+order]'
});

// V19: Add History table for Persistent Undo
db.version(19).stores({
    history: '++id, workspaceId, timestamp',
    translationCache: 'key' // PRIMARY KEY: hash key
});

export interface TranslationCacheEntry {
    key: string; // Hash(chunk + model + instruction + glossary)
    result: TranslationResult;
    timestamp: Date;
    model: string;
}

export interface HistoryEntry {
    id?: number;
    workspaceId: string;
    actionType: 'batch_correction' | 'other';
    summary: string;
    timestamp: Date;
    affectedCount: number;
    snapshot: {
        chapterId: number;
        before: { title: string; content: string };
        after?: { title: string; content: string }; // Optional, for Redo if needed
    }[];
}

// Tauri Hook: Sync to local files on change
if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    const syncTimers: Record<string, any> = {};

    const syncWorkspace = async (workspaceId: string) => {
        // Clear any existing timer for this workspace
        if (syncTimers[workspaceId]) {
            clearTimeout(syncTimers[workspaceId]);
        }

        // Debounce: Wait 2 seconds of inactivity before writing to disk
        syncTimers[workspaceId] = setTimeout(async () => {
            try {
                const workspace = await db.workspaces.get(workspaceId);
                if (!workspace) return;

                const chapters = await db.chapters.where('workspaceId').equals(workspaceId).toArray();
                const dictionary = await db.dictionary.where('workspaceId').equals(workspaceId).toArray();

                await storage.saveWorkspace(workspaceId, {
                    workspace,
                    chapters,
                    dictionary
                });

                delete syncTimers[workspaceId];
            } catch (err) {
                console.error("Sync error:", err);
            }
        }, 2000);
    };

    db.workspaces.hook('updating', (mods, prim, obj) => {
        syncWorkspace(obj.id);
    });

    db.chapters.hook('creating', (prim, obj) => {
        syncWorkspace(obj.workspaceId);
    });

    db.chapters.hook('updating', (mods, prim, obj) => {
        syncWorkspace(obj.workspaceId);
    });

    db.chapters.hook('deleting', (prim, obj) => {
        syncWorkspace(obj.workspaceId);
    });

    db.dictionary.hook('creating', (prim, obj) => {
        syncWorkspace(obj.workspaceId);
    });

    db.dictionary.hook('updating', (mods, prim, obj) => {
        syncWorkspace(obj.workspaceId);
    });

    db.dictionary.hook('deleting', (prim, obj) => {
        syncWorkspace(obj.workspaceId);
    });
}

export interface BlacklistEntry {
    id?: number;
    workspaceId: string; // Added for isolation
    word: string;
    translated?: string;
    source?: 'manual' | 'ai';
    createdAt: Date;
}

export interface CorrectionEntry {
    id?: number;
    workspaceId: string; // Added for isolation
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


export const rehydrateFromStorage = async () => {
    if (typeof window === 'undefined' || !(window as any).__TAURI__) return;

    try {
        const count = await db.workspaces.count();
        if (count > 0) return; // Already has data

        const workspaceIds = await storage.listWorkspaces();
        if (workspaceIds.length === 0) return;

        for (const id of workspaceIds) {
            const data = await storage.loadWorkspace(id);
            if (!data) continue;

            if (data.workspace) await db.workspaces.put(data.workspace);
            if (data.chapters && data.chapters.length > 0) await db.chapters.bulkPut(data.chapters);
            if (data.dictionary && data.dictionary.length > 0) await db.dictionary.bulkPut(data.dictionary);
        }
    } catch (e) {
        // Silent fail or minimal error reporting
    }
};

/**
 * Clear the entire translation cache (Manual Trigger)
 */
export const clearTranslationCache = async () => {
    await db.translationCache.clear();
};

/**
 * Cleanup old/large cache (Auto Trigger)
 * - Removes items older than 30 days
 * - Keeps max 5000 items
 */
export const cleanupCache = async () => {
    try {
        const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
        const MAX_ITEMS = 5000;
        const now = Date.now();

        // 1. Get all keys and timestamps
        // Since we didn't index timestamp, we fetch all. 
        // For 5000 items this is fine. If it grows to 100k, we need an index.
        const allItems = await db.translationCache.toArray();

        // 2. Identify expired items
        const expiredKeys = allItems
            .filter(item => (now - item.timestamp.getTime()) > MAX_AGE_MS)
            .map(item => item.key);

        // 3. Size limit enforcement
        let excessKeys: string[] = [];
        if (allItems.length - expiredKeys.length > MAX_ITEMS) {
            // Sort by timestamp asc (oldest first)
            const sorted = allItems
                .filter(item => !expiredKeys.includes(item.key))
                .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

            const toRemoveCount = sorted.length - MAX_ITEMS;
            excessKeys = sorted.slice(0, toRemoveCount).map(item => item.key);
        }

        const keysToDelete = [...expiredKeys, ...excessKeys];

        if (keysToDelete.length > 0) {
            await db.translationCache.bulkDelete(keysToDelete);
            console.log(`🧹 [Cache Cleanup] Removed ${keysToDelete.length} items.`);
        }
    } catch (error) {
        console.error("Cache cleanup failed:", error);
    }
}

export { db };
