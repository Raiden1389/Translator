/**
 * Bulk Clean Service
 * Scan and strip boilerplate from all chapters in a workspace
 */
import { db } from '../db';
import { stripBoilerplate, scanBoilerplate } from '../utils/strip-boilerplate';

export interface CleanResult {
    total: number;
    cleaned: number;
    skipped: number;
    details: { chapterId: number; title: string; junkFound: string[] }[];
}

/**
 * Preview: Scan all chapters for boilerplate without modifying anything.
 */
export async function scanWorkspaceBoilerplate(workspaceId: number): Promise<CleanResult> {
    const chapters = await db.chapters
        .where('workspace_id')
        .equals(workspaceId)
        .toArray();

    const result: CleanResult = { total: chapters.length, cleaned: 0, skipped: 0, details: [] };

    for (const ch of chapters) {
        if (!ch.content_original) {
            result.skipped++;
            continue;
        }

        const junkFound = scanBoilerplate(ch.content_original);
        if (junkFound.length > 0) {
            result.cleaned++;
            result.details.push({
                chapterId: ch.id!,
                title: ch.title,
                junkFound,
            });
        } else {
            result.skipped++;
        }
    }

    return result;
}

/**
 * Execute: Strip boilerplate from all chapters in workspace.
 * Updates content_original in DB.
 */
export async function cleanWorkspaceBoilerplate(
    workspaceId: number,
    onProgress?: (current: number, total: number, title: string) => void
): Promise<CleanResult> {
    const chapters = await db.chapters
        .where('workspace_id')
        .equals(workspaceId)
        .toArray();

    const result: CleanResult = { total: chapters.length, cleaned: 0, skipped: 0, details: [] };

    for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i];
        onProgress?.(i + 1, chapters.length, ch.title);

        if (!ch.content_original) {
            result.skipped++;
            continue;
        }

        const junkFound = scanBoilerplate(ch.content_original);
        const { cleaned, changed } = stripBoilerplate(ch.content_original);

        if (changed) {
            await db.chapters.update(ch.id!, { content_original: cleaned });
            result.cleaned++;
            result.details.push({
                chapterId: ch.id!,
                title: ch.title,
                junkFound,
            });
        } else {
            result.skipped++;
        }
    }

    return result;
}
