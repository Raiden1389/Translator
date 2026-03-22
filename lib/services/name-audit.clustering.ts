/**
 * 🔍 Name Audit — Clustering Engine (Phase 02)
 *
 * Groups similar Vietnamese name variants into clusters.
 * Uses Chinese cross-ref (highest confidence) + fuzzy Levenshtein matching.
 */

import type {
    ChineseNameOccurrence,
    NameScanResult,
    NameCluster,
    NameVariant,
    NameAuditReport,
} from "./name-audit.types";
import { levenshteinDistance } from "./name-audit.extraction";

// ────────────────────────────────────────────────────
// SIMILARITY
// ────────────────────────────────────────────────────

/**
 * Normalized Levenshtein similarity: 0 (completely different) to 1 (identical).
 */
export function normalizedSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    return 1 - levenshteinDistance(a, b) / maxLen;
}

// ────────────────────────────────────────────────────
// CLUSTERING
// ────────────────────────────────────────────────────

/**
 * Extract Chinese name from a paragraph by checking against known names.
 */
function extractChineseNameFromParagraph(
    chineseParagraph: string,
    chineseNames: ChineseNameOccurrence[]
): string | undefined {
    for (const cn of chineseNames) {
        if (chineseParagraph.includes(cn.name)) {
            return cn.name;
        }
    }
    return undefined;
}

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
    const { vietnameseNames, chineseNames, crossRefMap } = scanResult;

    const clusters: NameCluster[] = [];
    const assignedNames = new Set<string>();
    let clusterId = 0;

    // ── Step 1a: Chinese cross-ref clusters (highest confidence) ──
    for (const xref of crossRefMap) {
        const variants: NameVariant[] = [];
        for (const variantName of xref.vietnameseVariants) {
            const nameData = vietnameseNames.find(n => n.name === variantName);
            if (nameData && !assignedNames.has(variantName)) {
                variants.push({
                    name: nameData.name,
                    count: nameData.count,
                    chapters: nameData.chapters,
                    contexts: nameData.contexts,
                    sourceRefs: nameData.sourceRefs,
                });
                assignedNames.add(variantName);
            }
        }
        if (variants.length === 0) continue;

        variants.sort((a, b) => b.count - a.count);

        clusters.push({
            id: `cluster-${++clusterId}`,
            chineseName: xref.chineseName,
            hanViet: xref.hanViet,
            variants,
            suggestedCanonical: variants[0].name,
            totalOccurrences: variants.reduce((sum, v) => sum + v.count, 0),
            isInconsistent: variants.length > 1,
            confidence: 1.0,
        });
    }

    // ── Step 1b: SourceRef-based matching ──
    const unassigned = vietnameseNames.filter(n => !assignedNames.has(n.name));

    const chineseToCluster = new Map<string, number>();
    for (let i = 0; i < clusters.length; i++) {
        if (clusters[i].chineseName) {
            chineseToCluster.set(clusters[i].chineseName!, i);
        }
    }

    for (const nameData of unassigned) {
        if (assignedNames.has(nameData.name)) continue;

        for (const ref of nameData.sourceRefs) {
            if (!ref.chineseParagraph) continue;

            const foundChinese = extractChineseNameFromParagraph(
                ref.chineseParagraph,
                chineseNames
            );
            if (foundChinese && chineseToCluster.has(foundChinese)) {
                const clusterIdx = chineseToCluster.get(foundChinese)!;
                clusters[clusterIdx].variants.push({
                    name: nameData.name,
                    count: nameData.count,
                    chapters: nameData.chapters,
                    contexts: nameData.contexts,
                    sourceRefs: nameData.sourceRefs,
                });
                clusters[clusterIdx].totalOccurrences += nameData.count;
                clusters[clusterIdx].isInconsistent = clusters[clusterIdx].variants.length > 1;
                clusters[clusterIdx].variants.sort((a, b) => b.count - a.count);
                clusters[clusterIdx].suggestedCanonical = clusters[clusterIdx].variants[0].name;
                assignedNames.add(nameData.name);
                break;
            }

            if (foundChinese) {
                const cnData = chineseNames.find(c => c.name === foundChinese);
                clusters.push({
                    id: `cluster-${++clusterId}`,
                    chineseName: foundChinese,
                    hanViet: cnData?.hanViet,
                    variants: [{
                        name: nameData.name,
                        count: nameData.count,
                        chapters: nameData.chapters,
                        contexts: nameData.contexts,
                        sourceRefs: nameData.sourceRefs,
                    }],
                    suggestedCanonical: nameData.name,
                    totalOccurrences: nameData.count,
                    isInconsistent: false,
                    confidence: 0.9,
                });
                chineseToCluster.set(foundChinese, clusters.length - 1);
                assignedNames.add(nameData.name);
                break;
            }
        }
    }

    // ── Step 2: Fuzzy match remaining ──
    const stillUnassigned = vietnameseNames.filter(n => !assignedNames.has(n.name));

    for (const nameData of stillUnassigned) {
        if (assignedNames.has(nameData.name)) continue;

        let bestClusterIdx = -1;
        let bestSimilarity = 0;

        for (let i = 0; i < clusters.length; i++) {
            for (const variant of clusters[i].variants) {
                const sim = normalizedSimilarity(nameData.name, variant.name);
                if (sim >= similarityThreshold && sim > bestSimilarity) {
                    bestSimilarity = sim;
                    bestClusterIdx = i;
                }
            }
        }

        if (bestClusterIdx >= 0) {
            clusters[bestClusterIdx].variants.push({
                name: nameData.name,
                count: nameData.count,
                chapters: nameData.chapters,
                contexts: nameData.contexts,
                sourceRefs: nameData.sourceRefs,
            });
            clusters[bestClusterIdx].totalOccurrences += nameData.count;
            clusters[bestClusterIdx].isInconsistent = true;
            clusters[bestClusterIdx].variants.sort((a, b) => b.count - a.count);
            clusters[bestClusterIdx].suggestedCanonical = clusters[bestClusterIdx].variants[0].name;
            if (clusters[bestClusterIdx].confidence > 0.8) {
                clusters[bestClusterIdx].confidence = 0.8;
            }
            assignedNames.add(nameData.name);
        } else {
            // Create single-name cluster
            clusters.push({
                id: `cluster-${++clusterId}`,
                variants: [{
                    name: nameData.name,
                    count: nameData.count,
                    chapters: nameData.chapters,
                    contexts: nameData.contexts,
                    sourceRefs: nameData.sourceRefs,
                }],
                suggestedCanonical: nameData.name,
                totalOccurrences: nameData.count,
                isInconsistent: false,
                confidence: 0.5,
            });
            assignedNames.add(nameData.name);
        }
    }

    // ── Step 3: Sort — inconsistent first, then by total occurrences ──
    clusters.sort((a, b) => {
        if (a.isInconsistent !== b.isInconsistent) {
            return a.isInconsistent ? -1 : 1;
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
