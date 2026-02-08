/**
 * Glossary Builder Module
 * Handles dictionary loading, merging, and context building
 */

import { db, DictionaryEntry } from "../../db";

export interface GlossaryResult {
    relevantDict: DictionaryEntry[];
    glossaryContext: string;
}

/**
 * Build glossary context from manual dictionary + heuristic terms
 * 
 * Features:
 * - 2-layer dictionary system (Manual + Heuristic)
 * - Blacklist filtering
 * - Relevance filtering (only terms that appear in text)
 * - Sorted by length (longest first for better matching)
 * - Limited to 50 terms to avoid prompt bloat
 */
export async function buildGlossary(
    workspaceId: string,
    text: string,
    sharedGlossary?: DictionaryEntry[]
): Promise<GlossaryResult> {
    let relevantDict: DictionaryEntry[] = [];

    if (sharedGlossary && sharedGlossary.length > 0) {
        // Use shared glossary (for batch translation)
        relevantDict = sharedGlossary;
    } else {
        // 🔥 2-LAYER DICTIONARY SYSTEM
        // Layer 1: Manual Dictionary (Highest priority - user control)
        const manualDict = await db.dictionary.where('workspaceId').equals(workspaceId).toArray();

        // Layer 2: Heuristic Dictionary (Auto-suggest - only approved terms)
        const heuristicDict = await db.heuristicTerms
            .where('workspaceId').equals(workspaceId)
            .and(t => t.isApproved === true)
            .toArray();

        // Merge: Layer 1 overrides Layer 2
        const combined: DictionaryEntry[] = [...manualDict];
        const manualWords = new Set(manualDict.map(d => d.original.toLowerCase()));

        heuristicDict.forEach(h => {
            if (!manualWords.has(h.original.toLowerCase())) {
                combined.push({
                    id: h.id,
                    workspaceId: h.workspaceId,
                    original: h.original,
                    translated: h.translated || h.original, // Fallback to original
                    type: h.type || 'character',
                    createdAt: h.createdAt
                });
            }
        });

        const blacklist = await db.blacklist.where('workspaceId').equals(workspaceId).toArray();
        const blockedWords = new Set(blacklist.map(b => b.word.toLowerCase()));

        // Filter glossary: Remove blacklisted, only keep terms that appear, LIMIT 50 terms
        relevantDict = combined
            .filter(d => !blockedWords.has(d.original.toLowerCase()) && text.includes(d.original))
            .sort((a, b) => b.original.length - a.original.length)
            .slice(0, 50);
    }

    const glossaryContext = relevantDict.length > 0
        ? `\nGlossary: ${relevantDict.map(d => `${d.original}=${d.translated}`).join(', ')}`
        : '';

    return { relevantDict, glossaryContext };
}
