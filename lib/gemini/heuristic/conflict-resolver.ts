/**
 * conflict-resolver.ts
 * Purpose: ULTRA STRICT - Only keep the best entities.
 */

import { semanticScoreEntity } from './semantic-score';

export enum EntityFinalDecision {
    KEEP = 'keep',
    DOWNGRADE = 'downgrade',
    REJECT = 'reject'
}

export interface ResolverResult {
    decision: EntityFinalDecision;
    score: number;
    reasons: string[];
}

export function resolveEntity(input: {
    text: string;
    frequency: number;
    patternMatched: boolean;
    semanticFlags: any;
}): ResolverResult {

    if (!input.patternMatched) {
        return { decision: EntityFinalDecision.REJECT, score: 0, reasons: ['no_pattern'] };
    }

    const result = semanticScoreEntity({
        text: input.text,
        frequency: input.frequency,
        flags: input.semanticFlags
    });

    const score = result.score;

    // --- ULTRA STRICT GATE (v4.5) ---
    // Goal: Only keep ~500-1000 high-quality entities, reject 95%+

    // 1. Score < 60 = instant reject
    if (score < 60) {
        return { decision: EntityFinalDecision.REJECT, score, reasons: [...result.reasons, 'score_too_low'] };
    }

    // 2. Score 60-69 needs HIGH frequency
    if (score < 70 && input.frequency < 30) {
        return { decision: EntityFinalDecision.REJECT, score, reasons: [...result.reasons, 'weak_and_rare'] };
    }

    // 3. Score >= 70 OR freq >= 100 = KEEP
    if (score >= 70 || input.frequency >= 100) {
        return { decision: EntityFinalDecision.KEEP, score, reasons: result.reasons };
    }

    // 4. Medium confidence = DOWNGRADE (for review)
    return { decision: EntityFinalDecision.DOWNGRADE, score, reasons: result.reasons };
}
