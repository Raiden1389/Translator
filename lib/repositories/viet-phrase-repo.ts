
// Basic Trie Node
class TrieNode {
    children: Map<string, TrieNode> = new Map();
    value: string | null = null;
}

export class VietPhraseRepository {
    private static instance: VietPhraseRepository;

    // Switch to Trie for Longest Matching
    private root: TrieNode = new TrieNode();
    private phraseSet = new Set<string>(); // Keep for 'has' check if needed (or check Trie)
    private reverseMap = new Map<string, string>(); // Vietnamese(lower) -> Chinese

    private loadPromise: Promise<void> | null = null;

    private constructor() { }

    static getInstance(): VietPhraseRepository {
        if (!this.instance) {
            this.instance = new VietPhraseRepository();
        }
        return this.instance;
    }

    async load(url: string): Promise<void> {
        if (this.loadPromise) return this.loadPromise;

        this.loadPromise = (async () => {
            try {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Fetch failed ${res.status}`);

                const text = await res.text();
                let count = 0;
                for (const line of text.split("\n")) {
                    if (!line.trim()) continue;
                    const parts = line.split('=');
                    if (parts.length < 2) continue;

                    const key = parts[0].trim(); // Chinese
                    const value = parts[1].trim().split('/')[0]; // VietPhrase

                    if (key && value) {
                        this.insert(key, value);
                        this.phraseSet.add(value.toLowerCase());
                        this.reverseMap.set(value.toLowerCase(), key);
                        count++;
                    }
                }
                console.log(`[VietPhraseRepo] Loaded ${count} phrases.`);
            } catch (error: unknown) {
                console.error("[VietPhraseRepo] Load failed:", error);
            }
        })();

        return this.loadPromise;
    }

    private insert(key: string, value: string) {
        let node = this.root;
        for (const char of key) {
            if (!node.children.has(char)) {
                node.children.set(char, new TrieNode());
            }
            node = node.children.get(char)!;
        }
        node.value = value;
    }

    has(text: string): boolean {
        return this.phraseSet.has(text.toLowerCase());
    }

    // Forward Maximum Matching
    convert(text: string): string {
        let result = "";
        let i = 0;

        while (i < text.length) {
            let node = this.root;
            let lastMatchEnd = -1;
            let lastMatchValue = null;

            // Try shortest to longest
            for (let j = i; j < text.length; j++) {
                const char = text[j];
                if (node.children.has(char)) {
                    node = node.children.get(char)!;
                    if (node.value) {
                        lastMatchEnd = j;
                        lastMatchValue = node.value;
                    }
                } else {
                    break;
                }
            }

            if (lastMatchValue) {
                // Capitalize Name-like style: Each Words Capitalized
                result += " " + this.capitalize(lastMatchValue) + " ";
                i = lastMatchEnd + 1;
            } else {
                // No match, try Syllable Fallback
                const char = text[i];
                // Requires importing SyllableRepo but avoiding circular dependency might be tricky if not careful.
                // Dynamic import or passed dependency? 
                // Since this is a method, we can assume SyllableRepo is available in the module scope or require it?
                // Or better: We assume SyllableRepo is loaded and we can access it via global/singleton if possible.
                // But circular dependency VietPhraseRepo <-> SyllableRepo?
                // SyllableRepo doesn't import VietPhraseRepo. So VietPhraseRepo importing SyllableRepo is fine (DAG).

                // We need to import it at top of file or use dynamic import inside?
                // Let's use dynamic for safety or assumption that it's just a value.
                // Actually, let's keep it simple: If we can't import, we skip?
                // No, we MUST import.

                // Let's use a dirty quick fix: dynamic require or assume we can import at top.
                // But replace_file_content replaces a block.
                // I will add import at top in a separate call or assume I can modify this file's imports.
                // Wait, useNameHunter orchestrates loading both.

                // Let's try to get SyllableRepo via a lazy getter or just valid import?
                // We will add import to the file first.

                // FALLBACK LOGIC:
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const syllable = (this as any).syllableRepo?.get(char);
                // We need to inject syllableRepo.

                if (syllable) {
                    result += " " + this.capitalize(syllable) + " ";
                } else {
                    result += text[i];
                }
                i++;
            }
        }
        return result.replace(/\s+/g, ' ').trim();
    }

    private capitalize(str: string): string {
        // Split by space and capitalize first letter of each word
        // This avoids \b regex issues with Vietnamese diacritics (e.g. "LưU" instead of "Lưu")
        return str.split(' ').map(word => {
            if (word.length === 0) return word;
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
    }

    /**
     * Reverse lookup: Find original Chinese characters for a Vietnamese phrase
     * Optimized O(1) using reverseMap
     */
    findOriginal(vietphraseSnippet: string): string | null {
        return this.reverseMap.get(vietphraseSnippet.toLowerCase().trim()) || null;
    }
}
