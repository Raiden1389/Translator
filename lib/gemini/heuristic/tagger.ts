import {
    SKILL_SUFFIXES,
    LOCATION_SUFFIXES,
    TITLE_SUFFIXES,
    HARD_CHARACTER_ANCHORS,
    SOFT_CHARACTER_ANCHORS,
    SOCIAL_MODIFIERS,
    HEURISTIC_BLACKLIST,
    OCR_CONFUSION_MAP,
    THINKING_VERBS,
    FUNCTION_PREFIXES,
    ACTION_PREFIXES,
    TRAILING_JUNK,
    TRAILING_VERBS,
    GENERIC_META_PATTERNS
} from './patterns';

import { GrammarStripper, GrammarDecision } from './grammar-stripper';

/**
 * 🛰️ HEURISTIC ENGINE v3.1 (MASTER VERSION)
 * Design: Pre-compiled Pipeline Architecture
 * Focus: High performance, semantic confidence, and noise suppression.
 */

export interface Candidate {
    original: string;
    type: 'character' | 'skill' | 'location' | 'title' | 'unknown';
    occurrences: number;
    hasVerbContext: boolean;
    confidence: number; // 📊 New: Dynamic Confidence
    reason: string;
    trace?: string[]; // 💡 Debug Trace Mode
}

export class HeuristicEngine {
    private static instance: HeuristicEngine;
    private static readonly MAX_ITERATIONS = 5;
    private static readonly MIN_CORE_LENGTH = 2;

    // --- PRE-COMPILED ASSETS (FIX #1) ---
    private readonly CHARACTER_RX: RegExp;
    private readonly SKILL_RX: RegExp;
    private readonly LOCATION_RX: RegExp;
    private readonly TITLE_RX: RegExp;

    // --- SORTED POOLS (FIX #3) ---
    private readonly prefixPool: string[];
    private readonly suffixPool: string[];

    // --- O(1) LOOKUPS ---
    private readonly blacklist = new Set(HEURISTIC_BLACKLIST);
    private readonly thinkingVerbs = new Set(THINKING_VERBS);
    private readonly protectedTerms = new Set<string>();

    constructor() {
        // 1. Compile Regex once
        const allAnchors = [...HARD_CHARACTER_ANCHORS, ...SOFT_CHARACTER_ANCHORS, SOCIAL_MODIFIERS];
        this.CHARACTER_RX = new RegExp(`([\\u4e00-\\u9fa5]{2,4})(${allAnchors.join('|')})`, 'g');
        this.SKILL_RX = new RegExp(`[\\u4e00-\\u9fa5]{2,5}[${SKILL_SUFFIXES.join('')}]`, 'g');
        this.LOCATION_RX = new RegExp(`[\\u4e00-\\u9fa5]{2,5}[${LOCATION_SUFFIXES.join('')}]`, 'g');
        this.TITLE_RX = new RegExp(`[\\u4e00-\\u9fa5]{2,6}[${TITLE_SUFFIXES.join('')}]`, 'g');

        // 2. Sort pools by length DESC (Longest Match Wins)
        this.prefixPool = [...new Set([...FUNCTION_PREFIXES, ...ACTION_PREFIXES])]
            .sort((a, b) => b.length - a.length);
        this.suffixPool = [...new Set([...TRAILING_JUNK, ...TRAILING_VERBS])]
            .sort((a, b) => b.length - a.length);
    }

    public static getInstance() {
        if (!this.instance) this.instance = new HeuristicEngine();
        return this.instance;
    }

    /**
     * Set terms that should NOT be modified or rejected
     */
    public setProtectedTerms(terms: string[]) {
        this.protectedTerms.clear();
        terms.forEach(t => this.protectedTerms.add(t));
    }

    /**
     * STAGE 1: RAW EXTRACTION (Optimized)
     */
    public extract(text: string, options?: { enableTrace?: boolean }): Candidate[] {
        if (!text) return [];
        const start = performance.now();
        const found = new Map<string, Candidate>();

        // 💡 Fix: Always reset lastIndex for re-usable global regex
        this.CHARACTER_RX.lastIndex = 0;
        this.SKILL_RX.lastIndex = 0;
        this.LOCATION_RX.lastIndex = 0;
        this.TITLE_RX.lastIndex = 0;

        const addCandidate = (raw: string, type: Candidate['type'], reason: string, hasVerb: boolean) => {
            const trace: string[] = options?.enableTrace ? [`raw: ${raw}`] : [];
            const core = this.process(raw, trace);
            if (!core) return;

            const existing = found.get(core);
            if (existing) {
                existing.occurrences++;
                if (hasVerb) {
                    existing.hasVerbContext = true;
                    // Recalculate confidence if context improved
                    existing.confidence = this.calculateConfidence(core, type, true);
                }
                if (options?.enableTrace && existing.trace) existing.trace.push(`+ repeat from: ${raw}`);
            } else {
                found.set(core, {
                    original: core,
                    type,
                    occurrences: 1,
                    hasVerbContext: hasVerb,
                    confidence: this.calculateConfidence(core, type, hasVerb),
                    reason,
                    trace: options?.enableTrace ? trace : undefined
                });
            }
        };

        let m;
        while ((m = this.CHARACTER_RX.exec(text)) !== null) addCandidate(m[1], 'character', 'Anchor', true);
        while ((m = this.SKILL_RX.exec(text)) !== null) addCandidate(m[0], 'skill', 'Skill', false);
        while ((m = this.LOCATION_RX.exec(text)) !== null) addCandidate(m[0], 'location', 'Location', false);
        while ((m = this.TITLE_RX.exec(text)) !== null) addCandidate(m[0], 'title', 'Title', false);

        const duration = performance.now() - start;
        if (duration > 150) console.warn(`[HeuristicEngine v3.1] Slow extraction: ${duration.toFixed(2)}ms`);

        return Array.from(found.values());
    }

    /**
     * STAGE 2: PROCESSING PIPELINE
     */
    private process(raw: string, trace: string[]): string | null {
        // 0. Whitelist ngược
        if (this.protectedTerms.has(raw)) {
            trace.push('🛡️ PROTECTED: direct keep');
            return raw;
        }

        let core = this.normalize(raw);
        if (core.length < HeuristicEngine.MIN_CORE_LENGTH) return null;

        // 1. Hard Rejects
        if (this.blacklist.has(core)) {
            trace.push('❌ REJECT: blacklisted');
            return null;
        }
        for (const rx of GENERIC_META_PATTERNS) {
            if (rx.test(core)) {
                if (this.protectedTerms.has(core)) {
                    trace.push('🛡️ PROTECTED: override meta-pattern');
                    break;
                }
                trace.push('❌ REJECT: meta-pattern match');
                return null;
            }
        }

        // 2. Structural Cleanup (Strip Noise)
        const stripped = this.stripNoise(core, trace);
        core = stripped;

        if (core.length < HeuristicEngine.MIN_CORE_LENGTH) {
            trace.push('❌ REJECT: too short after strip');
            return null;
        }

        // 3. Logic Rejects
        if (this.isNoisePhrase(core, trace)) return null;

        // 4. Grammar Engine check
        const grammar = GrammarStripper.process(core);
        if (grammar.decision === GrammarDecision.REJECT) {
            trace.push('❌ REJECT: grammar-stripper');
            return null;
        }
        if (grammar.decision === GrammarDecision.STRIP_TAIL) {
            trace.push(`✂️ STRIP: grammar-tail -> ${grammar.cleaned}`);
            core = grammar.cleaned!;
        }

        return core.length >= HeuristicEngine.MIN_CORE_LENGTH ? core : null;
    }

    private normalize(raw: string): string {
        let text = raw.trim();
        for (const [key, val] of Object.entries(OCR_CONFUSION_MAP)) {
            text = text.replaceAll(key, val);
        }
        return text;
    }

    private stripNoise(text: string, trace: string[]): string {
        let cur = text;
        let changed = true;
        let iteration = 0;

        while (changed && iteration < HeuristicEngine.MAX_ITERATIONS && cur.length >= HeuristicEngine.MIN_CORE_LENGTH) {
            changed = false;
            iteration++;

            // 💡 Fix #3: Prefix Pool is pre-sorted DESC (Longest match first)
            for (const p of this.prefixPool) {
                if (cur.startsWith(p) && cur.length >= p.length + HeuristicEngine.MIN_CORE_LENGTH) {
                    if (this.protectedTerms.has(cur)) break;
                    cur = cur.slice(p.length);
                    trace.push(`✂️ STRIP (it:${iteration}): prefix "${p}" -> ${cur}`);
                    changed = true;
                    break;
                }
            }
            if (changed) continue;

            // Suffix Pool
            for (const s of this.suffixPool) {
                if (cur.endsWith(s) && cur.length >= s.length + HeuristicEngine.MIN_CORE_LENGTH) {
                    if (this.protectedTerms.has(cur)) break;
                    cur = cur.slice(0, -s.length);
                    trace.push(`✂️ STRIP (it:${iteration}): suffix "${s}" -> ${cur}`);
                    changed = true;
                    break;
                }
            }
        }

        return cur;
    }

    /**
     * FIX #4: AGGRESSIVE BUCKET WEIGHTS
     */
    private calculateConfidence(core: string, type: Candidate['type'], hasVerb: boolean): number {
        if (type === 'character') {
            // Character with verb context is a "Golden Signal"
            if (hasVerb) return 85;
            // Standard candidate
            return 65;
        }
        if (type === 'title') return core.length >= 4 ? 45 : 35;
        if (type === 'skill') return 40;
        return 30;
    }

    private isNoisePhrase(text: string, trace: string[]): boolean {
        if (this.protectedTerms.has(text)) return false;

        for (const v of this.thinkingVerbs) {
            if (text.startsWith(v)) {
                trace.push(`❌ REJECT: thinking-verb "${v}"`);
                return true;
            }
        }

        if (text.includes('的')) {
            trace.push('❌ REJECT: particle "de" detected');
            return true;
        }

        if (text.startsWith('是') || text.startsWith('就是')) {
            trace.push('❌ REJECT: identity marker');
            return true;
        }

        return false;
    }
}

// 🚩 Legacy export
export const extractCandidates = (text: string) => {
    return HeuristicEngine.getInstance().extract(text).map(c => ({
        original: c.original,
        type: c.type,
        confidence: c.confidence,
        reason: c.reason,
        occurrences: c.occurrences,
        metadata: {
            flags: { hasVerbContext: c.hasVerbContext }
        }
    }));
};
