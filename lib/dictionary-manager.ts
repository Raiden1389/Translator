import { DictionaryEntry } from "./db";

export class DictionaryManager {
    private entries: DictionaryEntry[] = [];
    // Cache sorted keys by length descending for "Longest Match" strategy
    private sortedKeys: string[] = [];

    constructor(entries: DictionaryEntry[]) {
        this.setEntries(entries);
    }

    setEntries(entries: DictionaryEntry[]) {
        this.entries = entries;
        // Sort keys by length descending to ensure longest phrases are matched first
        this.sortedKeys = entries
            .map(e => e.original)
            .sort((a, b) => b.length - a.length);
    }

    getEntry(original: string): DictionaryEntry | undefined {
        return this.entries.find(e => e.original === original);
    }

    /**
     * Parse text into segments of (matched_term | unmatched_text)
     * This is useful for Highlighting.
     */
    tokenize(text: string): { text: string; isEntry?: boolean; translation?: string }[] {
        if (!text) return [];
        if (this.sortedKeys.length === 0) return [{ text }];

        const tokens: { text: string; isEntry?: boolean; translation?: string }[] = [];
        let remaining = text;

        // A simple recursive or iterative approach for Longest Match
        // Optimization: For very large text, this naive approach might be slow. 
        // But for chapter segments it should be fine.

        // We will use a regex constructed from keys for faster matching if possible, 
        // but special chars might be an issue. Let's stick to string searching for stability first.

        // Better approach: Regex with OR pipe sorted by length.
        // Escape regex special characters
        const escapeRegExp = (string: string) => {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        };

        const pattern = this.sortedKeys.map(escapeRegExp).join('|');
        if (!pattern) return [{ text }];

        const regex = new RegExp(`(${pattern})`, 'g');
        const parts = text.split(regex);

        for (const part of parts) {
            if (!part) continue;
            const entry = this.entries.find(e => e.original === part);
            if (entry) {
                tokens.push({ text: part, isEntry: true, translation: entry.translated });
            } else {
                tokens.push({ text: part, isEntry: false });
            }
        }

        return tokens;
    }

    /**
     * Highlight logic is separate from replacement, but share tokenization.
     */

}
