/**
 * Glossary Service
 * 
 * Builds a shared, frozen glossary from dictionary + heuristic terms.
 * Extracted from TranslationProvider to make it reusable and testable.
 */

import { db, DictionaryEntry } from "@/lib/db";
import type { Chapter } from "@/lib/db";

/**
 * Build a shared glossary for translation from all sources:
 * - Manual dictionary entries (highest priority)
 * - Approved heuristic terms (AI-detected, user-approved)
 * - Filtered by blacklist
 * - Filtered by presence in chapter content
 * 
 * @returns Frozen array of DictionaryEntry (max 100 entries)
 */
export async function buildSharedGlossary(
  workspaceId: string,
  chapters: Chapter[]
): Promise<readonly DictionaryEntry[]> {
  const allOriginalText = chapters.map(c => c.content_original).join("\n\n");

  // Load from all sources
  const dict = await db.dictionary.where('workspaceId').equals(workspaceId).toArray();
  const heuristicTerms = await db.heuristicTerms
    .where('workspaceId')
    .equals(workspaceId)
    .filter(h => h.isApproved === true)
    .toArray();

  const blacklist = await db.blacklist.where('workspaceId').equals(workspaceId).toArray();
  const blockedWords = new Set(blacklist.map(b => b.word.toLowerCase()));

  // Convert heuristicTerms to DictionaryEntry format (preserve occurrences for sorting)
  const heuristicAsDict = heuristicTerms.map(h => ({
    id: h.id,
    workspaceId: h.workspaceId,
    original: h.original,
    translated: h.translated,
    type: h.type === 'character' ? 'character' : 'term',
    occurrences: h.occurrences || 0,
    createdAt: h.createdAt
  }));

  // Manual entries always have highest priority
  const manualAsDict = dict.map(d => ({
    ...d,
    occurrences: 999999
  }));

  // Merge both sources (deduplicate by original, manual wins)
  const mergedDict = [...manualAsDict, ...heuristicAsDict];
  const uniqueDict = Array.from(
    new Map(mergedDict.map(item => [item.original.toLowerCase(), item])).values()
  );

  const sharedGlossary = uniqueDict
    .filter(d => !blockedWords.has(d.original.toLowerCase()) && allOriginalText.includes(d.original))
    .sort((a: DictionaryEntry & { occurrences?: number }, b: DictionaryEntry & { occurrences?: number }) => {
      // Priority 1: Characters always above terms
      if (a.type === 'character' && b.type !== 'character') return -1;
      if (a.type !== 'character' && b.type === 'character') return 1;

      // Priority 2: Character with more occurrences (frequency) is higher
      if (a.type === 'character' && b.type === 'character') {
        return (b.occurrences || 0) - (a.occurrences || 0);
      }

      // Priority 3: Longest original text first (standard matching)
      return b.original.length - a.original.length;
    })
    .slice(0, 100);

  // FREEZE to prevent accidental mutations (defense in depth)
  Object.freeze(sharedGlossary);

  console.log(`[GLOSSARY] Loaded ${dict.length} dict + ${heuristicTerms.length} heuristic = ${sharedGlossary.length} final terms`);

  return sharedGlossary;
}
