// lib/gemini/heuristic/grammar-stripper.ts

export enum GrammarDecision {
    KEEP = 'KEEP',
    STRIP_TAIL = 'STRIP_TAIL',
    REJECT = 'REJECT'
}

export interface GrammarResult {
    decision: GrammarDecision;
    cleaned?: string;
    reason?: string;
}

/**
 * GrammarStripper
 * Purpose:
 * - Remove grammar tails accidentally glued to entities
 * - Reject pure grammar / grammar-contaminated phrases
 */
export class GrammarStripper {
    // 🔴 Pure grammar / adverbs / aspect particles
    private static readonly GRAMMAR_WORDS = [
        '已经', '正在', '开始', '忽然', '立刻', '顿时',
        '缓缓', '慢慢', '随后', '当即', '此时',
        '终于', '立马', '很快', '不由', '直接'
    ];

    // 🔴 Verb / action tails commonly glued
    private static readonly VERB_TAILS = [
        '说道', '笑着', '喝道', '冷笑', '开口',
        '踏出', '走出', '走来', '走去',
        '看向', '望向', '冲出', '杀出',
        '大步', '一步', '迈步'
    ];

    // 🔴 Sentence particles / function endings
    private static readonly FUNCTION_TAILS = [
        '的时候', '之时', '之后', '之前',
        '当中', '之中', '里面'
    ];

    // 🔴 Head grammar (almost always reject)
    private static readonly GRAMMAR_HEADS = [
        '忽然', '突然', '这时', '此时',
        '随后', '当即'
    ];

    static process(term: string): GrammarResult {
        const raw = term.trim();
        if (!raw) {
            return { decision: GrammarDecision.REJECT, reason: 'EMPTY' };
        }

        // 1️⃣ Reject pure grammar
        if (this.GRAMMAR_WORDS.includes(raw)) {
            return { decision: GrammarDecision.REJECT, reason: 'PURE_GRAMMAR' };
        }

        // 2️⃣ Reject grammar head
        for (const h of this.GRAMMAR_HEADS) {
            if (raw.startsWith(h)) {
                return { decision: GrammarDecision.REJECT, reason: 'GRAMMAR_HEAD' };
            }
        }

        // 3️⃣ Strip grammar / verb tails
        let cleaned = raw;
        let stripped = true;
        let safety = 5;

        while (stripped && safety-- > 0) {
            stripped = false;

            for (const t of [
                ...this.GRAMMAR_WORDS,
                ...this.VERB_TAILS,
                ...this.FUNCTION_TAILS
            ]) {
                if (cleaned.endsWith(t) && cleaned.length > t.length + 1) {
                    cleaned = cleaned.slice(0, -t.length);
                    stripped = true;
                    break;
                }
            }
        }

        // 4️⃣ After strip sanity check
        if (cleaned.length < 2) {
            return {
                decision: GrammarDecision.REJECT,
                reason: 'TOO_SHORT_AFTER_STRIP'
            };
        }

        if (cleaned !== raw) {
            return {
                decision: GrammarDecision.STRIP_TAIL,
                cleaned,
                reason: 'GRAMMAR_TAIL_STRIPPED'
            };
        }

        // 5️⃣ Safe
        return { decision: GrammarDecision.KEEP };
    }
}
