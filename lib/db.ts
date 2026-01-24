import Dexie, { type EntityTable } from 'dexie';
import { storage } from './storageBridge';
import { InspectionIssue } from './types';
import { TranslationResult } from './gemini/types';

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
    inspectionResults?: InspectionIssue[]; // CORRECTED TYPE
    lastTranslatedAt?: Date;
    glossaryExtractedAt?: Date; // Added: Track when glossary was extracted
    translationModel?: string; // e.g. "gemini-1.5-pro"
    translationDurationMs?: number; // e.g. 5000
    updatedAt?: Date;
}

export interface DictionaryEntry {
    id?: number;
    workspaceId: string;
    original: string;
    translated: string;
    type: 'name' | 'character' | 'term' | 'phrase' | 'correction' | string;
    gender?: 'male' | 'female' | 'unknown';
    role?: 'main' | 'support' | 'villain' | 'mob' | string;
    description?: string;
    metadata?: {
        reason?: string;
        gender?: string;
        category?: string;
        [key: string]: unknown;
    };
    createdAt: Date;
}

export interface Setting {
    key: string;
    value: unknown; // Fixed any
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
    workspaceId: string;
    type: 'replace' | 'wrap' | 'regex';

    // Type: replace
    from?: string; // previously original
    to?: string;   // previously replacement

    // Type: wrap
    target?: string;
    open?: string;
    close?: string;

    // Type: regex
    pattern?: string;
    replace?: string;

    // Legacy fields (kept for migration or reference)
    original?: string;
    replacement?: string;

    createdAt: Date;
}

export interface PromptEntry {
    id?: number;
    title: string;
    content: string;
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
    ttsCache: EntityTable<TTSCacheEntry, 'id'>;
    apiUsage: EntityTable<APIUsageEntry, 'model'>;
    history: EntityTable<HistoryEntry, 'id'>;
    translationCache: EntityTable<TranslationCacheEntry, 'key'>; // New Cache Table
};

// ----------------------------------------------------------------------
// SCHEMA CONSOLIDATION (v100)
// ----------------------------------------------------------------------
db.version(100).stores({
    workspaces: 'id, title, updatedAt',
    chapters: '++id, workspaceId, order, updatedAt, [workspaceId+order]',
    dictionary: '++id, workspaceId, original, type, gender, role, [workspaceId+original], [workspaceId+type], [workspaceId+createdAt]', // Bỏ index 'translated' để tối ưu tốc độ ghi
    blacklist: '++id, workspaceId, word, translated',
    corrections: '++id, workspaceId, type',
    prompts: '++id, title',
    ttsCache: '++id, chapterId, voice, textHash, pitch, rate, [chapterId+voice+textHash+pitch+rate]',
    apiUsage: 'model',
    history: '++id, workspaceId, timestamp',
    translationCache: 'key, timestamp', // Thêm index timestamp để dọn dẹp thần tốc
    settings: 'key'
}).upgrade(async (trans) => {
    // Legacy Migration to V100: Consolidating history
    const workspaces = await trans.table('workspaces').toArray();
    if (workspaces.length > 0) {
        // 1. From V11: Ensure isolation for Dictionary, Blacklist, and Corrections
        const firstWsId = workspaces[0].id;

        await trans.table('dictionary').toCollection().modify((item: any) => {
            if (!item.workspaceId) item.workspaceId = firstWsId;
        });
        await trans.table('blacklist').toCollection().modify((item: any) => {
            if (!item.workspaceId) item.workspaceId = firstWsId;
        });
        await trans.table('corrections').toCollection().modify((item: any) => {
            if (!item.workspaceId) item.workspaceId = firstWsId;
        });

        // 2. From V20: Refactor Corrections to be Type-Aware
        await trans.table('corrections').toCollection().modify((c: any) => {
            if (!c.type) {
                c.type = 'replace';
                c.from = c.original;
                c.to = c.replacement;
            }
        });
    }
    console.log("🚀 Database migrated to Stable V100 architecture with legacy support.");
});

// ----------------------------------------------------------------------
// DIRTY FLAG SYNC SYSTEM (High Performance Incremental)
// ----------------------------------------------------------------------
const dirtyWorkspaces = new Set<string>();
const dirtyChapters = new Set<string>(); // Format: "wsId:chapId"
const dirtyDictionaries = new Set<string>();

// Content cache to avoid redundant IO (Dictionary can be large)
const lastSavedDictContent = new Map<string, string>();

let isRehydrated = false;

export const markWorkspaceDirty = (workspaceId: string) => {
    if (!workspaceId) return;
    dirtyWorkspaces.add(workspaceId);
};

export const markChapterDirty = (workspaceId: string, chapterId: number) => {
    if (!workspaceId || !chapterId) return;
    dirtyChapters.add(`${workspaceId}:${chapterId}`);
};

export const markDictionaryDirty = (workspaceId: string) => {
    if (!workspaceId) return;
    dirtyDictionaries.add(workspaceId);
};

// Sync Worker: Process granular dirty flags every 5 seconds
if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    setInterval(async () => {
        // RACE CONDITION GUARD: Don't start syncing until rehydration is complete
        if (!isRehydrated) return;

        // 1. Process Metadata
        if (dirtyWorkspaces.size > 0) {
            const ids = Array.from(dirtyWorkspaces);
            dirtyWorkspaces.clear();
            for (const id of ids) {
                const ws = await db.workspaces.get(id);
                if (ws) await storage.saveMetadata(id, ws);
            }
        }

        // 2. Process Dictionary (with Content Check)
        if (dirtyDictionaries.size > 0) {
            const ids = Array.from(dirtyDictionaries);
            dirtyDictionaries.clear();
            for (const id of ids) {
                const dict = await db.dictionary.where('workspaceId').equals(id).toArray();
                const contentStr = JSON.stringify(dict);

                // Only save if content actually changed
                if (lastSavedDictContent.get(id) !== contentStr) {
                    await storage.saveDictionary(id, dict);
                    lastSavedDictContent.set(id, contentStr);
                    console.log(`💾 [Sync Worker] Dictionary for ${id} saved (content changed).`);
                }
            }
        }

        // 3. Process Chapters (Coalesced via Set already)
        if (dirtyChapters.size > 0) {
            const compoundIds = Array.from(dirtyChapters);
            dirtyChapters.clear();
            for (const cid of compoundIds) {
                const [wsId, chapIdStr] = cid.split(':');
                const chapId = parseInt(chapIdStr);
                const chap = await db.chapters.get(chapId);
                if (chap) await storage.saveChapter(wsId, chapId, chap);
            }
        }
    }, 5000);
}

// Hooks: Targeting specific components
db.workspaces.hook('creating', (_prim, obj) => markWorkspaceDirty(obj.id));
db.workspaces.hook('updating', (_mods, _prim, obj) => markWorkspaceDirty(obj.id));
db.workspaces.hook('deleting', (_prim, obj) => markWorkspaceDirty(obj.id));

db.chapters.hook('creating', (_prim, obj) => markChapterDirty(obj.workspaceId, obj.id!));
db.chapters.hook('updating', (_mods, _prim, obj) => markChapterDirty(obj.workspaceId, obj.id!));
db.chapters.hook('deleting', (_prim, obj) => markChapterDirty(obj.workspaceId, obj.id!));

db.dictionary.hook('creating', (_prim, obj) => markDictionaryDirty(obj.workspaceId));
db.dictionary.hook('updating', (_mods, _prim, obj) => markDictionaryDirty(obj.workspaceId));
db.dictionary.hook('deleting', (_prim, obj) => markDictionaryDirty(obj.workspaceId));

export const rehydrateFromStorage = async () => {
    if (typeof window === 'undefined' || !(window as any).__TAURI__) {
        isRehydrated = true;
        return;
    }

    try {
        const count = await db.workspaces.count();
        if (count > 0) {
            isRehydrated = true;
            return;
        }

        const workspaceIds = await storage.listWorkspaces();
        if (workspaceIds.length === 0) {
            isRehydrated = true;
            return;
        }

        for (const id of workspaceIds) {
            const data = await storage.loadWorkspaceData(id);
            if (!data) continue;

            if (data.workspace) await db.workspaces.put(data.workspace);
            if (data.chapters && data.chapters.length > 0) await db.chapters.bulkPut(data.chapters);
            if (data.dictionary && data.dictionary.length > 0) {
                await db.dictionary.bulkPut(data.dictionary);
                // Initialize cache for dictionary to avoid instant re-save
                lastSavedDictContent.set(id, JSON.stringify(data.dictionary));
            }
        }
    } catch (e) {
        console.error("Rehydration failed:", e);
    } finally {
        isRehydrated = true;
        console.log("🏁 Rehydration complete. Sync worker active.");
    }
};

/**
 * Clear the entire translation cache (Manual Trigger)
 */
export const clearTranslationCache = async () => {
    await db.translationCache.clear();
};

/**
 * Clear translation for a specific chapter
 */
export const clearChapterTranslation = async (chapterId: number) => {
    await db.chapters.update(chapterId, {
        content_translated: undefined,
        title_translated: undefined,
        status: 'draft',
        lastTranslatedAt: undefined,
        translationDurationMs: undefined,
        translationModel: undefined,
        inspectionResults: undefined,
        updatedAt: new Date()
    });
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
        const cutoff = new Date(now - MAX_AGE_MS);

        // 1. Fast delete older than 30 days using index
        const expiredCount = await db.translationCache
            .where('timestamp')
            .below(cutoff)
            .delete();

        if (expiredCount > 0) {
            console.log(`🧹 [Cache Cleanup] Deleted ${expiredCount} expired items via index.`);
        }

        // 2. Size limit enforcement (only if still over limit)
        const totalCount = await db.translationCache.count();
        if (totalCount > MAX_ITEMS) {
            const excessKeys = await db.translationCache
                .orderBy('timestamp')
                .limit(totalCount - MAX_ITEMS)
                .primaryKeys();

            await db.translationCache.bulkDelete(excessKeys);
            console.log(`🧹 [Cache Cleanup] Trimmed ${excessKeys.length} excess items.`);
        }
    } catch (error) {
        console.error("Cache cleanup failed:", error);
    }
}

export { db };
