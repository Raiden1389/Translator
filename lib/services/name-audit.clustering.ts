/**
 * 🔍 Name Audit — Clustering Engine (Phase 02)
 *
 * Groups similar Vietnamese name variants into clusters.
 * Uses Chinese cross-ref (highest confidence) + fuzzy Levenshtein matching.
 */

import type {
    NameScanResult,
    NameCluster,
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
    const { vietnameseNames } = scanResult;

    const clusters: NameCluster[] = [];
    const assignedNames = new Set<string>();
    let clusterId = 0;

    // ── Step 1a & 1b: Chinese cross-ref clusters — DISABLED ──
    // Paragraph alignment between CN original and VN translation is unreliable
    // (HTML artifacts like <div class="contentadv"></div> cause index offset,
    // making cross-ref map wrong → false cluster merges).
    // Only Levenshtein fuzzy matching is used for clustering now.
    // Chinese name data is still extracted and shown in UI for reference.

    // ── Step 2: Fuzzy match all names by Levenshtein similarity ──
    const allNames = vietnameseNames.filter(n => !assignedNames.has(n.name));

    for (const nameData of allNames) {
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
