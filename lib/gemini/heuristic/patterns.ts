/**
 * HEURISTIC PATTERNS v4.2 - PROFESSIONAL NOISE FILTER
 * Purpose: Aggressive noise suppression for high-quality glossary extraction.
 */

// 1. Core Suffixes
export const SKILL_SUFFIXES = ['功', '诀', '法', '步', '术', '拳', '掌', '剑', '阵', '经', '典', '指', '印'];
export const LOCATION_SUFFIXES = ['城', '府', '山', '谷', '洞', '宫', '殿', '宗', '门', '阁', '院', '寺', '岛', '界', '域', '海', '墟', '江', '湖', '岭', '峰'];
export const TITLE_SUFFIXES = ['主', '长', '座', '王', '皇', '帝', '祖', '师', '尊'];

// 2. Behavior Anchors (Detection only)
export const HARD_CHARACTER_ANCHORS = ['说道', '笑道', '喝道', '怒道', '问道', '答道', '冷声', '沉声', '低声', '传音', '吐口', '开口'];
export const SOFT_CHARACTER_ANCHORS = ['看向', '走来', '点头', '摇头', '叹息', '冷笑', '皱眉', '跨步', '跃起', '走入', '凝視'];

// 3. Grammar: Determiners & Particles (Junk prefixes)
export const DETERMINERS = [
    '这', '那', '一个', '个', '片', '些', '各', '有', '其', '此', '又', '整',
    '那座', '这类', '这种', '每一', '各类', '那一', '这一', '哪些', '这些'
];

// 4. Grammar: Function Words & Adverbs (The "Already" Traps)
export const FUNCTION_WORDS = [
    '已经', '就已经', '都已经', '现在已经', '曾经', '早已', '显然', '居然', '竟然',
    '无法', '没法', '没有', '办法', '可能', '大概', '甚至', '虽然', '即使', '既然',
    '成功', '初步', '暂时', '准备', '正在', '开始', '继续', '结束'
];

// 5. Grammar: Trailing Noise (To be stripped)
export const TRAILING_VERBS = [
    '笑着', '笑道', '说罢', '暗中', '缓缓', '慢慢', '正在', '平静地', '已经在', '露出', '微微',
    '一般', '一样', '的话', '之类', '似的', '而言', '之中', '之外', '之内'
];

// 6. NPC & Roles
export const ROLE_NOUNS = [
    '队长', '副队长', '首领', '看守', '守门人', '巡逻兵', '侍卫', '随从', '管家', '伙计', '掌柜', '小二',
    '中年', '青年', '年轻', '年老', '老头', '老太', '黑衣', '红裙', '大叔', '大婶', '大伯', '大妈',
    '女子', '男子', '孩童', '少年', '少女', '老夫', '老朽', '老者', '老妪'
];

// 7. Social Modifiers
export const SOCIAL_MODIFIERS = ['公', '子', '小姐', '夫人', '老爷', '少爷', '阿婆', '阿公', '大叔', '大婶', '殿下', '陛下'];

// 8. Composite Markers (REJECT IF FOUND)
export const COMPOSITE_MARKERS = ['和', '与', '以及', '跟', '及', '同', '或者', '还是'];

// 9. Blacklist (THE "DO NOT SHOW" LIST)
export const HEURISTIC_BLACKLIST = [
    ...FUNCTION_WORDS,
    '其实', '实际上', '毕竟', '恐怕', '不然', '不过', '依然', '然而', '反而', '此外', '因此', '所以',
    '一剑', '一步', '每一个', '一个', '那个', '这个时候', '这个', '那个', '此时', '此刻',
    '这种', '这种', '这些', '那些', '哪些', '什么', '哪里', '怎么', '如此', '极其', '非常',
    '还是', '或者', '不仅', '不但', '甚至', '尽管', '原本', '本来', '当初', '以前', '之后', '之前',
    '周围', '附近', '四周', '中间', '其中', '左右', '上下', '前后', '第一', '第二', '最后',
    '这种', '个世界', '这位', '那位', '那类', '片地界', '片区域', '各条路'
];

export const SENTENCE_STARTERS = ['但', '而', '在', '对', '到', '他', '她', '它', '你', '我', '那', '这', '某', '其', '各', '每'];

export const OCR_CONFUSION_MAP: Record<string, string> = {
    'l': '一', '丨': '一', '工': '功', '未': '末', '土': '士', '日': '目'
};

// Legacy Compatibility
export const CHARACTER_ANCHORS = [...HARD_CHARACTER_ANCHORS, ...SOFT_CHARACTER_ANCHORS];
export const QUANTITY_PREFIXES = ['一座', '位', '一群', '这位', '那位', '一尊', '一头', '一只', '一名', '一个个'];
export const VERB_TAILS = TRAILING_VERBS;
export const LOCATION_NOISE_PREFIXES = ['在', '到', '进', '巡', '从'];
export const BROKEN_PHRASE_ENDINGS = ['一', '个', '点', '样', '种', '之', '的', '地', '了', '着'];
export const INVALID_ENTITY_PREFIXES = ['但', '客观', '认为', '看来', '显然'];
export const CHARACTER_NOISE_LIST = ROLE_NOUNS;
export const ABSTRACT_SUFFIX_TRAPS = ['海', '场', '力', '波动', '状态', '层面', '反应', '程度', '物质', '灵光', '气机'];
export const ABSTRACT_CONCEPTS = ['意识灵光', '纯阳意识', '神种', '号道种', '天光劲', '灵性物质', '生命质', '意志', '灵光', '气机', '力量', '灵感', '生命波动'];
export const COMMON_MONSTER_LIST = ['丧尸', '魔兽', '灵獸', '凶兽', '妖兽', '怪', 'boss'];
export const QUALITY_MODIFIERS = ['精英', '精锐', '史诗', '传说', '神话', '稀有', '卓越', '普通'];
export const COMMON_ITEM_LIST = ['宝箱', '装备', '丹药', '灵石', '神像'];
export const TIER_PATTERNS = [
    /[一二三四五六七八九十百千]+[阶层级品境重]/,
    /[0-9]+[阶层级品境重]/,
    /(初|中|高|巅峰|圆满)[阶层级品境]/
];
