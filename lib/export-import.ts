import { db, type Workspace, type Chapter, type DictionaryEntry, type CorrectionEntry } from "./db";

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
        const data = JSON.parse(text);

        // Validate data structure
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
