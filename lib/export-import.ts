import { db, type Workspace, type Chapter, type DictionaryEntry, type CorrectionEntry } from "./db";
import { safeParseJSONImport } from "./schemas/json-import.schema";

// Export workspace data to JSON
export async function exportWorkspace(workspaceId: string): Promise<Blob> {
    try {
        // Fetch all related data
        const workspace = await db.workspaces.get(workspaceId);
        if (!workspace) {
            throw new Error("Workspace not found");
        }

        const chapters = await db.chapters.where('workspaceId').equals(workspaceId).toArray();
        const dictionary = await db.dictionary.toArray();
        const corrections = await db.corrections.toArray();

        // Create export object
        const exportData = {
            version: "1.0",
            exportDate: new Date().toISOString(),
            workspace,
            chapters,
            dictionary,
            corrections
        };

        // Convert to JSON blob
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });

        return blob;
    } catch (error) {
        throw error;
    }
}

// Import workspace data from JSON file
export async function importWorkspace(file: File): Promise<void> {
    try {
        const text = await file.text();
        const rawData = JSON.parse(text);

        // ✅ Add version if missing (backward compatibility)
        const { ensureBackupVersion, safeParseBackup } = await import('./schemas/backup.schema');
        const versionedData = ensureBackupVersion(rawData);

        // ✅ Validate with versioned schema
        const validationResult = safeParseBackup(versionedData);

        if (!validationResult.success) {
            throw new Error(`Backup file invalid: ${validationResult.error}`);
        }

        const data = validationResult.data;

        // Validate data structure (redundant but safe)
        if (!data.workspace || !data.chapters) {
            throw new Error("Invalid export file format");
        }

        // Check if workspace already exists
        const existingWorkspace = await db.workspaces.get(data.workspace.id);
        if (existingWorkspace) {
            const confirmed = confirm(
                `Workspace "${data.workspace.title}" already exists. Overwrite?`
            );
            if (!confirmed) return;
        }

        // Import workspace
        await db.workspaces.put(data.workspace);

        // Import chapters (bulk)
        if (data.chapters.length > 0) {
            await db.chapters.bulkPut(data.chapters);
        }

        // Import dictionary (merge, avoid duplicates)
        if (data.dictionary && data.dictionary.length > 0) {
            for (const entry of data.dictionary) {
                const existing = await db.dictionary
                    .where('original')
                    .equals(entry.original)
                    .first();

                if (!existing) {
                    await db.dictionary.add(entry);
                }
            }
        }

        // Import corrections (merge, avoid duplicates)
        if (data.corrections && data.corrections.length > 0) {
            for (const entry of data.corrections) {
                const existing = await db.corrections
                    .where('original')
                    .equals(entry.original)
                    .first();

                if (!existing) {
                    await db.corrections.add(entry);
                }
            }
        }

    } catch (error) {
        throw error;
    }
}

/**
 * Append new chapters from a Crawler JSON export into an existing workspace.
 * Only inserts chapters whose `order` doesn't already exist in DB.
 * Does NOT overwrite existing translations.
 * Returns { added, skipped } counts.
 */
export async function appendChaptersFromJSON(
    workspaceId: string,
    file: File
): Promise<{ added: number; skipped: number }> {
    const { chapters } = await parseCrawlerJsonFile(file);

    // Get existing orders in this workspace
    const existingChapters = await db.chapters
        .where('workspaceId').equals(workspaceId)
        .toArray();
    const existingOrders = new Set(existingChapters.map(c => c.order));

    const currentMax = existingChapters.length > 0
        ? Math.max(...existingChapters.map(c => c.order))
        : 0;

    let added = 0;
    let skipped = 0;
    const toAdd: Omit<Chapter, 'id'>[] = [];

    chapters.forEach((ch, index) => {
        const order = ch.order ?? (index + 1);
        if (existingOrders.has(order)) {
            skipped++;
            return;
        }

        const rawContent = ch.content || ch.content_original || '';
        const normalizedContent = rawContent
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/&lt;br\s*\/?&gt;/gi, '\n')
            .replace(/\\n/g, '\n');

        toAdd.push({
            workspaceId,
            title: ch.title,
            content_original: normalizedContent,
            content_translated: undefined,
            order,
            status: 'draft' as const,
            updatedAt: new Date(),
        });
        added++;
    });

    if (toAdd.length > 0) {
        await db.chapters.bulkAdd(toAdd as Chapter[]);
        // Update workspace.updatedAt
        await db.workspaces.update(workspaceId, { updatedAt: new Date() });
    }

    return { added, skipped };
}

/**
 * Update only chapters whose source title/content changed in a crawler JSON export.
 * If an updated chapter already has a translation, the stale translation is removed.
 * Returns counts for UI feedback.
 */
export async function updateChangedChaptersFromJSON(
    workspaceId: string,
    file: File
): Promise<{ updated: number; skipped: number; clearedTranslations: number }> {
    const { chapters } = await parseCrawlerJsonFile(file);

    const existingChapters = await db.chapters
        .where('workspaceId')
        .equals(workspaceId)
        .toArray();

    const existingByOrder = new Map(existingChapters.map(ch => [ch.order, ch]));

    let updated = 0;
    let skipped = 0;
    let clearedTranslations = 0;

    await db.transaction('rw', db.chapters, db.workspaces, async () => {
        for (const [index, ch] of chapters.entries()) {
            const order = ch.order ?? (index + 1);
            const existing = existingByOrder.get(order);

            if (!existing) {
                skipped++;
                continue;
            }

            const normalizedTitle = normalizeImportText(ch.title || '');
            const normalizedContent = normalizeImportText(ch.content || ch.content_original || '');
            const existingTitle = normalizeImportText(existing.title || '');
            const existingContent = normalizeImportText(existing.content_original || '');

            const titleChanged = normalizeComparableSource(normalizedTitle) !== normalizeComparableSource(existingTitle);
            const contentChanged = normalizeComparableSource(normalizedContent) !== normalizeComparableSource(existingContent);

            if (!titleChanged && !contentChanged) {
                skipped++;
                continue;
            }

            const hadTranslation = !!(existing.content_translated?.trim() || existing.title_translated?.trim());

            await db.chapters.update(existing.id!, {
                title: ch.title,
                content_original: normalizedContent,
                content_translated: undefined,
                title_translated: undefined,
                wordCountOriginal: normalizedContent.length,
                wordCountTranslated: undefined,
                status: 'draft',
                lastTranslatedAt: undefined,
                translationModel: undefined,
                translationDurationMs: undefined,
                inspectionResults: undefined,
                updatedAt: new Date(),
            });

            updated++;
            if (hadTranslation) {
                clearedTranslations++;
            }
        }

        if (updated > 0) {
            await db.workspaces.update(workspaceId, { updatedAt: new Date() });
        }
    });

    return { updated, skipped, clearedTranslations };
}

async function parseCrawlerJsonFile(file: File): Promise<{
    chapters: { title: string; content?: string; content_original?: string; order?: number }[];
}> {
    const text = await file.text();
    const rawData = JSON.parse(text);
    const parsed = safeParseJSONImport(rawData);

    if (!parsed.success) {
        throw new Error(parsed.error);
    }

    const chapters = parsed.data.chapters;
    if (chapters.length === 0) {
        throw new Error('File JSON không có chapters nào');
    }

    return { chapters };
}

function normalizeImportText(value: string): string {
    return value
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/&lt;br\s*\/?&gt;/gi, '\n')
        .replace(/\\n/g, '\n')
        .replace(/\r\n/g, '\n')
        .trim();
}

function decodeBasicEntities(value: string): string {
    return value
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#(\d+);/g, (_, code) => {
            const num = Number(code);
            return Number.isFinite(num) ? String.fromCharCode(num) : '';
        });
}

function normalizeComparableSource(value: string): string {
    return decodeBasicEntities(value)
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\u00a0/g, ' ')
        .replace(/[ \t]+/g, '')
        .replace(/\n+/g, '\n')
        .trim();
}


// Auto-backup to localStorage (last 5 chapters)
export async function autoBackup(workspaceId: string): Promise<void> {
    try {
        const workspace = await db.workspaces.get(workspaceId);
        if (!workspace) return;

        // Get last 5 translated chapters
        const recentChapters = await db.chapters
            .where('workspaceId')
            .equals(workspaceId)
            .and(c => c.status === 'translated')
            .reverse()
            .limit(5)
            .toArray();

        const backupData = {
            timestamp: Date.now(),
            workspace: {
                id: workspace.id,
                title: workspace.title
            },
            chapters: recentChapters.map(c => ({
                id: c.id,
                title: c.title,
                title_translated: c.title_translated,
                content_translated: c.content_translated,
                wordCountTranslated: c.wordCountTranslated
            }))
        };

        // Store in localStorage (max 5MB)
        const jsonString = JSON.stringify(backupData);
        if (jsonString.length < 5 * 1024 * 1024) { // 5MB limit
            localStorage.setItem(`backup_${workspaceId}`, jsonString);
        }
    } catch (error) {
        // Don't throw - backup failure shouldn't block translation
    }
}

// Restore from auto-backup
export async function restoreFromBackup(workspaceId: string): Promise<boolean> {
    try {
        const backupString = localStorage.getItem(`backup_${workspaceId}`);
        if (!backupString) return false;

        const backupData = JSON.parse(backupString);

        // Check if backup is recent (within 24 hours)
        const age = Date.now() - backupData.timestamp;
        if (age > 24 * 60 * 60 * 1000) {
            return false; // Backup too old
        }

        // Restore chapters
        for (const chapter of backupData.chapters) {
            await db.chapters.update(chapter.id, {
                title_translated: chapter.title_translated,
                content_translated: chapter.content_translated,
                wordCountTranslated: chapter.wordCountTranslated,
                status: 'translated'
            });
        }

        return true;
    } catch (error) {
        console.error("Restore from backup failed:", error);
        return false;
    }
}
