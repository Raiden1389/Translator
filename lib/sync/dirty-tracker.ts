/**
 * Dirty Flag Sync System (High Performance Incremental)
 *
 * Tracks which workspaces, chapters, and dictionaries have unsaved changes.
 * Manual save is triggered by user action (StatusBar button).
 */

import { db } from '../db';
import { storage } from '../storageBridge';

// ----------------------------------------------------------------------
// DIRTY FLAG TRACKING
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

// ----------------------------------------------------------------------
// MANUAL SAVE (called by UI — StatusBar button)
// ----------------------------------------------------------------------
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

// ----------------------------------------------------------------------
// DB HOOKS: Track dirty state (no auto-save)
// ----------------------------------------------------------------------
export function registerDirtyHooks() {
    db.workspaces.hook('creating', (_prim, obj) => markWorkspaceDirty(obj.id));
    db.workspaces.hook('updating', (_mods, _prim, obj) => markWorkspaceDirty(obj.id));
    db.workspaces.hook('deleting', (_prim, obj) => markWorkspaceDirty(obj.id));

    db.chapters.hook('creating', (_prim, obj) => markChapterDirty(obj.workspaceId, obj.id!));
    db.chapters.hook('updating', (_mods, _prim, obj) => markChapterDirty(obj.workspaceId, obj.id!));
    db.chapters.hook('deleting', (_prim, obj) => markChapterDirty(obj.workspaceId, obj.id!));

    db.dictionary.hook('creating', (_prim, obj) => markDictionaryDirty(obj.workspaceId));
    db.dictionary.hook('updating', (_mods, _prim, obj) => markDictionaryDirty(obj.workspaceId));
    db.dictionary.hook('deleting', (_prim, obj) => markDictionaryDirty(obj.workspaceId));
}

// ----------------------------------------------------------------------
// REHYDRATION: Load data from disk to IndexedDB (Tauri only)
// ----------------------------------------------------------------------
export const rehydrateFromStorage = async () => {
    if (typeof window === 'undefined' || !(window as { __TAURI__?: unknown }).__TAURI__) {
        return;
    }

    try {
        // Auto-Migration for AI Model
        const aiModelSetting = await db.settings.get("aiModel");
        if (aiModelSetting && aiModelSetting.value === "gemini-2.0-flash-exp") {
            await db.settings.put({ key: "aiModel", value: "gemini-2.0-flash" });
            console.log("🔄 Auto-migrated AI Model from experimental to stable gemini-2.0-flash.");
        }

        const count = await db.workspaces.count();
        if (count > 0) return;

        const workspaceIds = await storage.listWorkspaces();
        if (workspaceIds.length === 0) return;

        for (const id of workspaceIds) {
            const data = await storage.loadWorkspaceData(id);
            if (!data) continue;

            if (data.workspace) await db.workspaces.put(data.workspace);
            if (data.chapters && data.chapters.length > 0) await db.chapters.bulkPut(data.chapters);
            if (data.dictionary && data.dictionary.length > 0) {
                await db.dictionary.bulkPut(data.dictionary);
                lastSavedDictContent.set(id, JSON.stringify(data.dictionary));
            }
        }
    } catch (e) {
        console.error("Rehydration failed:", e);
    } finally {
        console.log("🏁 Rehydration complete.");
    }
};

// Auto-register hooks on import
registerDirtyHooks();
