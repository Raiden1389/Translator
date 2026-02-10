import { db, HeuristicTerm } from '../../db';
import { extractCandidates, HeuristicEngine } from './tagger';
import { suggestHanViet } from './utils';
import { SyllableRepository } from '../../repositories/syllable-repo';
import { resolveEntity, EntityFinalDecision } from './conflict-resolver';
import { genericEntityGuard, GenericDecision } from './generic-entity-guard';
import { toast } from 'sonner';
import { ROLE_NOUNS, FUNCTION_WORDS, COMPOSITE_MARKERS } from './patterns';

/**
 * GLOBAL SCANNER v2.2 - WITH ABORT SIGNAL SUPPORT
 * Purpose: 
 * 1. Chunked DB writes (prevents IndexedDB lock)
 * 2. AbortSignal support (timeout/user cancel)
 * 3. Bulletproof state management
 */

export async function scanWorkspaceHeuristics(
    workspaceId: string,
    onProgress?: (current: number, total: number, message: string) => void,
    abortSignal?: AbortSignal
) {
    if (!workspaceId) return;

    // ✅ Early abort check
    if (abortSignal?.aborted) {
        throw new DOMException('Scan aborted before start', 'AbortError');
    }

    let total = 0;

    console.log(`[HeuristicScanner] 🚀 Starting Scan (v2.2) for: ${workspaceId}`);

    try {
        if (onProgress) {
            try {
                onProgress(0, 100, "🔋 Đang khởi động engine...");
            } catch (e) {
                console.warn("[HeuristicScanner] Progress callback error:", e);
            }
        }

        // --- PREPARE ---
        try {
            await SyllableRepository.getInstance().load("/dicts/ChinesePhienAmWords.txt");
        } catch (err) {
            console.error("[HeuristicScanner] Syllable load failed:", err);
        }

        // ✅ Check abort after blocking operation
        if (abortSignal?.aborted) {
            throw new DOMException('Scan aborted during syllable load', 'AbortError');
        }

        // --- PHASE 0: LOAD BLACKLIST & PRESERVE APPROVED ---
        if (onProgress) {
            try {
                onProgress(5, 100, "🧠 Đang tải bộ nhớ...");
            } catch (e) {
                console.warn("[HeuristicScanner] Progress callback error:", e);
            }
        }

        const ignoreSet = new Set<string>();
        try {
            const blacklist = await db.blacklist.where('workspaceId').equals(workspaceId).toArray();
            blacklist.forEach(b => {
                if (b.source === 'heuristic') ignoreSet.add(b.word);
            });
        } catch (e) {
            console.warn("[HeuristicScanner] Blacklist load failed:", e);
        }

        const preservedTerms = await db.heuristicTerms.where('workspaceId').equals(workspaceId).toArray();
        const approvedList: string[] = [];
        const alreadyApprovedSet = new Set<string>();

        preservedTerms.forEach(t => {
            if (t.isApproved || t.isGarbage) {
                ignoreSet.add(t.original);
                if (t.isApproved) {
                    approvedList.push(t.original);
                    alreadyApprovedSet.add(t.original);
                }
            }
        });

        // 🛡️ Sync Protected Terms to Engine
        HeuristicEngine.getInstance().setProtectedTerms(approvedList);

        if (onProgress) onProgress(10, 100, `🧹 Dọn rác cũ (Đã chốt: ${alreadyApprovedSet.size})...`);

        await db.heuristicTerms
            .where('workspaceId')
            .equals(workspaceId)
            .and(t => !t.isApproved && !t.isGarbage)
            .delete();

        // ✅ Check abort
        if (abortSignal?.aborted) {
            throw new DOMException('Scan aborted during cleanup', 'AbortError');
        }

        // --- PHASE 1: COLLECTION ---
        total = await db.chapters.where('workspaceId').equals(workspaceId).count();

        if (total === 0) {
            onProgress?.(100, 100, "⚠️ Không tìm thấy chương.");
            return;
        }

        const rawMap: Map<string, {
            original: string;
            type: string;
            occurrences: number;
            reason: string;
            hasVerbContext: boolean;
            snippets: string[];
        }> = new Map();

        let processed = 0;
        const CHUNK_SIZE = 50;

        await db.chapters
            .where('workspaceId')
            .equals(workspaceId)
            .each((chapter) => {
                if (abortSignal?.aborted) {
                    throw new DOMException('Scan aborted during collection', 'AbortError');
                }

                processed++;
                if (processed % CHUNK_SIZE === 0 || processed === total) {
                    onProgress?.(processed, total, `⚡ Đang quét (${processed}/${total})...`);
                }

                const candidates = extractCandidates(chapter.content_original);
                candidates.forEach(c => {
                    const existing = rawMap.get(c.original);
                    if (existing) {
                        existing.occurrences += c.occurrences;
                        if (c.metadata?.flags?.hasVerbContext) existing.hasVerbContext = true;

                        // ✅ Collect up to 3 snippets for character-context (v2.0)
                        if (existing.snippets.length < 3 && existing.type === 'character') {
                            const index = chapter.content_original.indexOf(c.original);
                            if (index !== -1) {
                                const start = Math.max(0, index - 80);
                                const end = Math.min(chapter.content_original.length, index + c.original.length + 80);
                                const snippet = chapter.content_original.substring(start, end)
                                    .replace(/\r?\n|\r/g, ' ') // Flatten newlines
                                    .trim();
                                existing.snippets.push(`...${snippet}...`);
                            }
                        }
                    } else {
                        const snippets: string[] = [];
                        if (c.type === 'character') {
                            const index = chapter.content_original.indexOf(c.original);
                            if (index !== -1) {
                                const start = Math.max(0, index - 80);
                                const end = Math.min(chapter.content_original.length, index + c.original.length + 80);
                                const snippet = chapter.content_original.substring(start, end)
                                    .replace(/\r?\n|\r/g, ' ')
                                    .trim();
                                snippets.push(`...${snippet}...`);
                            }
                        }

                        rawMap.set(c.original, {
                            original: c.original,
                            type: c.type as string,
                            occurrences: c.occurrences,
                            reason: c.reason,
                            hasVerbContext: c.metadata?.flags?.hasVerbContext || false,
                            snippets: snippets
                        });
                    }
                });
            });

        if (abortSignal?.aborted) throw new DOMException('Scan aborted after collection', 'AbortError');

        // --- PHASE 1.5: OPTIMIZED SUBSUMPTION FILTER (FIX #5) ---
        onProgress?.(total, total, `⚖️ Đang lọc "bóng ma"...`);

        const sortedCandidates = Array.from(rawMap.values())
            .filter(c => c.occurrences > 1)
            .sort((a, b) => b.original.length - a.original.length);

        const uniqueCandidates: typeof sortedCandidates = [];
        let killedCount = 0;
        let preservedIndependent = 0;

        for (let i = 0; i < sortedCandidates.length; i++) {
            const candidate = sortedCandidates[i];

            if (i % 500 === 0) {
                if (abortSignal?.aborted) throw new DOMException('Scan aborted during filtering', 'AbortError');
                onProgress?.(total, total, `⚖️ Đang lọc (${i}/${sortedCandidates.length})...`);
                await new Promise(r => setTimeout(r, 0));
            }

            let isShadow = false;
            const candidateLength = candidate.original.length;

            for (const parent of uniqueCandidates) {
                if (parent.original.includes(candidate.original)) {
                    // FIX #5: Independent Entity Concept
                    const frequencyRatio = candidate.occurrences / parent.occurrences;

                    // ✅ Protect well-known names (2-3 chars)
                    if (candidateLength >= 2 && candidateLength <= 3) {
                        // Only kill if frequency ratio is weak (< 0.6)
                        // If it appears > 60% of the time compared to parent, it's an "Independent Entity"
                        if (frequencyRatio > 0.6) {
                            preservedIndependent++;
                            continue;
                        }
                    }

                    // Standard Shadow: if it's a substring and frequency is nearly identical (within 10%)
                    if (frequencyRatio <= 1.1) {
                        isShadow = true;
                        killedCount++;
                        break;
                    }
                }
            }

            if (!isShadow) uniqueCandidates.push(candidate);
        }

        console.log(`[Scanner v3.1] Subsumption Report:
            - Total candidates: ${rawMap.size}
            - Shadows killed: ${killedCount}
            - Independent preserved: ${preservedIndependent}
            - Final candidates: ${uniqueCandidates.length + Array.from(rawMap.values()).filter(c => c.occurrences === 1).length}
        `);

        const singlesFull = Array.from(rawMap.values()).filter(c => c.occurrences === 1);

        // 🧪 REDUCE NOISE: Only keep singles with High Signal
        const singles = singlesFull.filter(c => {
            // Keep if it has verb context (strong signal)
            if (c.hasVerbContext) return true;
            // Keep if it's a long specific term (4+ chars usually specific)
            if (c.original.length >= 4) return true;
            // Otherwise, singles are usually trash or noise
            return false;
        });

        const finalCandidates = [...uniqueCandidates, ...singles];

        console.log(`[Scanner v3.2] Noise Suppression Report:
            - Initial Raw: ${rawMap.size}
            - Shadows killed: ${killedCount}
            - Singles total: ${singlesFull.length}
            - Singles preserved: ${singles.length} (Killed: ${singlesFull.length - singles.length})
            - Final to process: ${finalCandidates.length}
        `);

        // --- PHASE 2: SCORING & FILTERING ---
        if (onProgress) {
            try {
                onProgress(total, total, `⚖️ Đang tinh lọc thực thể (phase 2/2)...`);
            } catch (e) {
                console.warn("[HeuristicScanner] Progress callback error:", e);
            }
        }

        const finalBatch: HeuristicTerm[] = [];

        for (const raw of finalCandidates) {
            // ✅ Check abort (though less frequent than collection phase)
            if (abortSignal?.aborted) {
                throw new DOMException('Scan aborted during scoring', 'AbortError');
            }

            // 🎯 STICKY FILTER: Only scan for Characters as requested
            if (raw.type !== 'character') continue;

            if (ignoreSet.has(raw.original)) continue;

            const flags = {
                isGenericHuman: ROLE_NOUNS.some((r: string) => raw.original === r),
                isFunctionWord: FUNCTION_WORDS.includes(raw.original),
                hasVerbContext: raw.hasVerbContext,
                isComposite: COMPOSITE_MARKERS.some((m: string) => raw.original.includes(m)),
                isBlacklisted: false
            };

            const resolution = resolveEntity({
                text: raw.original,
                frequency: raw.occurrences,
                patternMatched: true,
                semanticFlags: flags
            });

            if (resolution.decision === EntityFinalDecision.REJECT) continue;

            const guardResult = genericEntityGuard({
                original: raw.original,
                type: raw.type as 'character' | 'skill' | 'location' | 'title' | 'unknown',
                confidence: resolution.score,
                reason: '',
                occurrences: raw.occurrences,
                hasVerbContext: raw.hasVerbContext
            });

            if (guardResult.decision === GenericDecision.DROP) continue;
            if (guardResult.decision === GenericDecision.DOWNGRADE) {
                resolution.score = Math.max(0, resolution.score - 20);
            }

            finalBatch.push({
                workspaceId,
                original: raw.original,
                translated: suggestHanViet(raw.original),
                type: raw.type as 'character' | 'skill' | 'location' | 'title' | 'unknown',
                confidence: resolution.score,
                pinyin: '',
                description: '',
                snippets: raw.snippets, // ✅ Preserving snippets for Refiner (v2.0)
                isApproved: false,
                isGarbage: false,
                occurrences: raw.occurrences,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        // ✅ Check abort before DB write
        if (abortSignal?.aborted) {
            throw new DOMException('Scan aborted before DB write', 'AbortError');
        }

        // --- PHASE 2.5: AUTO-CLEAN OLD PENDING TERMS ---
        // We delete all terms that are NOT approved for this workspace 
        // to ensure the scan is fresh and reflects new rules.
        onProgress?.(total, total, `🧹 Đang dọn dẹp dữ liệu cũ...`);
        await db.heuristicTerms
            .where('workspaceId').equals(workspaceId)
            .filter(t => !t.isApproved)
            .delete();

        // --- PHASE 3: CHUNKED DB WRITE (CRITICAL FIX) ---
        if (finalBatch.length > 0) {
            finalBatch.sort((a, b) => b.confidence - a.confidence || (b.occurrences || 0) - (a.occurrences || 0));

            const WRITE_CHUNK_SIZE = 1000;
            for (let i = 0; i < finalBatch.length; i += WRITE_CHUNK_SIZE) {
                // ✅ Check abort in write loop
                if (abortSignal?.aborted) {
                    throw new DOMException('Scan aborted during DB write', 'AbortError');
                }

                const chunk = finalBatch.slice(i, i + WRITE_CHUNK_SIZE);
                try {
                    await db.heuristicTerms.bulkPut(chunk);

                    if (onProgress) {
                        try {
                            onProgress(
                                total,
                                total,
                                `💾 Lưu kết quả (${Math.min(i + WRITE_CHUNK_SIZE, finalBatch.length)}/${finalBatch.length})...`
                            );
                        } catch (e) {
                            console.warn("[HeuristicScanner] Progress callback error:", e);
                        }
                    }

                    // Small yield between chunks to prevent lock
                    if (i + WRITE_CHUNK_SIZE < finalBatch.length) {
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }
                } catch (err) {
                    console.error(`[HeuristicScanner] Chunk write failed at index ${i}:`, err);
                    throw err;
                }
            }
        }

        if (onProgress) {
            try {
                onProgress(total, total, `✨ Hoàn tất! Phát hiện ${finalBatch.length} thực thể.`);
            } catch (e) {
                console.warn("[HeuristicScanner] Progress callback error:", e);
            }
        }

    } catch (error) {
        // ✅ Distinguish abort from errors
        if (error instanceof DOMException && error.name === 'AbortError') {
            console.warn("[HeuristicScanner] ABORTED:", error.message);
            // Don't show toast for abort, let the hook handle it
            throw error;
        }

        console.error("[HeuristicScanner] ERROR:", error);
        toast.error("Quét thất bại. Kiểm tra Console.");
        throw error;
    } finally {
        if (onProgress) {
            try {
                onProgress(total, total, "✨ Xong!");
            } catch (e) {
                console.warn("[HeuristicScanner] Final progress callback error:", e);
            }
        }
    }
}
