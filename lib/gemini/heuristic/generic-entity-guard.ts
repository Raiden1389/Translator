import { Candidate } from './tagger';

export enum GenericDecision {
    KEEP = 'KEEP',
    DOWNGRADE = 'DOWNGRADE',
    DROP = 'DROP'
}

export interface GenericGuardResult {
    decision: GenericDecision;
    reason: string;
}

/**
 * GENERIC ENTITY GUARD
 * Purpose: Kill generic titles / ranks / templates even if frequency is high.
 */
export function genericEntityGuard(entity: Candidate): GenericGuardResult {
    const text = entity.original;
    const len = text.length;

    /* =========================
     * 1. GENERIC TITLES (HARD KILL)
     * ========================= */
    const GENERIC_TITLES = new Set([
        '宗师',
        '大宗师',
        '天尊',
        '真王',
        '王',
        '皇',
        '帝',
        '大宗',
        '宗主',
        '教主',
        '老祖'
    ]);

    if (entity.type === 'title') {
        if (GENERIC_TITLES.has(text)) {
            return drop('GENERIC_TITLE_SOLO');
        }

        // Title quá ngắn → không định danh
        if (len <= 2) {
            return drop('TITLE_TOO_SHORT');
        }
    }

    /* =========================
     * 2. SKILL TEMPLATE (DOWNGRADE)
     * ========================= */
    const SKILL_TEMPLATE_SUFFIX = ['阵', '经', '法', '诀', '术', '功'];

    if (entity.type === 'skill') {
        if (
            len <= 3 &&
            SKILL_TEMPLATE_SUFFIX.some(s => text.endsWith(s))
        ) {
            return downgrade('SKILL_TEMPLATE');
        }

        // Cụm động tác phổ thông
        if (/^(一|两|三)?(步|拳|剑|掌|斩)$/.test(text)) {
            return drop('GENERIC_ACTION_SKILL');
        }
    }

    /* =========================
     * 3. GENERIC LOCATION
     * ========================= */
    if (entity.type === 'location') {
        // Địa danh dạng khái niệm
        if (
            /(学府|学院|主府|内城|外城|地界|区域)$/.test(text) &&
            len <= 3
        ) {
            return downgrade('GENERIC_LOCATION');
        }

        // Cụm miêu tả, không phải địa danh
        if (text.startsWith('整片') || text.startsWith('这一')) {
            return drop('DESCRIPTIVE_LOCATION');
        }
    }

    /* =========================
     * 4. GENERIC HUMAN NOUNS
     * ========================= */
    if (entity.type === 'character') {
        const GENERIC_HUMAN = [
            '中年男',
            '青年男',
            '年轻男',
            '老头',
            '黑衣女',
            '白衣女',
            '红裙女',
            '高大男'
        ];

        if (GENERIC_HUMAN.includes(text)) {
            return drop('GENERIC_HUMAN_NOUN');
        }

        // Dạng "秦铭笑着"
        if (/(笑着|说道|冷冷|缓缓)$/.test(text)) {
            return drop('CHARACTER_WITH_VERB_TAIL');
        }
    }

    /* =========================
     * 5. LOW VALUE UNKNOWN
     * ========================= */
    if (entity.type === 'unknown') {
        if (len <= 2) {
            return drop('UNKNOWN_TOO_SHORT');
        }
    }

    return keep();
}

/* =========================
 * Helpers
 * ========================= */
function drop(reason: string): GenericGuardResult {
    return { decision: GenericDecision.DROP, reason };
}

function downgrade(reason: string): GenericGuardResult {
    return { decision: GenericDecision.DOWNGRADE, reason };
}

function keep(): GenericGuardResult {
    return { decision: GenericDecision.KEEP, reason: 'OK' };
}
