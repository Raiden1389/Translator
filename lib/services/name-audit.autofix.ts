/**
 * 🔧 Name Audit — Auto-Fix Engine (Phase 04)
 *
 * Applies confirmed name fixes:
 * 1. Creates Correction entries (Luyện Văn) for future translations
 * 2. Sweeps all translated chapters with each new rule
 * 3. Saves undo snapshot to history
 */

import { db, CorrectionEntry, GLOBAL_WORKSPACE_ID } from "@/lib/db";
import { sweepSingleRule } from "@/lib/services/corrections.service";
import type { NameCluster, NameFixResult } from "./name-audit.types";

/**
 * Apply confirmed name fixes from audit report.
 *
 * For each confirmed cluster:
 * 1. Check for duplicate Correction rules (skip if exists)
 * 2. Create CorrectionEntry { from: variant, to: canonical }
 * 3. sweepSingleRule → fix all existing chapters
 * 4. Save undo snapshot to db.history
 *
 * @param confirmedFixes - Map<clusterId, canonicalName>
 * @param clusters - All clusters from the report
 * @param workspaceId - For history tracking
 * @param onProgress - Callback for UI progress updates
 */
export async function applyNameFixes(
    confirmedFixes: Map<string, string>,
    clusters: NameCluster[],
    workspaceId: string,
    onProgress?: (current: number, total: number, label: string) => void,
): Promise<NameFixResult> {
    const startTime = performance.now();

    // Build fix list: for each confirmed cluster, collect variants to replace
    const fixes: { from: string; to: string; clusterId: string }[] = [];

    for (const [clusterId, canonicalName] of confirmedFixes) {
        const cluster = clusters.find(c => c.id === clusterId);
        if (!cluster) continue;

        for (const variant of cluster.variants) {
            // Don't replace the canonical itself
            if (variant.name === canonicalName) continue;
            fixes.push({
                from: variant.name,
                to: canonicalName,
                clusterId,
            });
        }
    }

    if (fixes.length === 0) {
        return { rulesCreated: 0, chaptersFixed: 0, durationMs: 0 };
    }

    const total = fixes.length;
    let rulesCreated = 0;
    let totalChaptersFixed = 0;

    // 1. Snapshot for undo (before any changes)
    const translatedChapters = await db.chapters
        .filter(c => !!c.content_translated)
        .toArray();

    const snapshot = translatedChapters.map(c => ({
        chapterId: c.id!,
        before: {
            title: c.title_translated || c.title,
            content: c.content_translated || "",
        },
    }));

    await db.history.add({
        workspaceId,
        actionType: 'batch_correction',
        summary: `Name Audit: ${fixes.length} quy tắc từ ${confirmedFixes.size} nhóm tên`,
        timestamp: new Date(),
        affectedCount: snapshot.length,
        snapshot,
    });

    // 2. For each fix: create Correction + sweep chapters
    for (let i = 0; i < fixes.length; i++) {
        const fix = fixes[i];
        onProgress?.(i + 1, total, `${fix.from} → ${fix.to}`);

        // Duplicate/override check
        const existing = await db.corrections
            .where("workspaceId")
            .equals(GLOBAL_WORKSPACE_ID)
            .filter(c =>
                c.type === "replace" &&
                (c.from || c.original || "").normalize("NFC").toLowerCase() === fix.from.normalize("NFC").toLowerCase()
            )
            .first();

        if (existing) {
            const existingTo = (existing.to || existing.replacement || "").normalize("NFC").toLowerCase();
            const newTo = fix.to.normalize("NFC").toLowerCase();

            if (existingTo === newTo) {
                console.log(`[NameAudit] Skipped existing identical rule: "${fix.from}" → "${fix.to}"`);
                continue;
            }

            // Override: canonical changed → update existing rule
            await db.corrections.update(existing.id!, {
                to: fix.to.normalize("NFC"),
                replacement: fix.to.normalize("NFC"),
                createdAt: new Date(),
            });
            rulesCreated++;
            console.log(`[NameAudit] Updated rule: "${fix.from}" → "${existingTo}" ⇒ "${fix.to}"`);
        } else {
            // Create new Correction entry
            const entry: Partial<CorrectionEntry> = {
                workspaceId: GLOBAL_WORKSPACE_ID,
                type: "replace",
                from: fix.from.normalize("NFC"),
                to: fix.to.normalize("NFC"),
                original: fix.from.normalize("NFC"),
                replacement: fix.to.normalize("NFC"),
                createdAt: new Date(),
            };

            await db.corrections.add(entry as CorrectionEntry);
            rulesCreated++;
        }

        // Sweep all translated chapters with this rule (both new + override)
        const sweepRule: Partial<CorrectionEntry> = {
            type: "replace",
            from: fix.from.normalize("NFC"),
            to: fix.to.normalize("NFC"),
            original: fix.from.normalize("NFC"),
            replacement: fix.to.normalize("NFC"),
        };
        const affected = await sweepSingleRule(sweepRule);
        totalChaptersFixed += affected;

        console.log(`[NameAudit] Rule "${fix.from}" → "${fix.to}": ${affected} chapters updated`);
    }

    const durationMs = Math.round(performance.now() - startTime);

    console.log(
        `[NameAudit] Auto-fix complete: ${rulesCreated} rules created, ` +
        `${totalChaptersFixed} chapter updates in ${durationMs}ms`
    );

    return { rulesCreated, chaptersFixed: totalChaptersFixed, durationMs };
}
