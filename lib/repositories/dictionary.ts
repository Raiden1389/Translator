import { db, DictionaryEntry } from "../db"
import { Dexie } from "dexie"

/**
 * Repository for Dictionary-related operations
 * Optimized for performance and workspace isolation
 */
export const dictionaryRepo = {
    /**
     * Get dictionary entries for a specific workspace, ordered by newest first
     */
    async getByWorkspace(workspaceId?: string): Promise<DictionaryEntry[]> {
        if (!workspaceId) {
            return db.dictionary.reverse().toArray()
        }

        // Optimized: Uses compound index [workspaceId+createdAt]
        return db.dictionary
            .where('[workspaceId+createdAt]')
            .between(
                [workspaceId, Dexie.minKey],
                [workspaceId, Dexie.maxKey]
            )
            .reverse()
            .toArray()
    },

    /**
     * Search for an existing entry by original text within a workspace
     */
    async findByOriginal(workspaceId: string, original: string): Promise<DictionaryEntry | undefined> {
        // Optimized: Uses compound index [workspaceId+original]
        return db.dictionary
            .where('[workspaceId+original]')
            .equals([workspaceId, original.trim()])
            .first()
    },

    /**
     * Upsert a dictionary entry (update if exists, otherwise add)
     */
    async upsert(workspaceId: string, original: string, translated: string, type: string = 'term'): Promise<void> {
        const normOriginal = original.trim()
        const normTranslated = translated.trim()

        if (!normOriginal || !normTranslated) return

        const existing = await this.findByOriginal(workspaceId, normOriginal)

        if (existing) {
            await db.dictionary.update(existing.id!, {
                translated: normTranslated,
                createdAt: new Date()
            })
        } else {
            await db.dictionary.add({
                workspaceId,
                original: normOriginal,
                translated: normTranslated,
                type,
                createdAt: new Date()
            })
        }
    },

    /**
     * Delete a dictionary entry
     */
    async delete(id: number): Promise<void> {
        await db.dictionary.delete(id)
    },

    /**
     * Bulk add entries (useful for scanners)
     */
    async bulkAdd(entries: Omit<DictionaryEntry, 'id'>[]): Promise<void> {
        const normalized = entries.map(e => ({
            ...e,
            original: e.original.trim(),
            translated: e.translated.trim()
        })).filter(e => e.original && e.translated)

        await db.dictionary.bulkAdd(normalized)
    }
}
