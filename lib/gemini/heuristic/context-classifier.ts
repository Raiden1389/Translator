/**
 * RankContextClassifier - BẢN FIX (v1.6)
 * TRIẾT LÝ: ĐẢO NGƯỢC THIẾT KẾ (Strict Opt-in)
 */

export type RankContext =
    | 'TITLE'        // Danh xưng định danh thật (Lôi Đình Vương)
    | 'GENERIC'      // Danh xưng chung chung / tập thể (Noise)
    | 'OBJECT'       // Đối tượng bị tác động (giết tông sư)
    | 'STATEMENT'    // Mệnh đề / trạng thái (là tông sư)
    | 'DESCRIPTIVE'  // Mô tả ngoại hình (hắc y tông sư)
    | 'UNKNOWN';

const RANK_CORE_FOR_REGEX = '宗师|大宗师|王|尊者|圣者|圣徒|帝|皇|祖|主|会长|长老|教主';

/**
 * TITLE WHITELIST PATTERN
 * Điều kiện: Phải khớp cấu trúc Rank Novel và TUYỆT ĐỐI KHÔNG chứa chữ '的'
 */
const TITLE_WHITELIST_PATTERNS = [
    new RegExp(`^[\\u4e00-\\u9fa5]{1,4}(${RANK_CORE_FOR_REGEX})$`),
];

export function classifyRankContext(core: string): RankContext {
    if (!core) return 'GENERIC';

    // 🔴 TRẢM NGAY: Tất cả các ca dính chữ '的' (sở hữu/mô tả)
    // VD: 教的宗师, 织的圣徒, 俑的圣徒...
    if (core.includes('的')) return 'DESCRIPTIVE';

    // 1. Lọc GENERIC (Tập thể / Chung chung)
    if (
        core.startsWith('多') ||
        core.startsWith('几') ||
        core.startsWith('都') ||
        core.startsWith('这些') ||
        core.startsWith('所有') ||
        core.startsWith('这个') ||
        core.startsWith('诸') ||
        core.endsWith('们')
    ) return 'GENERIC';

    // 2. Lọc STATEMENT (Mệnh đề / Trạng thái)
    if (
        core.startsWith('是') ||
        core.startsWith('就是') ||
        core.startsWith('都是') ||
        core.startsWith('已是') ||
        core.startsWith('现在') ||
        core.startsWith('本') ||
        core.startsWith('该')
    ) return 'STATEMENT';

    // 3. Lọc DESCRIPTIVE (Mô tả ngoại hình/trạng thái bằng tính từ)
    if (
        core.includes('发') || // 银发宗师
        core.startsWith('大') || // 大宗师 (nhưng pattern whitelist sẽ bắt nếu là title)
        /^[黑白灰青赤金银][衣袍甲衫袖]?(宗师|王|尊者|帝|圣徒)$/.test(core)
    ) {
        // Ngoại lệ: Nếu là "Đại Tông Sư" thì vẫn là title, nhưng "Đại Vương" (theo nghĩa mô tả) thì xem xét.
        // Hiện tại cứ cho qua whitelist filter sau.
        return 'DESCRIPTIVE';
    }

    // 4. Lọc OBJECT (Đối tượng bị tác động)
    if (
        core.startsWith('杀') ||
        core.startsWith('斩') ||
        core.startsWith('击杀') ||
        core.startsWith('对') ||
        core.startsWith('破') ||
        core.startsWith('踏')
    ) return 'OBJECT';

    if (core.startsWith('不') || core.startsWith('低于') || core.startsWith('比肩')) {
        return 'OBJECT';
    }

    // ✅ CHỐT: Chỉ khi khớp Whitelist mới là TITLE
    if (TITLE_WHITELIST_PATTERNS.some(p => p.test(core))) {
        // Double check: Vẫn không cho phép chữ '的' lọt vào Title
        if (!core.includes('的')) {
            return 'TITLE';
        }
    }

    return 'GENERIC';
}

export function classifyRankContextDebug(core: string) {
    if (!core) return { context: 'GENERIC', rule: 'empty' };
    const ctx = classifyRankContext(core);
    return { context: ctx, rule: ctx === 'TITLE' ? 'whitelist' : 'filtered' };
}
