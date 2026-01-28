import { TermCandidate, ExtractionConfig, TermType } from './types';

export class NameHunterRegexEngine {
    private config: ExtractionConfig;

    constructor(config: ExtractionConfig = {}) {
        this.config = config;
    }

    public extractCandidates(text: string): TermCandidate[] {
        const words = this._getCapitalizedPhrases(text);
        const filtered = this._filterExampleSentenceStarts(words);
        const counts = this._countFrequency(filtered);

        return Array.from(counts.entries()).map(([word, count]) => ({
            id: `${word}_regex_${Math.random().toString(36).substring(2, 7)}`,
            original: word,
            context: '', // TODO: Add context extraction later
            count,
            type: TermType.Unknown,
            confidence: 50
        })).sort((a, b) => b.count - a.count);
    }

    // Extract capitalized phrases (e.g. "Lâm Phàm", "Thiên Đạo Tông")
    // Allows spaces between capitalized words.
    // Excludes single capitalized words if they look like sentence starts (basic heuristic elsewhere)
    private _getCapitalizedPhrases(text: string): string[] {
        // Regex explanation:
        // \b\p{Lu}\p{L}*            -> Start with any uppercase letter, followed by any letters
        // (?:\s+\p{Lu}\p{L}*)*      -> Optional following words with same pattern
        // The 'u' flag is CRITICAL for Unicode support.

        // Obfuscated to prevent Tailwind JIT from parsing potential "class-like" patterns
        // const regex = /\b\p{Lu}\p{L}*(?:\s+\p{Lu}\p{L}*)*/gu;

        const pattern = "\\b\\p{Lu}\\p{L}*(?:\\s+\\p{Lu}\\p{L}*)*";
        const regex = new RegExp(pattern, "gu");

        return text.match(regex) || [];
    }

    private _filterExampleSentenceStarts(words: string[]): string[] {
        if (!this.config.ignoreSentenceStarts) return words;
        // Simple placeholder: Real implementation needs text context to identify sentence stars
        // For now, we return as is, assuming caller handles strict sentence splitting if needed.
        return words;
    }

    private _countFrequency(words: string[]): Map<string, number> {
        const counts = new Map<string, number>();
        for (const word of words) {
            counts.set(word, (counts.get(word) || 0) + 1);
        }
        return counts;
    }
}
