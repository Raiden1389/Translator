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
            // 1. Detect Language & Convert if Chinese
            // Simple heuristic: If > 20% chars are Chinese, assume Chinese input
            // Chinese range: \u4E00-\u9FFF
            const chineseCharCount = (text.match(/[\u4E00-\u9FFF]/g) || []).length;
            const isChinese = chineseCharCount > text.length * 0.2; // 20% threshold

            let textToScan = text;
            if (isChinese) {
                console.log("[NameHunter] Detected Chinese input. Converting to VietPhrase...");
                const vpRepo = (await import("@/lib/repositories/viet-phrase-repo")).VietPhraseRepository.getInstance();
                textToScan = vpRepo.convert(text);
            }

            // 2. Extract
            const engine = new NameHunterRegexEngine();
            const rawCandidates = engine.extractCandidates(textToScan);
            console.log(`[NameHunter] Extracted ${rawCandidates.length} raw candidates (before filtering).`);
            if (rawCandidates.length > 0) {
                console.log("[NameHunter] First 5 raw:", rawCandidates.slice(0, 5).map(c => c.original));
            }

            // 3. Classify & Filter
            const judge = new NameHunterJudge();
            let kept = 0, junk = 0, unknown = 0;

            const processedCandidates = rawCandidates.map(c => {
                const result = judge.classify(c);
                if (result.type === TermType.Junk) junk++;
                if (result.type === TermType.Unknown) unknown++;
                else kept++;
                return { ...c, type: result.type, confidence: result.score };
            }); // We DO NOT filter Junk here anymore, let UI decide to filtering strictly.
            // Actually, keep safe default: Filter explicit Junk.

            const cleanCandidates = processedCandidates.filter(c => c.type !== TermType.Junk);

            // 4. Enrich with Chinese characters & Hán Việt phonetic from local DB (Trace-back)
            const vpRepo = (await import("@/lib/repositories/viet-phrase-repo")).VietPhraseRepository.getInstance();
            const syllRepo = (await import("@/lib/repositories/syllable-repo")).SyllableRepository.getInstance();

            for (const c of cleanCandidates) {
                if (!c.chinese) {
                    const original = vpRepo.findOriginal(c.original);
                    if (original) {
                        c.chinese = original;
                    }
                }

                // If we have chinese, show Hán Việt phonetic if it differs from current name
                if (c.chinese) {
                    const hanviet = syllRepo.toHanViet(c.chinese);
                    if (hanviet && hanviet.toLowerCase() !== c.original.toLowerCase()) {
                        // Store in metadata for display
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
