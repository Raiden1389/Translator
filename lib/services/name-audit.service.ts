/**
 * 🔍 Name Audit Service — Orchestrator
 *
 * Thin coordinator that wires Phase 1 (extraction) + Phase 2 (clustering).
 * DB access lives here; pure logic lives in extraction/clustering modules.
 */

import { db } from "@/lib/db";
import { SyllableRepository } from "@/lib/repositories/syllable-repo";
import { VietPhraseRepository } from "@/lib/repositories/viet-phrase-repo";
import type {
    VietnameseNameOccurrence,
    ChineseNameOccurrence,
    AlignedParagraph,
    NameScanResult,
    SourceParagraphRef,
} from "./name-audit.types";
import {
    extractVietnameseNamesFromText,
    extractChineseNamesFromText,
    alignParagraphs,
    buildCrossRefFromAligned,
    splitParagraphs,
} from "./name-audit.extraction";

// Re-export extraction + clustering for convenient imports
export {
    extractVietnameseNamesFromText,
    extractChineseNamesFromText,
    alignParagraphs,
    buildCrossRefFromAligned,
} from "./name-audit.extraction";

export {
    normalizedSimilarity,
    clusterSimilarNames,
    generateAuditReport,
} from "./name-audit.clustering";

export {
    applyNameFixes,
} from "./name-audit.autofix";

// ────────────────────────────────────────────────────
// FULL SCAN ORCHESTRATOR
// ────────────────────────────────────────────────────

/**
 * Scan all translated chapters in a workspace for character names.
 * Extracts from both Vietnamese and Chinese text, cross-references via paragraph alignment.
 * 
 * @param workspaceId - The workspace to scan
 * @param onProgress - Optional callback for progress updates
 * @param options - Optional scan options (chapter range)
 * @returns NameScanResult with all extracted names
 */
export async function scanWorkspaceNames(
    workspaceId: string,
    onProgress?: (current: number, total: number) => void,
    options?: { fromChapter?: number; toChapter?: number },
): Promise<NameScanResult> {
    const startTime = performance.now();

    // 1. Load translated chapters (optionally filtered by range)
    let chapters = await db.chapters
        .where("workspaceId")
        .equals(workspaceId)
        .filter(c => c.status === "translated" && !!c.content_translated)
        .toArray();

    // Apply chapter range filter
    if (options?.fromChapter != null || options?.toChapter != null) {
        const from = options.fromChapter ?? 0;
        const to = options.toChapter ?? Infinity;
        chapters = chapters.filter(c => c.order >= from && c.order <= to);
    }

    const total = chapters.length;
    if (total === 0) {
        return {
            vietnameseNames: [],
            chineseNames: [],
            crossRefMap: [],
            totalChaptersScanned: 0,
            scanDurationMs: 0,
        };
    }

    // Sort by order for consistent chapter range display
    chapters.sort((a, b) => a.order - b.order);

    // 2. Aggregate maps — now with sourceRefs for paragraph look-back
    const globalVietNames = new Map<string, {
        count: number;
        chapters: Set<number>;
        contexts: string[];
        sourceRefs: SourceParagraphRef[];
    }>();
    const globalChineseNames = new Map<string, { count: number; chapters: Set<number> }>();

    // Get repositories for paragraph conversion — ensure loaded (idempotent)
    const repo = SyllableRepository.getInstance();
    const vpRepo = VietPhraseRepository.getInstance();
    await repo.load("/dicts/ChinesePhienAmWords.txt");
    await vpRepo.load("/dicts/VietPhrase.txt");

    for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        onProgress?.(i + 1, total);

        // Pre-split paragraphs for both sides
        const translatedParas = splitParagraphs(chapter.content_translated!);
        const originalParas = chapter.content_original
            ? splitParagraphs(chapter.content_original)
            : [];

        // 2a. Extract Vietnamese names
        const vietNames = extractVietnameseNamesFromText(
            chapter.content_translated!,
            chapter.order
        );
        for (const [name, data] of vietNames) {
            const existing = globalVietNames.get(name);
            if (existing) {
                existing.count += data.count;
                for (const ch of data.chapters) existing.chapters.add(ch);
                for (const ctx of data.contexts) {
                    if (existing.contexts.length < 3 && !existing.contexts.includes(ctx)) {
                        existing.contexts.push(ctx);
                    }
                }
            } else {
                globalVietNames.set(name, {
                    count: data.count,
                    chapters: new Set(data.chapters),
                    contexts: [...data.contexts],
                    sourceRefs: [],
                });
            }

            // Build sourceRefs: look back to Chinese paragraph (max 5 per name total)
            const entry = globalVietNames.get(name)!;
            if (entry.sourceRefs.length < 5) {
                for (const pIdx of data.paragraphIndices) {
                    if (entry.sourceRefs.length >= 5) break;
                    const ref: SourceParagraphRef = {
                        chapterOrder: chapter.order,
                        chapterId: chapter.id,
                        paragraphIndex: pIdx,
                        vietnameseParagraph: translatedParas[pIdx] ?? '',
                    };
                    // Look back to matching Chinese paragraph
                    if (pIdx < originalParas.length) {
                        ref.chineseParagraph = originalParas[pIdx];
                        ref.chineseVietPhrase = vpRepo.convert(originalParas[pIdx]);
                        ref.chineseHanViet = repo.toHanViet(originalParas[pIdx]);
                    }
                    entry.sourceRefs.push(ref);
                }
            }
        }

        // 2b. Extract Chinese names
        if (chapter.content_original) {
            const chineseNames = extractChineseNamesFromText(
                chapter.content_original,
                chapter.order
            );
            for (const [name, data] of chineseNames) {
                const existing = globalChineseNames.get(name);
                if (existing) {
                    existing.count += data.count;
                    for (const ch of data.chapters) existing.chapters.add(ch);
                } else {
                    globalChineseNames.set(name, { ...data });
                }
            }
        }
    }

    // 3. Build cross-reference (paragraph-based)
    const allAligned: AlignedParagraph[] = [];
    for (const chapter of chapters) {
        if (chapter.content_original && chapter.content_translated) {
            allAligned.push(...alignParagraphs(chapter.content_original, chapter.content_translated));
        }
    }
    const crossRefMap = buildCrossRefFromAligned(allAligned, repo);

    // 4. Convert maps to sorted arrays
    const vietnameseNames: VietnameseNameOccurrence[] = Array.from(globalVietNames.entries())
        .map(([name, data]) => ({
            name,
            count: data.count,
            chapters: Array.from(data.chapters).sort((a, b) => a - b),
            contexts: data.contexts,
            sourceRefs: data.sourceRefs,
        }))
        .sort((a, b) => b.count - a.count);

    const chineseNames: ChineseNameOccurrence[] = Array.from(globalChineseNames.entries())
        .map(([name, data]) => ({
            name,
            hanViet: repo.toHanViet(name),
            count: data.count,
            chapters: Array.from(data.chapters).sort((a, b) => a - b),
        }))
        .filter(n => n.count >= 2)
        .sort((a, b) => b.count - a.count);

    const scanDurationMs = Math.round(performance.now() - startTime);

    console.log(
        `[NameAudit] Scanned ${total} chapters in ${scanDurationMs}ms. ` +
        `Found ${vietnameseNames.length} Viet names, ${chineseNames.length} Chinese names, ` +
        `${crossRefMap.length} cross-refs.`
    );

    return {
        vietnameseNames,
        chineseNames,
        crossRefMap,
        totalChaptersScanned: total,
        scanDurationMs,
    };
}

// ────────────────────────────────────────────────────
// CHAPTER CONVERTER (for UI "Convert" modal)
// ────────────────────────────────────────────────────

/**
 * Convert a chapter's original Chinese text to VietPhrase + HanViet.
 * Used when cross-ref fails and user wants to manually read the full chapter.
 * 
 * Returns paragraph-by-paragraph conversion for side-by-side display.
 */
export async function convertChapterForReview(
    chapterId: number,
): Promise<{
    chapterOrder: number;
    paragraphs: {
        original: string;
        vietPhrase: string;
        hanViet: string;
    }[];
} | null> {
    const chapter = await db.chapters.get(chapterId);
    if (!chapter?.content_original) return null;

    const repo = SyllableRepository.getInstance();
    const vpRepo = VietPhraseRepository.getInstance();
    await repo.load("/dicts/ChinesePhienAmWords.txt");
    await vpRepo.load("/dicts/VietPhrase.txt");

    const originalParas = splitParagraphs(chapter.content_original);

    // Strip HTML tags and filter out HTML-only / empty paragraphs
    const cleanParas = originalParas
        .map(para => para.replace(/<[^>]+>/g, '').trim())
        .filter(para => para.length > 0);

    return {
        chapterOrder: chapter.order,
        paragraphs: cleanParas.map(para => ({
            original: para,
            vietPhrase: vpRepo.convert(para),
            hanViet: repo.toHanViet(para),
        })),
    };
}
