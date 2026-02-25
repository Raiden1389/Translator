import Dexie, { type EntityTable } from 'dexie';
import { storage } from './storageBridge';
import { InspectionIssue } from './types';

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
    sourceUrl?: string; // Added: URL for crawling content on-demand
    stats?: {
        tokens?: {
            input: number;
            output: number;
            total: number;
            thinking?: number; // Gemini 2.5 Flash thinking tokens
            system?: number;  // System instruction overhead
            content?: number; // Actual story content
        };
        characters?: number;
    };
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
    thinkingTokens?: number; // Gemini 2.5 Flash thinking tokens (billed as output)
    totalCost: number; // Accumulated cost in USD
    updatedAt: Date;
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
    source?: 'manual' | 'ai' | 'heuristic';
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


export interface HeuristicTerm {
    id?: number;
    workspaceId: string;
    original: string;
    translated: string; // Auto-mapped Hán Việt
    type: 'skill' | 'character' | 'location' | 'title' | 'unknown';
    confidence: number; // 0-100
    pinyin: string;
    description?: string; // AI generated description/context
    snippets?: string[];  // JSON array of context sentences
    isApproved: boolean;
    isGarbage?: boolean; // Added: Skip these terms in future scans
    occurrences: number;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

export interface ConsistencyLog {
    id?: number;
    workspaceId: string;
    chapterId?: number;
    issueType: 'drift' | 'missing' | 'inconsistent_translation';
    details: string;
    timestamp: Date;
}

/**
 * UI Preferences (v2.7.0 - UI Polish)
 * Stores user preferences for UI features
 */
export interface UIPreference {
    key: string; // Primary key (e.g., 'commandPalette.lastCommand', 'reader.fontSize')
    value: unknown; // JSON-serializable value
    updatedAt: Date;
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
    heuristicTerms: EntityTable<HeuristicTerm, 'id'>;
    consistencyLogs: EntityTable<ConsistencyLog, 'id'>;
    uiPreferences: EntityTable<UIPreference, 'key'>; // v2.7.0 - UI Polish
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
    settings: 'key'
});

// ----------------------------------------------------------------------
// HEURISTIC ENGINE UPGRADE (v101-102)
// ----------------------------------------------------------------------
db.version(101).stores({
    heuristicTerms: '++id, workspaceId, original, type, isApproved, [workspaceId+original]',
    consistencyLogs: '++id, workspaceId, chapterId, issueType'
});

db.version(102).stores({
    heuristicTerms: '++id, workspaceId, original, type, isApproved, [workspaceId+original], [workspaceId+isApproved], [workspaceId+type]'
});

db.version(103).stores({
    heuristicTerms: '++id, workspaceId, original, type, isApproved, isGarbage, [workspaceId+original], [workspaceId+isApproved], [workspaceId+isGarbage]'
});

db.version(104).stores({
    blacklist: '++id, workspaceId, word, source, [workspaceId+source]'
});

// ----------------------------------------------------------------------
// UI POLISH (v105) - v2.7.0
// ----------------------------------------------------------------------
db.version(105).stores({
    uiPreferences: 'key' // Simple key-value store for UI preferences
});

// v106: Global Corrections (Luyện Văn) — uses workspaceId='__global__' sentinel
// No schema change needed, corrections table already has workspaceId index
db.version(106).stores({}).upgrade(async tx => {
    // Migrate all workspace-scoped corrections → __global__
    const corrections = await tx.table('corrections').toArray();
    const seen = new Set<string>();
    for (const c of corrections) {
        if (c.workspaceId === '__global__') {
            // Already global — track for dedup
            const key = `${c.type}|${c.from || c.original || c.pattern || ''}|${c.to || c.replacement || c.replace || ''}`;
            seen.add(key);
            continue;
        }
        const key = `${c.type}|${c.from || c.original || c.pattern || ''}|${c.to || c.replacement || c.replace || ''}`;
        if (seen.has(key)) {
            // Duplicate — delete the workspace-scoped one
            await tx.table('corrections').delete(c.id);
        } else {
            // Migrate to global
            await tx.table('corrections').update(c.id, { workspaceId: '__global__' });
            seen.add(key);
        }
    }
    console.log(`🔄 Migrated ${corrections.length} corrections to global pool (Luyện Văn)`);
});

export const GLOBAL_WORKSPACE_ID = '__global__';

// RAIDEN v2.0 - RELATIONSHIPS & HONORIFICS (v106)
// (Table 'relationships' removed in v2.7.2)
// ----------------------------------------------------------------------


// ----------------------------------------------------------------------
// DIRTY FLAG SYNC SYSTEM (High Performance Incremental)
// ----------------------------------------------------------------------
const dirtyWorkspaces = new Set<string>();
const dirtyChapters = new Set<string>(); // Format: "wsId:chapId"
const dirtyDictionaries = new Set<string>();

// Content cache to avoid redundant IO (Dictionary can be large)
const lastSavedDictContent = new Map<string, string>();



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

// ⚠️ AUTO-SYNC WORKER REMOVED
// Manual save will be triggered by user action (footer button)
// Dirty flags are kept for tracking unsaved changes

// Manual Save Function (called by UI)
export const manualSaveAllWorkspaces = async (): Promise<{ saved: number; errors: string[] }> => {
    const errors: string[] = [];
    let saved = 0;

    try {
        // 1. Save all dirty workspaces metadata
        if (dirtyWorkspaces.size > 0) {
            const ids = Array.from(dirtyWorkspaces);
            for (const id of ids) {
                try {
                    const ws = await db.workspaces.get(id);
                    if (ws) {
                        await storage.saveMetadata(id, ws);
                        dirtyWorkspaces.delete(id);
                        saved++;
                    }
                } catch (e) {
                    errors.push(`Workspace ${id}: ${e}`);
                }
            }
        }

        // 2. Save all dirty dictionaries
        if (dirtyDictionaries.size > 0) {
            const ids = Array.from(dirtyDictionaries);
            for (const id of ids) {
                try {
                    const ws = await db.workspaces.get(id);
                    if (!ws) continue;

                    const dict = await db.dictionary.where('workspaceId').equals(id).toArray();
                    const contentStr = JSON.stringify(dict);

                    if (lastSavedDictContent.get(id) !== contentStr) {
                        await storage.saveDictionary(id, ws.title, dict);
                        lastSavedDictContent.set(id, contentStr);
                        dirtyDictionaries.delete(id);
                        saved++;
                    }
                } catch (e) {
                    errors.push(`Dictionary ${id}: ${e}`);
                }
            }
        }

        // 3. Save all dirty chapters
        if (dirtyChapters.size > 0) {
            const compoundIds = Array.from(dirtyChapters);
            for (const cid of compoundIds) {
                try {
                    const [wsId, chapIdStr] = cid.split(':');
                    const ws = await db.workspaces.get(wsId);
                    if (!ws) continue;

                    const chapId = parseInt(chapIdStr);
                    const chap = await db.chapters.get(chapId);
                    if (chap) {
                        await storage.saveChapter(wsId, ws.title, chapId, chap);
                        dirtyChapters.delete(cid);
                        saved++;
                    }
                } catch (e) {
                    errors.push(`Chapter ${cid}: ${e}`);
                }
            }
        }

        return { saved, errors };
    } catch (e) {
        errors.push(`Global error: ${e}`);
        return { saved, errors };
    }
};

// Hooks: Track dirty state (no auto-save)
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
    if (typeof window === 'undefined' || !(window as { __TAURI__?: unknown }).__TAURI__) {
        return;
    }

    try {
        // Auto-Migration for AI Model (Fix v1beta not found for experimental models)
        const aiModelSetting = await db.settings.get("aiModel");
        if (aiModelSetting && aiModelSetting.value === "gemini-2.0-flash-exp") {
            await db.settings.put({ key: "aiModel", value: "gemini-2.0-flash" });
            console.log("🔄 Auto-migrated AI Model from experimental to stable gemini-2.0-flash.");
        }

        const count = await db.workspaces.count();
        if (count > 0) {
            return;
        }

        const workspaceIds = await storage.listWorkspaces();
        if (workspaceIds.length === 0) {
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
        console.log("🏁 Rehydration complete.");
    }
};

// ----------------------------------------------------------------------
// UI PREFERENCES HELPERS (v2.7.0 - UI Polish)
// ----------------------------------------------------------------------

import { featureFlags } from './featureFlags';

/**
 * Get UI preference by key
 * Returns null if feature flag is OFF (safe for rollback)
 */
export async function getUIPreference<T = unknown>(key: string): Promise<T | null> {
    if (!featureFlags.uiPreferences) {
        return null; // Feature disabled - don't touch DB
    }

    try {
        const pref = await db.uiPreferences.get(key);
        return pref ? (pref.value as T) : null;
    } catch (error) {
        console.error(`Failed to get UI preference "${key}":`, error);
        return null;
    }
}

/**
 * Set UI preference
 * No-op if feature flag is OFF (safe for rollback)
 */
export async function setUIPreference(key: string, value: unknown): Promise<void> {
    if (!featureFlags.uiPreferences) {
        return; // Feature disabled - don't touch DB
    }

    try {
        await db.uiPreferences.put({
            key,
            value,
            updatedAt: new Date()
        });
    } catch (error) {
        console.error(`Failed to set UI preference "${key}":`, error);
    }
}

/**
 * Delete UI preference
 * No-op if feature flag is OFF (safe for rollback)
 */
export async function deleteUIPreference(key: string): Promise<void> {
    if (!featureFlags.uiPreferences) {
        return; // Feature disabled - don't touch DB
    }

    try {
        await db.uiPreferences.delete(key);
    } catch (error) {
        console.error(`Failed to delete UI preference "${key}":`, error);
    }
}

/**
 * Get all UI preferences
 * Returns empty array if feature flag is OFF (safe for rollback)
 */
export async function getAllUIPreferences(): Promise<UIPreference[]> {
    if (!featureFlags.uiPreferences) {
        return []; // Feature disabled - don't touch DB
    }

    try {
        return await db.uiPreferences.toArray();
    } catch (error) {
        console.error('Failed to get all UI preferences:', error);
        return [];
    }
}

/**
 * Clear all UI preferences
 * No-op if feature flag is OFF (safe for rollback)
 */
export async function clearAllUIPreferences(): Promise<void> {
    if (!featureFlags.uiPreferences) {
        return; // Feature disabled - don't touch DB
    }

    try {
        await db.uiPreferences.clear();
        console.log('✅ All UI preferences cleared');
    } catch (error) {
        console.error('Failed to clear UI preferences:', error);
    }
}

export { db };

