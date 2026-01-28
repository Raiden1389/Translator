import { useState, useCallback } from 'react';
import { NameHunterRegexEngine } from '../services/name-hunter/regex-engine';
import { NameHunterJudge } from '../services/name-hunter/judge';
import { TermCandidate, TermType } from '../services/name-hunter/types';

export function useNameHunter() {
    const [isOpen, setIsOpen] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [candidates, setCandidates] = useState<TermCandidate[]>([]);

    // Initialize services lazily or via singleton if appropriate
    // For now, we instantiate them. In a real app, maybe use a context or DI.
    // Services are lightweight enough to instantiate, but Singletons inside them handle heavy data.

    const scan = useCallback(async (text: string) => {
        setIsScanning(true);
        try {
            const textToScan = text;

            // 2. Extract
            const engine = new NameHunterRegexEngine();
            const rawCandidates = engine.extractCandidates(textToScan);
            console.log(`[NameHunter] Extracted ${rawCandidates.length} raw candidates (before filtering).`);

            // 3. Classify & Filter
            const judge = new NameHunterJudge();
            let kept = 0, junk = 0, unknown = 0;

            const processedCandidates = rawCandidates.map(c => {
                const result = judge.classify(c);
                if (result.type === TermType.Junk) junk++;
                if (result.type === TermType.Unknown) unknown++;
                else kept++;
                return { ...c, type: result.type, confidence: result.score };
            });

            const cleanCandidates = processedCandidates.filter(c => c.type !== TermType.Junk);

            // 4. Enrich with Hán Việt phonetic if Chinese is present (Trace-back disabled as VP is removed)
            const syllRepo = (await import("@/lib/repositories/syllable-repo")).SyllableRepository.getInstance();

            for (const c of cleanCandidates) {
                // If we already have chinese (from somewhere else?), show Hán Việt phonetic
                if (c.chinese) {
                    const hanviet = syllRepo.toHanViet(c.chinese);
                    if (hanviet && hanviet.toLowerCase() !== c.original.toLowerCase()) {
                        c.metadata = { ...c.metadata, hanviet };
                    }
                }
            }

            console.log(`[NameHunter] Filtering Stats: Kept: ${kept}, Junk: ${junk}, Unknown: ${unknown}`);

            setCandidates(cleanCandidates); // Update local state as well
            return cleanCandidates; // RETURN for caller to process further

        } catch (error) {
            console.error("Name Hunter Scan Failed", error);
            return [];
        } finally {
            setIsScanning(false);
        }
    }, []);

    return {
        isOpen,
        setIsOpen,
        isScanning,
        candidates,
        setCandidates,
        scan
    };
}
