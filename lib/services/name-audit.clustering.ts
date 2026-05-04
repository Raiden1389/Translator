/**
 * 🔍 Name Audit — Clustering Engine (Phase 02)
 *
 * Groups similar Vietnamese name variants into clusters.
 * Uses Chinese cross-ref (highest confidence) + fuzzy Levenshtein matching.
 */

import type {
    NameScanResult,
    NameCluster,
    NameVariant,
    NameAuditReport,
} from "./name-audit.types";
import { extractChineseNamesFromText, levenshteinDistance } from "./name-audit.extraction";

// ────────────────────────────────────────────────────
// SIMILARITY
// ────────────────────────────────────────────────────

/**
 * Normalized Levenshtein similarity: 0 (completely different) to 1 (identical).
 */
export function normalizedSimilarity(a: string, b: string): number {
    const left = a.normalize("NFC").toLowerCase();
    const right = b.normalize("NFC").toLowerCase();
    if (left === right) return 1;
    const maxLen = Math.max(left.length, right.length);
    if (maxLen === 0) return 1;
    return 1 - levenshteinDistance(left, right) / maxLen;
}

function chapterOverlapRatio(a: number[], b: number[]): number {
    if (!a.length || !b.length) return 0;
    const bSet = new Set(b);
    const overlap = a.filter(ch => bSet.has(ch)).length;
    return overlap / Math.min(a.length, b.length);
}

function sourceRefMatchRatio(variant: NameVariant, chineseName?: string): number {
    if (!chineseName || !variant.sourceRefs.length) return 0;
    let score = 0;
    for (const ref of variant.sourceRefs) {
        if (!ref.chineseParagraph) continue;
        const localNames = Array.from(extractChineseNamesFromText(ref.chineseParagraph, ref.chapterOrder).keys());
        if (!localNames.includes(chineseName)) continue;
        score += localNames.length === 1 ? 1 : 0.35;
    }
    return score / variant.sourceRefs.length;
}

function computeClusterChapterSpread(variants: NameVariant[]): number {
    return new Set(variants.flatMap(variant => variant.chapters)).size;
}

function computeSourceEvidenceCount(variants: NameVariant[], chineseName?: string): number {
    return variants.reduce((total, variant) => {
        if (!variant.sourceRefs.length) return total;
        if (!chineseName) return total + variant.sourceRefs.length;
        return total + variant.sourceRefs.filter(ref => ref.chineseParagraph?.includes(chineseName)).length;
    }, 0);
}

function computeActionability(cluster: Pick<NameCluster, "variants" | "confidence" | "isInconsistent" | "totalOccurrences" | "chineseName">) {
    const chapterSpread = computeClusterChapterSpread(cluster.variants);
    const sourceEvidenceCount = computeSourceEvidenceCount(cluster.variants, cluster.chineseName);
    const occurrenceScore = Math.min(cluster.totalOccurrences / 12, 1);
    const spreadScore = Math.min(chapterSpread / 6, 1);
    const evidenceScore = Math.min(sourceEvidenceCount / 4, 1);

    const actionabilityScore = Math.max(
        cluster.isInconsistent
            ? cluster.confidence * 0.45 + occurrenceScore * 0.2 + spreadScore * 0.15 + evidenceScore * 0.2
            : cluster.confidence * 0.2 + occurrenceScore * 0.15 + spreadScore * 0.15 + evidenceScore * 0.15 - 0.35,
        0,
    );

    return {
        chapterSpread,
        sourceEvidenceCount,
        actionabilityScore: Math.min(actionabilityScore, 1),
        isActionable: cluster.isInconsistent && actionabilityScore >= 0.5,
    };
}

function finalizeCluster(cluster: Omit<NameCluster, "chapterSpread" | "sourceEvidenceCount" | "actionabilityScore" | "isActionable">): NameCluster {
    const variants = [...cluster.variants].sort((a, b) => b.count - a.count);
    const totalOccurrences = variants.reduce((sum, variant) => sum + variant.count, 0);
    const base: Omit<NameCluster, "chapterSpread" | "sourceEvidenceCount" | "actionabilityScore" | "isActionable"> = {
        ...cluster,
        variants,
        totalOccurrences,
        suggestedCanonical: variants[0]?.name ?? cluster.suggestedCanonical,
        isInconsistent: variants.length > 1,
    };
    return {
        ...base,
        ...computeActionability(base),
    };
}

function scoreNameAgainstCluster(
    nameData: NameVariant,
    cluster: NameCluster,
    similarityThreshold: number,
): number {
    const bestVariantSimilarity = Math.max(
        ...cluster.variants.map(variant => normalizedSimilarity(nameData.name, variant.name)),
    );
    const bestChapterOverlap = Math.max(
        ...cluster.variants.map(variant => chapterOverlapRatio(nameData.chapters, variant.chapters)),
    );
    const sourceMatch = sourceRefMatchRatio(nameData, cluster.chineseName);
    const hanVietSimilarity = cluster.hanViet
        ? normalizedSimilarity(nameData.name.toLowerCase(), cluster.hanViet.toLowerCase())
        : 0;
    const strongTypoSimilarity = Math.max(0.82, similarityThreshold + 0.02);

    if (sourceMatch >= 0.6) return 0.98;

    if (bestVariantSimilarity >= strongTypoSimilarity) {
        return Math.max(
            0.8,
            bestVariantSimilarity * 0.92 +
                bestChapterOverlap * 0.04 +
                sourceMatch * 0.02 +
                hanVietSimilarity * 0.02,
        );
    }

    if (cluster.chineseName && bestVariantSimilarity < similarityThreshold && hanVietSimilarity < similarityThreshold) {
        return Math.max(sourceMatch * 0.7, bestChapterOverlap * 0.4);
    }

    return bestVariantSimilarity * 0.55 + bestChapterOverlap * 0.2 + sourceMatch * 0.2 + hanVietSimilarity * 0.05;
}

// ────────────────────────────────────────────────────
// CLUSTERING
// ────────────────────────────────────────────────────



/**
 * Cluster similar Vietnamese names together.
 * 
 * Strategy:
 * 1. Chinese cross-ref first (highest confidence) — same Chinese source = same person
 * 2. SourceRef paragraph matching — look back to Chinese paragraph
 * 3. Fuzzy match fallback — normalized Levenshtein ≥ threshold
 * 4. Highest frequency variant = suggested canonical
 */
export function clusterSimilarNames(
    scanResult: NameScanResult,
    similarityThreshold = 0.75,
): NameCluster[] {
    const { vietnameseNames, crossRefMap } = scanResult;
    const clusters: NameCluster[] = [];
    const assignedNames = new Set<string>();
    let clusterId = 0;

    const nameByKey = new Map(vietnameseNames.map(name => [name.name, name]));

    // ── Step 1: Initialize clusters from crossRefMap (High Confidence) ──
    if (crossRefMap && crossRefMap.length > 0) {
        for (const entry of crossRefMap) {
            const variants: NameVariant[] = [];

            for (const vName of entry.vietnameseVariants) {
                const nameData = nameByKey.get(vName);
                if (nameData && !assignedNames.has(vName)) {
                    variants.push({
                        name: nameData.name,
                        count: nameData.count,
                        chapters: nameData.chapters,
                        contexts: nameData.contexts,
                        sourceRefs: nameData.sourceRefs,
                    });
                    assignedNames.add(vName);
                }
            }

            if (variants.length > 0) {
                clusters.push(finalizeCluster({
                    id: `cluster-${++clusterId}`,
                    chineseName: entry.chineseName,
                    hanViet: entry.hanViet,
                    variants,
                    suggestedCanonical: variants[0].name,
                    totalOccurrences: 0,
                    isInconsistent: variants.length > 1,
                    confidence: 1.0, // Confirmed by Chinese cross-ref
                }));
            }
        }
    }

    // ── Step 2: Guided match remaining names into existing clusters ──
    const remainingNames = vietnameseNames.filter(n => !assignedNames.has(n.name));

    for (const nameData of remainingNames) {
        if (assignedNames.has(nameData.name)) continue;

        let bestClusterIdx = -1;
        let bestScore = 0;
        const candidateVariant: NameVariant = {
            name: nameData.name,
            count: nameData.count,
            chapters: nameData.chapters,
            contexts: nameData.contexts,
            sourceRefs: nameData.sourceRefs,
        };

        for (let i = 0; i < clusters.length; i++) {
            const score = scoreNameAgainstCluster(candidateVariant, clusters[i], similarityThreshold);
            if (score > bestScore) {
                bestScore = score;
                bestClusterIdx = i;
            }
        }

        if (bestClusterIdx >= 0 && bestScore >= Math.max(similarityThreshold, 0.78)) {
            const nextConfidence = clusters[bestClusterIdx].confidence > 0.8 ? 0.8 : Math.max(clusters[bestClusterIdx].confidence, bestScore);
            clusters[bestClusterIdx] = finalizeCluster({
                ...clusters[bestClusterIdx],
                variants: [...clusters[bestClusterIdx].variants, candidateVariant],
                confidence: nextConfidence,
            });
            assignedNames.add(nameData.name);
        } else {
            // Create single-name cluster without Chinese name
            clusters.push(finalizeCluster({
                id: `cluster-${++clusterId}`,
                variants: [candidateVariant],
                suggestedCanonical: nameData.name,
                totalOccurrences: 0,
                isInconsistent: false,
                confidence: candidateVariant.sourceRefs.length > 0 ? 0.45 : 0.25,
            }));
            assignedNames.add(nameData.name);
        }
    }

    // ── Step 3: Opportunistic merge for remaining low-confidence typo variants ──
    let merged = true;
    while (merged) {
        merged = false;
        outer: for (let i = 0; i < clusters.length; i++) {
            for (let j = i + 1; j < clusters.length; j++) {
                if (clusters[i].chineseName && clusters[j].chineseName && clusters[i].chineseName !== clusters[j].chineseName) {
                    continue;
                }

                const crossSimilarity = Math.max(
                    ...clusters[i].variants.flatMap(left =>
                        clusters[j].variants.map(right => normalizedSimilarity(left.name, right.name)),
                    ),
                );
                const chapterOverlap = Math.max(
                    ...clusters[i].variants.flatMap(left =>
                        clusters[j].variants.map(right => chapterOverlapRatio(left.chapters, right.chapters)),
                    ),
                );

                if (crossSimilarity < 0.82 || chapterOverlap <= 0) {
                    continue;
                }

                const mergedCluster = finalizeCluster({
                    id: clusters[i].id,
                    chineseName: clusters[i].chineseName ?? clusters[j].chineseName,
                    hanViet: clusters[i].hanViet ?? clusters[j].hanViet,
                    variants: [...clusters[i].variants, ...clusters[j].variants],
                    suggestedCanonical: clusters[i].suggestedCanonical,
                    totalOccurrences: 0,
                    isInconsistent: true,
                    confidence: Math.max(clusters[i].confidence, clusters[j].confidence, Math.min(crossSimilarity, 0.8)),
                });

                clusters.splice(j, 1);
                clusters[i] = mergedCluster;
                merged = true;
                break outer;
            }
        }
    }

    // ── Step 4: Sort — actionable inconsistent first, then by score/occurrences ──
    clusters.sort((a, b) => {
        if (a.isActionable !== b.isActionable) {
            return a.isActionable ? -1 : 1;
        }
        if (a.isInconsistent !== b.isInconsistent) {
            return a.isInconsistent ? -1 : 1;
        }
        if (a.actionabilityScore !== b.actionabilityScore) {
            return b.actionabilityScore - a.actionabilityScore;
        }
        return b.totalOccurrences - a.totalOccurrences;
    });

    return clusters;
}

// ────────────────────────────────────────────────────
// REPORT GENERATOR
// ────────────────────────────────────────────────────

/**
 * Generate final audit report from scan result.
 * Combines Phase 1 extraction + Phase 2 clustering.
 */
export function generateAuditReport(
    scanResult: NameScanResult,
    similarityThreshold = 0.75,
): NameAuditReport {
    const clusters = clusterSimilarNames(scanResult, similarityThreshold);

    const inconsistentCount = clusters.filter(c => c.isInconsistent).length;
    const consistentCount = clusters.filter(c => !c.isInconsistent).length;

    return {
        clusters,
        inconsistentCount,
        consistentCount,
        totalNamesFound: scanResult.vietnameseNames.length,
        totalChaptersScanned: scanResult.totalChaptersScanned,
        scanDurationMs: scanResult.scanDurationMs,
    };
}
