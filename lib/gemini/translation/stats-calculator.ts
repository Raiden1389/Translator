/**
 * Stats Calculator Module
 * Calculates translation statistics (term usage, character usage, tokens)
 */

import { DictionaryEntry } from "../../db";

export interface TranslationStats {
    terms: number;
    characters: number;
    tokens?: {
        input: number;
        output: number;
        total: number;
    };
}

/**
 * Calculate translation statistics
 * 
 * Metrics:
 * - terms: Number of glossary terms used (excluding character names)
 * - characters: Number of character/name glossary entries used
 * - tokens: Input/output/total token counts (if available)
 */
export function calculateStats(
    translatedText: string,
    relevantDict: DictionaryEntry[],
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number }
): TranslationStats {
    let termUsage = 0;
    let charUsage = 0;

    if (translatedText) {
        const lowerText = translatedText.toLowerCase();
        relevantDict.forEach(d => {
            if (lowerText.includes(d.translated.toLowerCase())) {
                if (d.type === 'character' || d.type === 'name') {
                    charUsage++;
                } else {
                    termUsage++;
                }
            }
        });
    }

    const stats: TranslationStats = {
        terms: termUsage,
        characters: charUsage
    };

    // Add token stats if available
    if (usageMetadata) {
        const inputTokens = usageMetadata.promptTokenCount || 0;
        const outputTokens = usageMetadata.candidatesTokenCount || 0;

        stats.tokens = {
            input: inputTokens,
            output: outputTokens,
            total: inputTokens + outputTokens
        };
    }

    return stats;
}
