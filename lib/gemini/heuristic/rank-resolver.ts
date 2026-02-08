import { classifyRankContext, RankContext } from './context-classifier';

/**
 * RankResolver vFINAL – Tiên Hiệp Stable (v1.5)
 * ARCHITECTURE:
 * 1. Shape Resolver (Pure shape detection)
 * 2. Context Classifier (External Module - Strict Opt-in)
 * 3. Final Evaluator (Keep Title/ProperName | Drop All Noise)
 */

export type RankResolveResult = 'KEEP' | 'RANK';

// Danh sách các hậu tố Rank phổ biến
const RANK_CORE = [
    '宗师', '大宗师', '王', '霸王', '圣者', '尊者', '帝', '皇', '主', '祖', '会长', '长老', '教主', '宗主',
    '太上长老', '客卿', '供奉', '门主', '殿主', '府主', '阁主', '岛主', '传人', '夫人', '小妾', '公子', '小姐', '少主', '少宗主'
];

const IMMUNE_SET = new Set(['妖魔王', '牛魔王', '精灵女王', '黄金妖王', '白衣圣徒', '秦王', '冥王', '龙王', '夜神', '帝尊']);

/**
 * 1. SHAPE RESOLVER
 * Xác định xem một cụm từ có mang hình dáng của một chức danh (Rank) hay không.
 */
export function resolveRankShape(core: string): RankResolveResult {
    if (!core) return 'RANK';

    const foundRank = RANK_CORE.find(r => core.endsWith(r));

    // Nếu không kết thúc bằng Rank Core -> Khả năng cao là Tên Riêng (Proper Name)
    if (!foundRank) return 'KEEP';

    // King rule: Chữ Vương đứng linh tinh (1 chữ hoặc prefix rác)
    if (foundRank === '王') {
        if (core.length < 2) return 'RANK';
        const junkKings = ['是', '位', '个', '有', '那', '便', '才', '为', '到', '叫', '以', '任', '所', '称', '成', '监', '返', '听', '在', '要', '通'];
        if (junkKings.some(p => core.startsWith(p))) return 'RANK';
    }

    return 'RANK'; // Xác định đây là một cụm Rank
}

/**
 * 2. FINAL EVALUATOR (resolveRankV18)
 * Áp dụng triết lý "TITLE PHẢI LÀ OPT-IN":
 * - Nếu là Tên Riêng (không có rank shape) -> Giữ (KEEP).
 * - Nếu có Rank Shape -> Phải vượt qua Context Classifier với kết quả duy nhất là 'TITLE'.
 */
export function resolveRankV18(core: string): RankResolveResult {
    // A. Nếu là Tên Riêng (không chứa hậu tố Rank) -> Giữ để Tagger/Scanner xử lý tiếp.
    const shape = resolveRankShape(core);
    if (shape === 'KEEP') return 'KEEP';

    // B. Nếu có Rank Shape (vd: 银发宗师, Lôi Đình Vương)
    // Phân loại ngữ cảnh cực kỳ khắt khe (Mặc định là GENERIC/Rác)
    const ctx = classifyRankContext(core);

    // C. CHỈ NHỮNG THỨ ĐƯỢC XÁC NHẬN LÀ TITLE THÌ MỚI GIỮ
    if (ctx === 'TITLE') {
        return 'KEEP';
    }

    // D. Immunity: Ngoại lệ cho một số Boss cực kỳ phổ biến dính rác
    // Chỉ áp dụng nếu nó là Boss nằm trong list bất tử.
    if (IMMUNE_SET.has(core)) {
        return 'KEEP';
    }

    // E. Mọi trường hợp khác (Generic, Object, Statement, Descriptive) -> TRẢM
    // console.log('[RankResolver] 🗑️ TRẢM (v1.5 - Strict):', core, `(${ctx})`);
    return 'RANK';
}

/**
 * Tiền tố động từ cần lột bỏ (Dành cho Tagger làm sạch Core)
 */
export const VERB_PREFIX_STRIP = [
    '到', '用', '过', '去', '来', '骑', '乘', '走', '让', '给', '被', '为', '使', '令',
    '持', '握', '拿', '带', '背', '负', '驭', '御', '催', '驱', '引', '动', '夺', '抢',
    '监', '返', '听', '在', '要', '通', '向', '还'
];

export function resolveRankLite(core: string): RankResolveResult {
    return resolveRankV18(core);
}

export function resolveRank(): null { return null; }
export function shouldMergeRankAlias(): boolean { return false; }
export function extractEntityBase(): null { return null; }
export { classifyRankContext };
export type { RankContext };
