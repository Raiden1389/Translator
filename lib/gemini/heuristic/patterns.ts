/**
 * HEURISTIC PATTERNS v5.1 - THE MASTER FILTER
 * Design Philosophy: STRICT OPT-IN, AGGRESSIVE NOISE SUPPRESSION.
 */

// 1. Structural Kernels (Core of what makes an entity)
export const RANK_CORE = [
    '宗师', '大宗师', '王', '霸王', '圣者', '尊者', '帝', '皇', '主', '祖',
    '会长', '长老', '教主', '宗主', '传人', '公子', '小姐', '少主', '少宗主'
];

export const SKILL_SUFFIXES = [
    '功', '诀', '法', '步', '术', '拳', '掌', '剑', '阵', '经', '典', '指', '印',
    '击', '斩', '破', '杀', '爆', '轰', '裂', '灭', '封', '镇', '禁'
];

export const LOCATION_SUFFIXES = [
    '城', '府', '山', '谷', '洞', '宫', '殿', '宗', '门', '閣', '院', '寺',
    '岛', '界', '域', '海', '墟', '江', '湖', '岭', '峰'
];

export const TITLE_SUFFIXES = ['主', '长', '座', '王', '皇', '帝', '祖', '师', '尊', '姑', '姨', '妾', '子', '少', '爷'];

// 2. Context Anchors (Detection triggers)
export const HARD_CHARACTER_ANCHORS = ['说道', '笑道', '喝道', '怒道', '问道', '答道', '冷声', '沉声', '低声', '传音', '吐口', '开口'];
export const SOFT_CHARACTER_ANCHORS = ['看向', '走来', '点头', '摇头', '叹息', '冷笑', '皱眉', '跨步', '跃起', '走入', '凝視'];
export const SOCIAL_MODIFIERS = ['公', '子', '小姐', '夫人', '老爷', '少爷', '阿婆', '阿公', '大叔', '大婶', '殿下', '陛下'];

// 3. Negative Filters: Prefix Noise (Reject if entity starts with these)
export const THINKING_VERBS = [
    '以为', '认为', '所谓', '称为', '成了', '监听', '返回', '通往',
    '发觉', '觉得', '发现', '看到', '见到', '听到', '想到', '意识到', '感觉到'
];

export const FUNCTION_PREFIXES = [
    '这', '那', '你', '我', '他', '她', '它', '若', '如', '其', '此', '该', '本',
    '各', '诸', '每', '某', '有的', '所有', '一个', '一群', '这位', '那位', '这尊',
    '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '万',
    '向', '自', '对于', '关于', '甚至', '尽管', '虽然', '即使', '既然', '毕竟',
    '便', '却', '也', '但', '竟', '就', '连', '都', '并', '而', '已', '曾', '将', '被',
    '当年', '那时', '当时', '当初', '后来', '之前', '之后', '今', '及',
    '没有', '没', '无', '非', '不', '两人', '几个', '所有', '全部', '一些'
];

export const ACTION_PREFIXES = [
    '监', '返', '听', '通', '要', '在', '进', '到', '入', '出', '斩', '杀', '破',
    '追', '随', '让', '给', '被', '为', '使', '令', '对', '向', '还', '把', '看'
];

// 4. Negative Filters: Suffix Noise (Strip or Reject)
export const TRAILING_JUNK = [
    '里', '中', '内', '外', '上', '下', '前', '后', '左', '右', '旁', '侧',
    '般', '样', '类', '似', '的话', '而言', '之中', '之外', '之内',
    '院', '府', '家', '院子', '宅院', '前院', '后院', '宅邸', '府邸', '门前', '们'
];

export const TRAILING_VERBS = [
    '笑着', '笑道', '说罢', '走来', '过去', '缓缓', '慢慢', '轻轻', '悄悄', '默默',
    '站', '坐', '走', '跑', '看', '听', '说', '想', '做', '问', '答', '笑'
];

// 5. Global Blacklist (Direct discard)
export const HEURISTIC_BLACKLIST = [
    '其实', '实际上', '毕竟', '恐怕', '不然', '不过', '依然', '然而', '反而', '此外',
    '这个时候', '此时', '此刻', '某种', '某种程度上', '之所以', '不仅仅', '除此之外',
    '第一', '第二', '最后', '当初', '以前', '之后', '之前', '周围', '附近',
    '甚至', '虽然', '即使', '既然', '由于', '因此', '所以', '虽然', '但是', '而且',
    '已经', '曾经', '应该', '原来', '原本', '本来', '通常', '经常', '一般', '正经',
    '经历', '经验', '竟然', '毕竟', '依然', '因为', '所以', '如果', '但是'
];

// 6. Generic Meta-Patterns (Reject if match)
export const GENERIC_META_PATTERNS = [
    /[一二三四五六七八九十百千]+[阶层级品境重]/,
    /^[大中小老太].{0,3}(王|帝|祖|主|师)$/,
    /^[黑白灰青赤金银][衣袍甲衫袖]?(宗师|尊者|圣徒|王|帝|皇|祖)$/
];

export const OCR_CONFUSION_MAP: Record<string, string> = {
    'l': '一', '丨': '一', '工': '功', '未': '末', '土': '士', '日': '目'
};

// --- LEGACY ADAPTOR (For older components) ---
export const ROLE_NOUNS = ['队长', '首领', '管家', '伙计', '掌柜', '小二', '夫人', '公子', '小姐', '少主'];
export const FUNCTION_WORDS = HEURISTIC_BLACKLIST;
export const COMPOSITE_MARKERS = ['和', '与', '以及', '跟', '及', '同', '或者', '还是'];
export const SKILL_SUFFIXES_ARR = SKILL_SUFFIXES;
export const LOCATION_SUFFIXES_ARR = LOCATION_SUFFIXES;
export const TITLE_SUFFIXES_ARR = TITLE_SUFFIXES;
export const COMMON_FUNCTION_WORDS = HEURISTIC_BLACKLIST;
