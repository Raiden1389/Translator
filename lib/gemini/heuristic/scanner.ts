import { db, HeuristicTerm } from '../../db';
import { extractCandidates } from './tagger';
import { suggestHanViet } from './utils';
import { SyllableRepository } from '../../repositories/syllable-repo';
import { resolveEntity, EntityFinalDecision } from './conflict-resolver';
import { genericEntityGuard, GenericDecision } from './generic-entity-guard';
import { resolveRankV18, classifyRankContext } from './rank-resolver';
import { toast } from 'sonner';

/**
 * GLOBAL SCANNER v1.9 - BULLETPROOF
 * Purpose: Fast scan with robust error handling and index-safe queries.
 */
export async function scanWorkspaceHeuristics(
    workspaceId: string,
    onProgress?: (current: number, total: number, message: string) => void
) {
    if (!workspaceId) return;

    console.log(`[HeuristicScanner] 🚀 Starting Scan for: ${workspaceId}`);
    if (onProgress) onProgress(0, 100, "🔋 Đang chuẩn bị...");

    try {
        // --- PREPARE ---
        try {
            await SyllableRepository.getInstance().load("/dicts/ChinesePhienAmWords.txt");
        } catch (err) {
            console.error("[HeuristicScanner] Syllable load failed:", err);
        }

        // --- PHASE 0: LOAD BLACKLIST & PRESERVE APPROVED ---
        if (onProgress) onProgress(5, 100, "🧠 Đang tải bộ nhớ (Blacklist)...");

        const ignoreSet = new Set<string>();

        try {
            // SAFE QUERY: Using where('workspaceId') instead of compound index [workspaceId+source]
            // as migration to version 104 might still be in progress or failing on some systems.
            const blacklist = await db.blacklist
                .where('workspaceId')
                .equals(workspaceId)
                .toArray();

            // Only ignore heuristic-sourced blacklist entries
            blacklist.forEach(b => {
                if (b.source === 'heuristic') ignoreSet.add(b.word);
            });
        } catch (e) {
            console.warn("[HeuristicScanner] Blacklist load failed, skipping ignore list:", e);
        }

        // Preserve Approved and Garbage terms (Smart Scan)
        const preservedTerms = await db.heuristicTerms
            .where('workspaceId')
            .equals(workspaceId)
            .toArray();

        preservedTerms.forEach(t => {
            if (t.isApproved || t.isGarbage) {
                ignoreSet.add(t.original);
            }
        });

        console.log(`[HeuristicScanner] 🧠 Learned ${ignoreSet.size} words to skip.`);

        if (onProgress) onProgress(10, 100, "🧹 Dọn dẹp dữ liệu cũ...");

        // CLEANUP: Only delete terms that are NOT approved and NOT garbage
        await db.heuristicTerms
            .where('workspaceId')
            .equals(workspaceId)
            .and(t => !t.isApproved && !t.isGarbage)
            .delete();

        // --- PHASE 1: COLLECTION ---
        const total = await db.chapters.where('workspaceId').equals(workspaceId).count();
        if (total === 0) {
            if (onProgress) onProgress(100, 100, "⚠️ Không tìm thấy chương.");
            return;
        }

        const rawMap: Map<string, {
            original: string;
            type: string;
            occurrences: number;
            flags: Record<string, boolean>;
            reason: string;
            metadata?: any;
        }> = new Map();

        let processed = 0;
        const CHUNK_SIZE = 50;

        await db.chapters
            .where('workspaceId')
            .equals(workspaceId)
            .each((chapter) => {
                processed++;
                if (processed % CHUNK_SIZE === 0 || processed === total) {
                    if (onProgress) onProgress(processed, total, `⚡ Đang quét (${processed}/${total})...`);
                }

                const candidates = extractCandidates(chapter.content_original);
                candidates.forEach(c => {
                    // SKIP if ignored (Blacklist / Approved / Garbage)
                    if (ignoreSet.has(c.original)) return;

                    const existing = rawMap.get(c.original);
                    if (existing) {
                        existing.occurrences += c.occurrences;
                    } else {
                        rawMap.set(c.original, {
                            original: c.original,
                            type: c.type,
                            occurrences: c.occurrences,
                            flags: c.metadata?.flags || {},
                            reason: c.reason,
                            metadata: c.metadata
                        });
                    }
                });
            });

        // --- PHASE 2: SCORING & FILTERING ---
        if (onProgress) onProgress(total, total, `⚖️ Đang chấm điểm ${rawMap.size} ứng viên...`);

        const allCandidates = Array.from(rawMap.values());
        const finalBatch: HeuristicTerm[] = [];

        for (const raw of allCandidates) {
            // ======= RANK RESOLVER - CHỈ DÀNH CHO TITLE =======
            if (raw.type === 'title') {
                const rankShape = resolveRankV18(raw.original);
                if (rankShape === 'RANK') continue;

                const rankCtx = classifyRankContext(raw.original);
                if (rankCtx !== 'TITLE') {
                    // Skip generic, statement, object, descriptive
                    continue;
                }
            }

            const resolution = resolveEntity({
                text: raw.original,
                frequency: raw.occurrences,
                patternMatched: true,
                semanticFlags: raw.flags
            });

            if (resolution.decision === EntityFinalDecision.REJECT) continue;

            // ======= GENERIC ENTITY GUARD =======
            const guardResult = genericEntityGuard({
                original: raw.original,
                type: raw.type as any,
                confidence: resolution.score,
                reason: '',
                occurrences: raw.occurrences
            });

            if (guardResult.decision === GenericDecision.DROP) continue;

            if (guardResult.decision === GenericDecision.DOWNGRADE) {
                resolution.score = Math.max(0, resolution.score - 20);
            }

            finalBatch.push({
                workspaceId,
                original: raw.original,
                translated: suggestHanViet(raw.original),
                type: raw.type as any,
                confidence: resolution.score,
                pinyin: '',
                isApproved: false,
                isGarbage: false,
                occurrences: raw.occurrences,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        if (finalBatch.length > 0) {
            finalBatch.sort((a, b) => b.confidence - a.confidence || (b.occurrences || 0) - (a.occurrences || 0));
            await db.heuristicTerms.bulkPut(finalBatch);
        }

        if (onProgress) onProgress(total, total, `✨ Hoàn tất! Phát hiện ${finalBatch.length} thực thể.`);

    } catch (error) {
        console.error("[HeuristicScanner] FATAL ERROR:", error);
        toast.error("Quá trình quét gặp lỗi nghiêm trọng. Kiểm tra Console.");
        if (onProgress) onProgress(0, 0, "❌ Lỗi hệ thống.");
    }
}
