/**
 * HEURISTIC UTILITIES v1.0
 * Purpose: Fuzzy matching and text normalization for entities.
 */

/**
 * Jaro-Winkler Similarity Algorithm
 * Returns a score between 0 (completely different) and 1 (identical).
 */
export function calculateSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1.0;

    const len1 = s1.length;
    const len2 = s2.length;
    if (len1 === 0 || len2 === 0) return 0.0;

    const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
    const matches1 = new Array(len1).fill(false);
    const matches2 = new Array(len2).fill(false);

    let matches = 0;
    for (let i = 0; i < len1; i++) {
        const start = Math.max(0, i - matchWindow);
        const end = Math.min(i + matchWindow + 1, len2);
        for (let j = start; j < end; j++) {
            if (matches2[j]) continue;
            if (s1[i] === s2[j]) {
                matches1[i] = true;
                matches2[j] = true;
                matches++;
                break;
            }
        }
    }

    if (matches === 0) return 0.0;

    let transpositions = 0;
    let k = 0;
    for (let i = 0; i < len1; i++) {
        if (!matches1[i]) continue;
        while (!matches2[k]) k++;
        if (s1[i] !== s2[k]) transpositions++;
        k++;
    }

    const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

    // Winkler adjustment
    const prefixLimit = 4;
    let prefix = 0;
    for (let i = 0; i < Math.min(len1, len2, prefixLimit); i++) {
        if (s1[i] === s2[i]) prefix++;
        else break;
    }

    return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Auto-format string to Title Case (Giáng Long Thập Bát Chưởng)
 */
export function toTitleCase(text: string): string {
    if (!text) return '';
    return text
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

import { SyllableRepository } from '../../repositories/syllable-repo';

/**
 * Han Viet Suggester using local dictionary (SyllableRepository)
 */
export function suggestHanViet(chinese: string): string {
    try {
        const repo = SyllableRepository.getInstance();
        return repo.toHanViet(chinese);
    } catch {
        // Fallback to original if loading or repo fails
        return chinese;
    }
}
