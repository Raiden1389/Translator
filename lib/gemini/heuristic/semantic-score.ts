/**
 * semantic-score.ts
 * Purpose: ULTRA STRICT scoring with heavy function word penalties.
 */

export interface SemanticScoreResult {
    score: number;
    reasons: string[];
}

const BASE_SCORE = 30;

const BONUS = {
    lengthGood: 10,
    rareChar: 15,
    actionContext: 10,
    cleanCandidate: 15,
    tierCompound: 20,
};

const PENALTY = {
    genericTerm: -20,
    functionWord: -80,      // Increased from -50
    determiner: -80,        // Increased from -50
    tooLong: -30,
    composite: -40,
    abstractTrap: -25,
    startsWithJunk: -90,    // NEW: Starts with function word
};

// Expanded function words
const FUNCTION_WORDS = ['已经', '曾经', '有人', '没有', '一位', '位', '他', '她', '的', '了', '在', '和', '与'];

export function semanticScoreEntity(input: {
    text: string;
    frequency: number;
    flags: any;
}): SemanticScoreResult {

    let score = BASE_SCORE;
    const reasons: string[] = [];

    // 1. INSTANT KILL for junk starters
    for (const junk of FUNCTION_WORDS) {
        if (input.text.startsWith(junk)) {
            score += PENALTY.startsWithJunk;
            reasons.push('starts_with_junk');
            break;
        }
    }

    // 2. Length
    if (input.text.length > 6) {
        score += PENALTY.tooLong;
        reasons.push('too_long');
    } else if (input.text.length >= 2 && input.text.length <= 4) {
        score += BONUS.lengthGood;
        reasons.push('good_length');
    }

    // 3. Rare chars
    if (/[尸王宗阁技阵经诀殿宫神圣府院寺]/.test(input.text)) {
        score += BONUS.rareChar;
        reasons.push('rare_char');
    }

    // 4. Fatal penalties
    if (input.flags.isFunctionWord || input.flags.isBlacklisted) {
        score += PENALTY.functionWord;
        reasons.push('blacklisted');
    }

    if (input.flags.isComposite) {
        score += PENALTY.composite;
        reasons.push('composite');
    }

    // 5. Positive signals
    if (input.flags.hasVerbContext) {
        score += BONUS.actionContext;
        reasons.push('verb_context');
    }

    if (!input.flags.isFunctionWord && !input.flags.isBlacklisted) {
        score += BONUS.cleanCandidate;
        reasons.push('clean');
    }

    // 6. Frequency boost (capped)
    if (input.frequency >= 100) {
        score += 20;
        reasons.push('very_frequent');
    } else if (input.frequency >= 50) {
        score += 10;
        reasons.push('frequent');
    }

    // 7. STRICT CAP (0-100)
    score = Math.max(0, Math.min(100, score));

    return { score, reasons };
}
