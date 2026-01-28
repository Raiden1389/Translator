import { useState, useCallback } from 'react';
import { TermCandidate, TermType } from '../services/name-hunter/types';

export function useNameHunter() {
    const [isOpen, setIsOpen] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [candidates, setCandidates] = useState<TermCandidate[]>([]);

    // Initialize services lazily or via singleton if appropriate
    // For now, we instantiate them. In a real app, maybe use a context or DI.
    // Services are lightweight enough to instantiate, but Singletons inside them handle heavy data.

    const scan = useCallback(async (text: string, options?: {
        mode?: 'local' | 'ai',
        allowedTypes?: TermType[],
        customPatterns?: string[],
        onProgress?: (msg: string) => void
    }) => {
        setIsScanning(true);
        const mode = options?.mode || 'local';
        const allowedTypes = options?.allowedTypes || [TermType.Person, TermType.Location, TermType.Organization, TermType.Skill, TermType.Unknown];

        try {
            const isChinese = /[\u4e00-\u9fa5]/.test(text);
            let rawCandidates: TermCandidate[] = [];

            if (mode === 'ai') {
                console.log("[NameHunter] Using AI Extraction Mode...");
                const { AiExtractor } = await import('../services/name-hunter/ai-extractor');
                rawCandidates = await AiExtractor.extract(text, {
                    allowedTypes: allowedTypes,
                    onProgress: options?.onProgress
                });
            } else {
                // LOCAL ENGINE MODE
                if (isChinese) {
                    console.log("[NameHunter] Detected Chinese text. Using ChineseNameEngine...");
                    const { ChineseNameEngine } = await import('../services/name-hunter/chinese-engine');
                    const engine = new ChineseNameEngine();
                    if (options?.customPatterns) {
                        engine.setCustomPatterns(options.customPatterns);
                    }
                    rawCandidates = await engine.extractCandidates(text);
                } else {
                    console.log("[NameHunter] No Chinese detected. Falling back to RegexEngine...");
                    const { NameHunterRegexEngine } = await import('../services/name-hunter/regex-engine');
                    const engine = new NameHunterRegexEngine();
                    rawCandidates = engine.extractCandidates(text);
                }
            }

            console.log(`[NameHunter] Extracted ${rawCandidates.length} raw candidates (before filtering).`);

            // 3. Classify & Filter (Only for Local Mode, AI already classified them)
            const processedCandidates: TermCandidate[] = [];
            if (mode === 'local') {
                const { NameHunterJudge } = await import('../services/name-hunter/judge');
                const judge = new NameHunterJudge();
                let kept = 0, junk = 0, unknown = 0;

                for (const c of rawCandidates) {
                    const result = judge.classify(c);
                    if (result.type === TermType.Junk) junk++;
                    else if (result.type === TermType.Unknown) unknown++;
                    else kept++;
                    processedCandidates.push({ ...c, type: result.type, confidence: result.score });
                }
                console.log(`[NameHunter] Filtering Stats: Kept: ${kept}, Junk: ${junk}, Unknown: ${unknown}`);
            } else {
                // AI results are already typed
                processedCandidates.push(...rawCandidates);
            }

            const cleanCandidates = processedCandidates.filter(c => c.type !== TermType.Junk);

            // 4. Enrich with Hán Việt phonetic & Normalize
            const { SyllableRepository } = await import("@/lib/repositories/syllable-repo");
            const syllRepo = SyllableRepository.getInstance();

            const enrichedCandidates = cleanCandidates.map(c => {
                const isOriginalChinese = /[\u4e00-\u9fa5]/.test(c.original);
                const sourceForHanViet = isOriginalChinese ? c.original : c.chinese;

                if (!sourceForHanViet) return c;

                const hanviet = syllRepo.toHanViet(sourceForHanViet);
                if (!hanviet) return c;

                const result = { ...c };

                // If original is Chinese, let's make it the Hán Việt and keep Chinese in chinese field
                if (isOriginalChinese) {
                    result.original = hanviet;
                    if (!result.chinese) result.chinese = sourceForHanViet;
                } else if (hanviet.toLowerCase() !== c.original.toLowerCase()) {
                    // It's already HV but maybe we want to keep the metadata for display
                    result.metadata = { ...result.metadata, hanviet };
                }

                return result;
            });

            setCandidates(enrichedCandidates);
            return enrichedCandidates;

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
