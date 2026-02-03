import {
    SKILL_SUFFIXES,
    LOCATION_SUFFIXES,
    TITLE_SUFFIXES,
    HARD_CHARACTER_ANCHORS,
    SOFT_CHARACTER_ANCHORS,
    SOCIAL_MODIFIERS,
    HEURISTIC_BLACKLIST,
    COMMON_FUNCTION_WORDS,
    OCR_CONFUSION_MAP,
    ROLE_NOUNS,
    FUNCTION_WORDS,
    TRAILING_VERBS,
    COMPOSITE_MARKERS,
} from './patterns';
import { GrammarStripper, GrammarDecision } from './grammar-stripper';
import { resolveRankV18, classifyRankContext, VERB_PREFIX_STRIP } from './rank-resolver';
import { resolveEntity } from './conflict-resolver';

/**
 * HEURISTIC TAGGER v5.4 - SOFT OPT-IN WITH CONSTRAINTS
 * FIX: Expanded SKILL_SUFFIXES for modern web novels + Added SOFT_CHARACTER_PATTERN for context-aware name detection.
 * Philosophy: Strict Opt-in with safe expansion - Precision > Recall, no noise flooding.
 */

export interface EntityCandidate {
    original: string;
    type: 'character' | 'skill' | 'location' | 'title' | 'unknown';
    confidence: number;
    reason: string;
    occurrences: number;
    metadata?: {
        originalRaw?: string;
        flags?: Record<string, boolean>;
        isRank?: boolean;
    };
}

const FUNCTION_PREFIX = [
    '这', '那', '你', '我', '他', '她', '它',
    '若', '如', '若非', '好像', '仿佛',
    '已经', '正在', '可以', '似乎', '所谓', '本', '该', '其'
];

const VERB_PREFIX = [
    '走', '迈', '喊', '看', '觉得', '发现', '进入', '冲进', '杀', '斩', '取出', '望着', '看到', '见到'
];

/**
 * Noun Gate - Chỉ áp dụng cho TITLE và LOCATION (Để lọc rác địa danh/chức danh)
 */
function looksLikeEntity(core: string): boolean {
    if (!core) return false;
    return /[王帝皇尊宗师祖君侯主徒妖神圣长官人城府山脉谷洞殿宫门阁院岛界域功诀法术拳掌剑阵经]/.test(core);
}

function isBlacklisted(core: string): boolean {
    if (!core) return true;
    if (core.length < 2) return false;
    return HEURISTIC_BLACKLIST.includes(core);
}

export function extractCandidates(text: string): EntityCandidate[] {
    const candidates: Map<string, EntityCandidate> = new Map();

    const normalizeOCR = (raw: string): string => {
        let result = raw;
        for (const [key, val] of Object.entries(OCR_CONFUSION_MAP)) {
            result = result.replaceAll(key, val);
        }
        return result;
    };

    const cleanup = (raw: string): string | null => {
        let core = normalizeOCR(raw.trim());

        // ⚡ STRIP TRAILING VERBS FIRST (before any rules)
        for (const v of TRAILING_VERBS) {
            if (core.endsWith(v)) {
                core = core.slice(0, -v.length);
                break;
            }
        }

        // ⚡ GRAMMAR STRIPPER (before rules)
        const grammarResult = GrammarStripper.process(core);
        if (grammarResult.decision === GrammarDecision.REJECT) return null;
        if (grammarResult.decision === GrammarDecision.STRIP_TAIL) {
            core = grammarResult.cleaned!;
        }
        if (core.length < 2) return null;

        // 🧱 RULE 1: GIẾT CỤM SỞ HỮU CÓ "的" (60-70% rác)
        // Examples: 神魔的孙, 行宫的弟, 教的宗师
        if (core.includes('的')) {
            return null; // Reject possessive phrases
        }

        // 🧱 RULE 2: GIẾT "神" CUỐI TỪ (Generic deity nouns)
        // Examples: 河神, 夜神, 妖神, 巨灵神
        if (
            core.endsWith('神') &&
            core.length <= 3 &&
            !/[王帝皇尊祖]/.test(core) // Keep high-rank deities
        ) {
            return null;
        }

        // 🧱 RULE 3: GIẾT TITLE MÔ TẢ (Color/Material + Rank)
        // Examples: 灰衣宗师, 黑衣宗师, 发大宗师
        if (/[黑白灰青赤金银].*(宗师|尊者|圣徒|王|帝)$/.test(core)) {
            return null;
        }

        // 🧱 RULE 4: GIẾT PLURAL / QUANTIFIER TITLE
        // Examples: 几位宗师, 数名强者, 多位圣者
        if (
            /^(几|数|多|诸|所有|这些|那些)/.test(core) &&
            /(宗师|尊者|圣者|强者|王|帝)$/.test(core)
        ) {
            return null;
        }

        // 🧱 RULE 5: GIẾT "圣 + danh từ chung"
        // Examples: 圣旅者, 圣骑士, 圣使
        // Keep: 圣王, 圣帝, 圣尊
        if (
            core.startsWith('圣') &&
            core.length <= 3 &&
            !/(王|帝|尊|祖|主)$/.test(core)
        ) {
            return null;
        }

        // 🧱 RULE 6: GIẾT COMMON FUNCTION WORDS
        // Examples: 这是, 那里, 自己, 对方, 应该, 因为, 但是
        if (COMMON_FUNCTION_WORDS.includes(core)) {
            return null;
        }

        // 🧱 RULE 7: GIẾT "神" KHÔNG CÓ RANK (mở rộng Rule 2)
        // Examples: 神游, 神灵, 神秘, 神士中, 神仙道场
        // Keep: 神王, 神帝, 神皇, 神尊, 神祖, 神主
        if (core.includes('神') && !/[王帝皇尊祖主]/.test(core)) {
            return null;
        }

        // 🧱 RULE 8: GIẾT COMPOUND PHRASES
        // Examples: 经过这样, 最为关键, 根本没, 一切都
        if (/^(经过|最为|根本|一切|谁都|还真|所经|出产|宗师级|大殿中)/.test(core)) {
            return null;
        }

        // 🧱 RULE 9: GIẾT "中" CUỐI (location markers)
        // Examples: 院中, 神庙中, 殿中, 其中
        if (core.endsWith('中') && core.length <= 4) {
            return null;
        }

        // 🧱 RULE 10: GIẾT "没/都/不" CUỐI (negation/universal)
        // Examples: 秦铭没, 心神都, 经不
        if (/[没都不]$/.test(core) && core.length <= 4) {
            return null;
        }

        // 🧱 RULE 11: GIẾT SHORT FORMS (< 3 chars without proper suffix)
        // Examples: 陆自, 净一 (not real names)
        // Keep: 老王, 师父, 公子 (have proper suffix)
        if (core.length < 3 && !/(老|师|公|子|王|帝|尊|主|祖)/.test(core)) {
            return null;
        }

        // 🧱 RULE 13: GIẾT "阵营" (camp/faction)
        // Examples: 图腾阵营, 玉京阵营, 两个阵营, 三大阵营
        if (core.includes('阵营')) {
            return null;
        }

        // 🧱 RULE 14: GIẾT "那位/这位/某位" + TITLE
        // Examples: 那位宗师, 这位圣者, 某位强者
        if (/^(那|这|某|一|几|数|多)位/.test(core)) {
            return null;
        }

        // 🧱 RULE 15: GIẾT "X大" + TITLE (quantifier)
        // Examples: 三大阵营, 两大宗师, 四大家族
        if (/^(三|两|一|二|四|五|六|七|八|九|十)大/.test(core)) {
            return null;
        }

        // 🧱 RULE 16: GIẾT "本X地/本X经" (adverbial phrases)
        // Examples: 本正经地, 本来就
        if (/^本.*(地|经)$/.test(core)) {
            return null;
        }

        // 🛡️ RULE 17: BẢO VỆ "弟子" (ATOMIC TOKEN - KHÔNG ĐƯỢC CẮT)
        // "弟子" là suffix hợp lệ, KHÔNG PHẢI rác
        // Examples: 五行宫弟子, 纯阳宫弟子, 剑宗弟子
        if (core.endsWith('弟子')) {
            return core; // GIỮ NGUYÊN
        }

        // 🧱 RULE 18: DROP NẾU BỊ CỤT (TRUNCATED ENTITIES)
        // Nếu kết thúc bằng "弟" hoặc "子" đơn lẻ → Đã bị cắt mất phần sau
        // Examples: 五行宫弟 (thiếu 子), 宗师向他 (rác)
        if (core.endsWith('弟') || /[^弟]子$/.test(core)) {
            return null; // DROP - Entity không hoàn chỉnh
        }

        // 🧱 RULE 19: DROP ĐẠI TỪ NHÂN XƯNG (PRONOUNS)
        // Tên nhân vật KHÔNG BAO GIỜ kết thúc bằng đại từ
        // Examples: 宗师向我 (tông sư hướng về ta), 宗师向他 (tông sư hướng về hắn)
        const PRONOUNS = ['我', '他', '她', '你', '其'];
        if (PRONOUNS.some(p => core.endsWith(p))) {
            return null; // DROP - Sentence fragment
        }

        // 🧱 RULE 19B: DROP CỤM "向X" (DIRECTIONAL PHRASES)
        // Examples: 向我, 向他, 向她, 向你
        if (/向[我他她你]/.test(core)) {
            return null; // DROP - Action phrase
        }

        // 🧱 RULE 20: KILL NGỮ PHÁP (GRAMMAR PARTICLES) - 60-65% rác
        // Examples: 不经意间, 经离开村, 都已经算, 这篇经文
        const GRAMMAR_PARTICLES = ['已经', '正在', '只是', '就是', '依旧', '甚至', '但是', '可是', '不经', '经常', '经历', '路经'];
        if (GRAMMAR_PARTICLES.some(p => core.includes(p))) {
            return null; // DROP - Grammar phrase
        }

        // 🧱 RULE 21: KILL RANK + ACTION (GENERIC NOUN + VERB) - 15-20% rác
        // Examples: 宗师摇了 (tông sư lắc đầu), 圣贤沉声 (thánh hiền trầm giọng)
        if (/(宗师|圣贤|圣者|圣徒)/.test(core) && /(了|也|在|每|这样|那样|一起|摇|沉)/.test(core)) {
            return null; // DROP - Generic rank + action
        }

        // 🧱 RULE 22: KILL LOCATION + ACTION - 10% rác
        // Examples: 院中了, 宫内也, 殿中在
        if (/(院|宫|殿)/.test(core) && /(了|也|在|每|中|内)/.test(core)) {
            return null; // DROP - Location + action
        }

        // 🧱 RULE 23: KILL ĐỊA ĐIỂM (LOCATION SUFFIXES) - 25-30% rác
        // Examples: 没不少院, 自家院, 地宫出口, 主殿尽头, 学府内
        if (/(院|宫|殿|府|学府|地宫)(内|外|出口|尽头)?$/.test(core)) {
            return null; // DROP - Location
        }

        // 🧱 RULE 24: KILL KINH VĂN (SCRIPTURE) - 20-25% rác
        // Examples: 这篇经文, 判断经文, 改命经算, 这部经义
        if (/(经文|经义|经算|经篇|真经)/.test(core)) {
            return null; // DROP - Scripture
        }

        // 🧱 RULE 25: KILL THI THỂ (CORPSE) - 8-10% rác
        // Examples: 尸体倒, 死尸栽倒, 那收尸人
        if (/(尸体|死尸|收尸)/.test(core)) {
            return null; // DROP - Corpse
        }

        // 🧱 RULE 26: KILL TÔNG SƯ NGỮ CẢNH (GENERIC MASTER) - 15-18% rác
        // Examples: 宗师 (alone), 大宗师们, 宗师无奈, 宗师立即
        if (/^(宗师|大宗师)(们)?$/.test(core)) {
            return null; // DROP - Generic master title
        }
        if (/(宗师|大宗师)(无奈|立即|先后|暗自|层面|颤声|这样|便|这|级)/.test(core)) {
            return null; // DROP - Master + context
        }

        // 🧱 RULE 27: KILL THÁNH NGỮ CẢNH (SAINT CONTEXT) - 8-10% rác
        // Examples: 一名外圣, 身为外圣, 外圣中期, 圣者淡然
        if (/(一名|身为|中期|淡然).*(外圣|圣者|圣贤|圣徒)/.test(core)) {
            return null; // DROP - Saint + context
        }

        // 🧱 RULE 28: KILL VƯƠNG NGỮ CẢNH (KING CONTEXT) - 8-10% rác
        // Examples: 银狼王就, 银狼王若, 这是霸王, 若借霸王
        if (/(就|若|是|借).*(王|霸王|银狼王)$/.test(core)) {
            return null; // DROP - King + context
        }

        // 🔥 RULE 30: KILL ALL RANK/TITLE COMPOUNDS (AGGRESSIVE) - ~40% rác
        // Rationale: "宗师秦铭" or "秦铭宗师" NOT needed - Gemini translates them
        // Examples: 发大宗师, 类宗师鼻, 宗师穹辉, 圣族大鼻, 士老祖宗
        const RANK_TITLE_MARKERS = ['宗师', '大宗师', '圣者', '圣贤', '圣徒', '外圣', '老祖', '师父', '师伯', '师叔', '祖宗', '圣劲', '圣山', '圣族', '圣女'];
        if (RANK_TITLE_MARKERS.some(m => core.includes(m))) {
            return null; // DROP - Title compound (Gemini can handle)
        }

        // 🧱 RULE 31: KILL "经" IN MIDDLE POSITION - ~20% rác
        // Examples: 经迈开蹄, 是曾经让, 经有段目, 经此地时, 经丢了面, 经离开村
        if (/^(是|已|曾|正).{0,2}经/.test(core) || /经(迈|有|此|丢|离|他|落|让)/.test(core)) {
            return null; // DROP - 经 as adverb
        }

        // 🧱 RULE 32: KILL SKILL NAMES (X经)
        // Examples: 驻世经, 改命经, 乙木经, 真经
        if (/经(就|还|只)?$/.test(core) && core.length <= 4) {
            return null; // DROP - Skill name
        }

        // 🧱 RULE 33: KILL SECT/FACTION NAMES (X宗)
        // Examples: 剑宗, 刀宗, 枪宗, 拳宗
        if (/(剑|刀|枪|拳|掌|腿|剑|刀)宗/.test(core)) {
            return null; // DROP - Sect name
        }

        // 🧱 RULE 34: KILL DEMONSTRATIVE PHRASES (这/那 + classifier)
        // Examples: 这座府邸, 那个宗师, 这片地界
        if (/^(这|那)(座|个|片|位|名|些)/.test(core)) {
            return null; // DROP - Demonstrative phrase
        }

        // 🧱 RULE 35: KILL FORMATION PHRASES (verb + 阵图/阵法)
        // Examples: 解除阵图, 布置阵法, 破解阵图
        if (/(解除|布置|破解|启动|激活).*(阵图|阵法|阵营)/.test(core)) {
            return null; // DROP - Formation phrase
        }

        // 🔥 RULE 37: KILL TITLE + GRAMMAR PARTICLE
        // Examples: 银狼王就, 银狼王若, 大宗师也, 圣者便
        if (/(王|宗师|圣者|老祖)(就|若|也|便|则|即|乃|皆)$/.test(core)) {
            return null; // DROP - Title + grammar particle
        }

        // 🔥 RULE 38: KILL DIRECTION + 方/宫 (LOCATION MARKERS)
        // Examples: 前方, 后方, 下方, 上方, 地宫, 天宫, 皇宫, 王宫
        if (/(前|后|下|上|左|右|东|西|南|北)方$/.test(core) || /(地|天|皇|王|龙|凤)宫$/.test(core)) {
            return null; // DROP - Direction/Palace
        }

        // 🔥 RULE 39: KILL FAMILY NAMES (X家) + 也 PARTICLE
        // Examples: 王家, 皇家, 刘家, 曹家, 王家也
        if (/家$/.test(core) || /也$/.test(core)) {
            return null; // DROP - Family name or 也 particle
        }

        // 🔥 RULE 40: KILL GENERIC ELDER REFERENCES (老X)
        // Examples: 老头, 老者, 老人, 老幼
        if (/^老(头|者|人|幼|翁|妪|汉|妇)/.test(core)) {
            return null; // DROP - Generic elder reference
        }

        return core;
    };

    const deepStripPrefix = (e: string): string => {
        let cur = e;
        let limit = 3;
        while (limit-- > 0) {
            let stripped = cur;
            for (const v of VERB_PREFIX_STRIP) {
                if (cur.startsWith(v)) {
                    stripped = cur.slice(v.length);
                    break;
                }
            }
            if (stripped === cur) break;
            cur = stripped;
        }
        return cur;
    };

    const addOrUpdate = (raw: string, type: EntityCandidate['type'], reason: string, context?: { hasVerb?: boolean }) => {
        let core = cleanup(raw);
        if (!core || core.length < 2) return;

        // 🔧 FIX 2: Noun Gate KHÔNG áp dụng cho CHARACTER
        // Tên người không cần keyword, không cần suffix, chỉ cần anchor.
        if (type !== 'character') {
            const isPotentialName = core.length >= 2 && core.length <= 4;
            if (!isPotentialName && !looksLikeEntity(core)) {
                return;
            }
        }

        // 🔧 FIX 3: Skill / Character KHÔNG bị giết bởi FUNCTION_PREFIX rác
        if (type !== 'skill' && type !== 'character') {
            if (core && FUNCTION_PREFIX.some(p => core!.startsWith(p))) return;
        }

        // Vẫn chặn VERB_PREFIX cho tất cả để tránh "Cầm kiếm", "Nhìn núi"
        if (core && VERB_PREFIX.some(v => core!.startsWith(v))) return;

        if (isBlacklisted(core)) return;

        core = deepStripPrefix(core);
        if (core.length < 2) return;

        const flags = {
            isGenericHuman: ROLE_NOUNS.some(r => core === r),
            isFunctionWord: FUNCTION_WORDS.includes(core!),
            hasVerbContext: context?.hasVerb || false,
            hasSkillSuffix: type === 'skill',
            hasLocationSuffix: type === 'location',
            isBlacklisted: false,
            looksLikeProperName: type === 'character' && core.length >= 2 && core.length <= 4,
            isComposite: COMPOSITE_MARKERS.some(m => core!.includes(m)),
            containsRankChar: /[主王尊祖师皇帝]/.test(core!),
        };

        // 🔧 FIX 1: RankResolver & Context Classifier CHỈ dành cho TITLE
        if (type === 'title') {
            const rankShape = resolveRankV18(core);
            if (rankShape === 'RANK') return;

            const rankCtx = classifyRankContext(core);
            if (rankCtx !== 'TITLE') return;
        }

        const existing = candidates.get(core);
        if (existing) {
            existing.occurrences++;
        } else {
            const resolution = resolveEntity({
                text: core,
                frequency: 99,
                patternMatched: true,
                semanticFlags: flags
            });

            candidates.set(core, {
                original: core,
                type: type,
                confidence: resolution.score,
                reason: `${reason}`,
                occurrences: 1,
                metadata: {
                    originalRaw: raw,
                    flags: flags,
                    isRank: type === 'title'
                }
            });
        }
    };

    // SCAN PATTERNS
    const skillPattern = new RegExp(`[\\u4e00-\\u9fa5]{1,4}[${SKILL_SUFFIXES.join('')}]`, 'g');
    const locationPattern = new RegExp(`[\\u4e00-\\u9fa5]{1,4}[${LOCATION_SUFFIXES.join('')}]`, 'g');
    const titlePattern = new RegExp(`[\\u4e00-\\u9fa5]{1,3}[${TITLE_SUFFIXES.join('')}]`, 'g');

    let match;
    while ((match = skillPattern.exec(text)) !== null) addOrUpdate(match[0], 'skill', 'Skill');
    while ((match = locationPattern.exec(text)) !== null) addOrUpdate(match[0], 'location', 'Location');
    while ((match = titlePattern.exec(text)) !== null) addOrUpdate(match[0], 'title', 'Title');

    const allAnchors = [...HARD_CHARACTER_ANCHORS, ...SOFT_CHARACTER_ANCHORS, ...SOCIAL_MODIFIERS];
    const anchorPattern = new RegExp(`([\\u4e00-\\u9fa5]{2,4})(${allAnchors.join('|')})`, 'g');
    while ((match = anchorPattern.exec(text)) !== null) {
        addOrUpdate(match[1], 'character', 'Anchor', { hasVerb: true });
    }

    // SOFT CHARACTER PATTERN (v5.4 - Soft Opt-in with constraints)
    // Detects character names in safe contexts:
    // - After punctuation (，。！？：；)
    // - Before possessive/descriptive markers (的是在有)
    // This catches names like "。秦明的剑" while rejecting noise like "这个", "已经"
    const softCharPattern = /([，。！？：；])\s*([\u4e00-\u9fa5]{2,4})(?=[的是在有])/g;
    while ((match = softCharPattern.exec(text)) !== null) {
        addOrUpdate(match[2], 'character', 'SoftContext', { hasVerb: false });
    }

    return Array.from(candidates.values());
}
