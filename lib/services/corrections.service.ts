/**
 * 🔥 Luyện Văn — Global Corrections Service
 * 
 * Pure service layer for applying global corrections.
 * - applyCorrectionsText(): pure function, no DB access
 * - applyCorrectionsToChapter(): single chapter, DB read/write
 * - applyCorrectionsToChapters(): batch, loads rules once
 * - loadGlobalRules(): cache-friendly rule loader
 */

import { db, CorrectionEntry, GLOBAL_WORKSPACE_ID } from "@/lib/db";
import { applyAllCorrections } from "@/lib/gemini/text/correction";

// ────────────────────────────────────────────────────
// 1. PURE FUNCTION — No side effects, testable
// ────────────────────────────────────────────────────

/**
 * Apply correction rules to a text string.
 * Pure function — no DB access.
 */
export function applyCorrectionsText(
    text: string,
    rules: Partial<CorrectionEntry>[]
): string {
    if (!text || !rules.length) return text;
    return applyAllCorrections(text, rules);
}

// ────────────────────────────────────────────────────
// 2. DB HELPERS
// ────────────────────────────────────────────────────

/**
 * Load all global correction rules from DB.
 * Call once, reuse for batch operations.
 */
export async function loadGlobalRules(): Promise<CorrectionEntry[]> {
    return db.corrections
        .where("workspaceId")
        .equals(GLOBAL_WORKSPACE_ID)
        .toArray();
}

// ────────────────────────────────────────────────────
// 3. SINGLE CHAPTER — For post-translation hook
// ────────────────────────────────────────────────────

/**
 * Apply all global corrections to a single chapter.
 * Loads rules from DB, applies, saves back. Silent.
 * 
 * @param chapterId - Chapter ID to process
 * @param preloadedRules - Optional: skip DB query if rules already loaded
 * @returns true if content was changed
 */
export async function applyCorrectionsToChapter(
    chapterId: number,
    preloadedRules?: CorrectionEntry[]
): Promise<boolean> {
    const rules = preloadedRules ?? await loadGlobalRules();
    if (!rules.length) return false;

    const chapter = await db.chapters.get(chapterId);
    if (!chapter?.content_translated) return false;

    const original = chapter.content_translated;
    const corrected = applyCorrectionsText(original, rules);

    if (corrected === original) return false;

    await db.chapters.update(chapterId, { content_translated: corrected });
    return true;
}

// ────────────────────────────────────────────────────
// 4. BATCH — For translation batch, import, sync
// ────────────────────────────────────────────────────

/**
 * Apply all global corrections to multiple chapters.
 * Loads rules ONCE, then sweeps all chapters. Silent.
 * 
 * @param chapterIds - Array of chapter IDs to process
 * @returns Number of chapters actually changed
 */
export async function applyCorrectionsToChapters(
    chapterIds: number[]
): Promise<number> {
    if (!chapterIds.length) return 0;

    const rules = await loadGlobalRules();
    if (!rules.length) return 0;

    let affected = 0;
    for (const id of chapterIds) {
        const changed = await applyCorrectionsToChapter(id, rules);
        if (changed) affected++;
    }
    return affected;
}

// ────────────────────────────────────────────────────
// 5. GLOBAL SWEEP — For "add rule" auto-apply
// ────────────────────────────────────────────────────

/**
 * Apply a SINGLE new rule to ALL translated chapters.
 * Used when user adds a new correction — silent, no toast.
 * 
 * @param rule - The newly added correction rule
 * @param excludeChapterId - Optional chapter to skip (already applied inline)
 * @returns Number of chapters changed
 */
export async function sweepSingleRule(
    rule: Partial<CorrectionEntry>,
    excludeChapterId?: number
): Promise<number> {
    const allChapters = await db.chapters
        .filter(c => !!c.content_translated && c.id !== excludeChapterId)
        .toArray();

    if (!allChapters.length) return 0;

    let affected = 0;
    for (const ch of allChapters) {
        const original = ch.content_translated!;
        const corrected = applyCorrectionsText(original, [rule]);

        if (corrected !== original) {
            await db.chapters.update(ch.id!, { content_translated: corrected });
            affected++;
        }
    }
    return affected;
}
