import {
    SKILL_SUFFIXES,
    LOCATION_SUFFIXES,
    TITLE_SUFFIXES,
    HARD_CHARACTER_ANCHORS,
    SOFT_CHARACTER_ANCHORS,
    SOCIAL_MODIFIERS,
    HEURISTIC_BLACKLIST,
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
 * HEURISTIC TAGGER v5.3 - THE FINAL RESTORATION
 * FIX: Đảm bảo Tên người (Character), Chiêu thức (Skill), Địa danh (Location) không bị trảm nhầm.
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
        for (const v of TRAILING_VERBS) {
            if (core.endsWith(v)) {
                core = core.slice(0, -v.length);
                break;
            }
        }
        const grammarResult = GrammarStripper.process(core);
        if (grammarResult.decision === GrammarDecision.REJECT) return null;
        if (grammarResult.decision === GrammarDecision.STRIP_TAIL) {
            core = grammarResult.cleaned!;
        }
        if (core.length < 2) return null;
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

    return Array.from(candidates.values());
}
