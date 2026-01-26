
export class SyllableRepository {
    private static instance: SyllableRepository;

    private syllableMap = new Map<string, string>();
    private validSyllables = new Set<string>();
    private loadPromise: Promise<void> | null = null;

    private constructor() { }

    static getInstance(): SyllableRepository {
        if (!this.instance) {
            this.instance = new SyllableRepository();
        }
        return this.instance;
    }

    async load(url: string): Promise<void> {
        if (this.loadPromise) return this.loadPromise;

        this.loadPromise = (async () => {
            try {
                const res = await fetch(url);
                if (!res.ok) {
                    throw new Error(`Fetch failed ${res.status}: ${res.statusText}`);
                }

                const text = await res.text();
                for (const line of text.split("\n")) {
                    if (!line.trim()) continue;

                    const parts = line.split('=');
                    if (parts.length < 2) continue;

                    const chineseChar = parts[0].trim();
                    const syllables = parts[1].trim();
                    const primarySyllable = syllables.split('/')[0].split(',')[0].trim();

                    if (chineseChar && primarySyllable) {
                        this.syllableMap.set(chineseChar, primarySyllable);

                        for (const s of syllables.split(/[,/]/)) {
                            if (s.trim()) this.validSyllables.add(s.trim().toLowerCase());
                        }
                    }
                }

                console.log(
                    `[SyllableRepository] Loaded ${this.syllableMap.size} chars, ${this.validSyllables.size} syllables.`
                );
            } catch (err) {
                console.error("[SyllableRepository] Load failed:", err);
            }
        })();

        return this.loadPromise;
    }

    get(char: string): string | undefined {
        return this.syllableMap.get(char);
    }

    isValidSyllable(s: string): boolean {
        return this.validSyllables.has(s.toLowerCase());
    }

    isValidTerm(term: string): boolean {
        return term
            .split(/\s+/)
            .every(w => this.isValidSyllable(w));
    }

    /**
     * Converts Chinese text to Syllable-by-Syllable Hán Việt
     */
    toHanViet(chinese: string): string {
        return Array.from(chinese)
            .map(char => {
                const s = this.get(char);
                if (s) {
                    return s.charAt(0).toUpperCase() + s.slice(1);
                }
                return char;
            })
            .join(' ');
    }
}
