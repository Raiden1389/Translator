import {
    THINKING_VERBS,
    FUNCTION_PREFIXES,
    ACTION_PREFIXES,
    RANK_CORE
} from './patterns';

/**
 * RankContextClassifier v2.1
 * TRIẾT LÝ: STRICT OPT-IN + PATTERN MATCHING
 */

export type RankContext =
    | 'TITLE'        // Danh xưng định danh thật (Lôi Đình Vương)
    | 'GENERIC'      // Danh xưng chung chung / tập thể (Noise)
    | 'OBJECT'       // Đối tượng bị tác động (giết tông sư)
    | 'STATEMENT'    // Mệnh đề / trạng thái (là tông sư)
    | 'DESCRIPTIVE'  // Mô tả ngoại hình (hắc y tông sư)
    | 'UNKNOWN';

// FIX #2: Explicit Strict Patterns
const TITLE_WHITELIST_PATTERNS = [
    // Normal: 1-4 chars + rank word
    new RegExp(`^[\\u4e00-\\u9fa5]{1,4}(${RANK_CORE.join('|')})$`),
    // With adjective: 大/小/老 + name + rank word
    new RegExp(`^(大|小|老)[\\u4e00-\\u9fa5]{1,2}(${RANK_CORE.join('|')})$`)
];

// Claude Tip: Explicit Deny Set for performance
const DENY_PREFIXES = new Set(['多', '各', '诸', '一', '几', '位', '个', '种', '其', '此']);

export function classifyRankContext(core: string): RankContext {
    if (!core) return 'GENERIC';
    if (core.includes('的')) return 'DESCRIPTIVE';

    // 1. Phân loại Mệnh đề / Trạng thái (Thinking & Logic)
    const isStatement = [
        ...THINKING_VERBS,
        ...FUNCTION_PREFIXES,
        '是', '就是', '都是', '已', '该', '本'
    ].some(p => core.startsWith(p));

    if (isStatement) return 'STATEMENT';

    // 2. Phân loại Đối tượng (Action context)
    const isObject = ACTION_PREFIXES.some(p => core.startsWith(p));
    if (isObject) return 'OBJECT';

    // 3. Phân loại Miêu tả (Visual)
    if (core.includes('发') || /^[黑白灰青赤金银][衣袍甲衫袖]?/.test(core)) {
        return 'DESCRIPTIVE';
    }

    // 💡 FIX #2: Advanced Pattern Check
    // First, block explicit garbage prefixes
    if (DENY_PREFIXES.has(core[0])) return 'GENERIC';

    // Then, match against strict whitelist
    if (TITLE_WHITELIST_PATTERNS.some(p => p.test(core))) {
        return 'TITLE';
    }

    return 'GENERIC';
}

export function classifyRankContextDebug(core: string) {
    if (!core) return { context: 'GENERIC', rule: 'empty' };
    const ctx = classifyRankContext(core);
    return { context: ctx, rule: ctx === 'TITLE' ? 'whitelist' : 'filtered' };
}
