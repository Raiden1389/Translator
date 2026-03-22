/**
 * 🔍 Name Audit — Extraction Engine (Phase 01)
 *
 * Pure string processing: extract character names from Vietnamese & Chinese text.
 * Zero API cost — regex patterns + HanViet dictionary lookup.
 */

import { SyllableRepository } from "@/lib/repositories/syllable-repo";
import type {
    AlignedParagraph,
    CrossRefEntry,
} from "./name-audit.types";

// ────────────────────────────────────────────────────
// CONSTANTS
// ────────────────────────────────────────────────────

/**
 * Vietnamese uppercase chars: standard A-Z plus all accented capitals.
 * Must list explicitly because Unicode ranges like À-Ỹ miss Ư, Ơ, Đ etc.
 */
const VN_UPPER = 'A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÈÉẺẼẸÊẾỀỂỄỆÌÍỈĨỊÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÙÚỦŨỤƯỨỪỬỮỰỲÝỶỸỴ';
const VN_LOWER = 'a-zàáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ';

/**
 * Regex: 2-4 Vietnamese words starting with uppercase.
 * Matches: "Cư Nam", "Lý Minh Hải", "Trương Thiên Ái Tinh"
 * Does NOT match single words or lowercase.
 */
const VIET_NAME_REGEX = new RegExp(
    `([${VN_UPPER}][${VN_LOWER}]+(?:\\s[${VN_UPPER}][${VN_LOWER}]+){1,3})`, 'g'
);

/**
 * Common Vietnamese phrases that look like names but aren't.
 * These get filtered out of extraction results.
 */
const COMMON_PHRASES = new Set([
    // Geographic
    "Việt Nam", "Trung Quốc", "Trung Hoa", "Đài Loan",
    // Titles / Honorifics
    "Đại Ca", "Đại Sư", "Đại Nhân", "Đại Hiệp", "Đại Vương",
    "Sư Phụ", "Sư Huynh", "Sư Đệ", "Sư Muội", "Sư Tổ", "Sư Bá",
    "Thiếu Gia", "Tiểu Thư", "Tiểu Muội", "Tiểu Đệ", "Tiểu Tử",
    "Lão Gia", "Lão Nhân", "Lão Đại", "Lão Bản",
    "Ma Vương", "Thần Vương", "Quỷ Vương", "Yêu Vương",
    "Thánh Nữ", "Thánh Tử", "Thánh Nhân",
    "Thái Tử", "Thái Hậu", "Thái Giám", "Thái Thượng",
    "Hoàng Đế", "Hoàng Hậu", "Hoàng Tử",
    "Trưởng Lão", "Chưởng Môn", "Chưởng Giáo",
    "Cung Chủ", "Thành Chủ", "Viện Trưởng",
    "Tông Chủ", "Giáo Chủ", "Giáo Sư", "Bệ Hạ", "Điện Hạ",
    "Tam Giới", "Tam Thanh", "Tứ Hải",
    // Common non-name uppercase patterns
    "Đông Phương", "Tây Phương", "Nam Phương", "Bắc Phương",
    "Tu Tiên", "Tu Luyện", "Tu Hành", "Tu Sĩ",
    "Nguyên Anh", "Kim Đan", "Hóa Thần", "Luyện Hư",
    "Nguyên Thần", "Nguyên Lực", "Linh Lực",
    "Đấu Khí", "Nội Công", "Nội Lực",
    // Generic phrases
    "Quân Tử", "Tiên Sinh", "Phu Nhân", "Nương Tử",
    "Huynh Đệ", "Tỷ Muội", "Bằng Hữu", "Đạo Hữu",
]);

/**
 * Top ~200 Chinese surnames covering 95%+ of real names.
 */
const COMMON_SURNAMES = new Set(Array.from(
    "赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜" +
    "戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳酆鲍史唐" +
    "费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄" +
    "和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴谈宋茅庞熊纪舒屈项祝董梁" +
    "杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱骆高夏蔡田樊胡凌霍" +
    "虞万支柯管卢莫经房裘缪干解应宗丁宣贲邓郁单杭洪包诸左石崔吉钮龚程" +
    "嵇邢滑裴陆荣翁荀羊於惠甄曲家封芮羿储靳汲邴糜松井段富巫乌焦巴弓牧" +
    "隗山谷车侯宓蓬全郗班仰秋仲伊宫宁仇栾暴甘钭厉戎祖武符刘景詹束龙叶"
));

/**
 * Common Chinese characters that are NOT valid as name characters.
 */
const INVALID_NAME_CHARS = new Set(Array.from(
    // Particles, pronouns, prepositions
    "的了是在有不人这中大为上个国我以要他时来用们生到作地于出会" +
    "就也得你对说能都着将把还进那自己好开让位于而且但它和个各如" +
    "些或者又什没很下更过话所去被因此才么及与即只向当然更其并从" +
    // Common verbs (action words unlikely in names)
    "走做看听吃喝打坐站跑叫问答给带拿放拉推拉开关死活笑哭跪" +
    "想知道觉找请等变化转回跳飞落掉挥摇摆扔抓咬踢踩切割刺射杀" +
    // Common adjectives / adverbs
    "多少新旧长短高低远近快慢早晚真假" +
    // Measure words and connectors
    "只条件块片根支把双串份" +
    // Punctuation (Chinese + standard)
    "，。！？、；：\u201C\u201D\u2018\u2019（）【】《》—…·\n\r\t "
));

// ────────────────────────────────────────────────────
// 1. VIETNAMESE NAME EXTRACTION
// ────────────────────────────────────────────────────

/**
 * Extract proper names from Vietnamese translated text.
 * Uses regex pattern matching + common phrase filtering.
 */
export function extractVietnameseNamesFromText(
    text: string,
    chapterOrder: number,
): Map<string, { count: number; chapters: Set<number>; contexts: string[]; paragraphIndices: number[] }> {
    const nameMap = new Map<string, { count: number; chapters: Set<number>; contexts: string[]; paragraphIndices: number[] }>();
    if (!text) return nameMap;

    // Split by paragraphs to track paragraph index for cross-ref
    const paragraphs = splitParagraphs(text);
    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
        const para = paragraphs[pIdx];
        let match: RegExpExecArray | null;
        VIET_NAME_REGEX.lastIndex = 0; // Reset regex state

        while ((match = VIET_NAME_REGEX.exec(para)) !== null) {
            const name = match[1].trim();

            // Skip common phrases
            if (COMMON_PHRASES.has(name)) continue;

            // Skip if name starts a sentence after period (likely not a name)
            const charBefore = match.index > 0 ? para[match.index - 1] : "";
            if (charBefore === "." || charBefore === "!" || charBefore === "?") continue;

            const entry = nameMap.get(name);
            if (entry) {
                entry.count++;
                entry.chapters.add(chapterOrder);
                if (entry.contexts.length < 3) {
                    const ctx = para.trim().substring(0, 100);
                    if (!entry.contexts.includes(ctx)) {
                        entry.contexts.push(ctx);
                    }
                }
                // Track paragraph index (max 5 for performance)
                if (entry.paragraphIndices.length < 5 && !entry.paragraphIndices.includes(pIdx)) {
                    entry.paragraphIndices.push(pIdx);
                }
            } else {
                nameMap.set(name, {
                    count: 1,
                    chapters: new Set([chapterOrder]),
                    contexts: [para.trim().substring(0, 100)],
                    paragraphIndices: [pIdx],
                });
            }
        }
    }

    return nameMap;
}

// ────────────────────────────────────────────────────
// 2. CHINESE NAME EXTRACTION
// ────────────────────────────────────────────────────

/**
 * Extract names from Chinese text using surname-based pattern matching.
 * Pattern: common surname char + 1-2 following chars
 */
export function extractChineseNamesFromText(
    text: string,
    chapterOrder: number
): Map<string, { count: number; chapters: Set<number> }> {
    const nameMap = new Map<string, { count: number; chapters: Set<number> }>();
    if (!text) return nameMap;

    const chars = Array.from(text);

    for (let i = 0; i < chars.length; i++) {
        const char = chars[i];

        // Must start with a known surname
        if (!COMMON_SURNAMES.has(char)) continue;

        // Try 3-char name first (more common), then 2-char
        for (const nameLen of [3, 2]) {
            if (i + nameLen > chars.length) continue;

            const candidate = chars.slice(i, i + nameLen).join("");

            // Validate: all chars after surname must be valid name chars
            const givenNameChars = chars.slice(i + 1, i + nameLen);
            const allValid = givenNameChars.every(c => !INVALID_NAME_CHARS.has(c));

            if (!allValid) continue;

            const entry = nameMap.get(candidate);
            if (entry) {
                entry.count++;
                entry.chapters.add(chapterOrder);
            } else {
                nameMap.set(candidate, {
                    count: 1,
                    chapters: new Set([chapterOrder]),
                });
            }
            break; // Don't extract both 2-char and 3-char from same position
        }
    }

    return nameMap;
}

// ────────────────────────────────────────────────────
// 3. PARAGRAPH ALIGNMENT
// ────────────────────────────────────────────────────

/**
 * Align paragraphs between original Chinese and translated Vietnamese text.
 * Raiden translates paragraph-by-paragraph, so index mapping is ~1:1.
 */
export function alignParagraphs(
    original: string,
    translated: string
): AlignedParagraph[] {
    const origParagraphs = splitParagraphs(original);
    const transParagraphs = splitParagraphs(translated);

    const minLen = Math.min(origParagraphs.length, transParagraphs.length);
    const aligned: AlignedParagraph[] = [];

    for (let i = 0; i < minLen; i++) {
        aligned.push({
            index: i,
            original: origParagraphs[i],
            translated: transParagraphs[i],
        });
    }

    return aligned;
}

/** Split text into non-empty paragraphs */
export function splitParagraphs(text: string): string[] {
    return text
        .split(/\n{1,}/)
        .map(p => p.trim())
        .filter(p => p.length > 0);
}

// ────────────────────────────────────────────────────
// 4. CROSS-REFERENCE (Viet ↔ Chinese via paragraph alignment)
// ────────────────────────────────────────────────────

/**
 * Cross-reference Vietnamese names with Chinese names using paragraph alignment.
 */
export function buildCrossRefFromAligned(
    aligned: AlignedParagraph[],
    repo: SyllableRepository
): CrossRefEntry[] {
    const chineseToVietMap = new Map<string, Set<string>>();

    for (const pair of aligned) {
        const vietNames = extractVietnameseNamesFromText(pair.translated, 0);
        if (vietNames.size === 0) continue;

        const chineseNames = extractChineseNamesFromText(pair.original, 0);
        if (chineseNames.size === 0) continue;

        const vietList = Array.from(vietNames.keys());
        const chineseList = Array.from(chineseNames.keys());

        if (chineseList.length === 1 && vietList.length === 1) {
            const cn = chineseList[0];
            const existing = chineseToVietMap.get(cn) ?? new Set();
            existing.add(vietList[0]);
            chineseToVietMap.set(cn, existing);
        } else {
            for (const cn of chineseList) {
                const hanViet = repo.toHanViet(cn);
                for (const vn of vietList) {
                    if (isSimilarHanViet(hanViet, vn)) {
                        const existing = chineseToVietMap.get(cn) ?? new Set();
                        existing.add(vn);
                        chineseToVietMap.set(cn, existing);
                    }
                }
            }
        }
    }

    const entries: CrossRefEntry[] = [];
    for (const [chineseName, vietSet] of chineseToVietMap) {
        if (vietSet.size === 0) continue;
        entries.push({
            chineseName,
            hanViet: repo.toHanViet(chineseName),
            vietnameseVariants: Array.from(vietSet),
        });
    }

    return entries;
}

// ────────────────────────────────────────────────────
// INTERNAL HELPERS
// ────────────────────────────────────────────────────

/**
 * Check if a HanViet conversion is similar enough to a Vietnamese name.
 * "Chu Nam" vs "Cư Nam" → similar (edit distance small relative to length)
 */
function isSimilarHanViet(hanViet: string, vietName: string): boolean {
    const hv = hanViet.toLowerCase();
    const vn = vietName.toLowerCase();

    if (hv === vn) return true;

    const hvWords = hv.split(/\s+/);
    const vnWords = vn.split(/\s+/);
    if (hvWords.length !== vnWords.length) return false;

    let totalDiff = 0;
    for (let i = 0; i < hvWords.length; i++) {
        const diff = levenshteinDistance(hvWords[i], vnWords[i]);
        totalDiff += diff;
    }

    return totalDiff <= 2;
}

/** Simple Levenshtein distance for short strings */
export function levenshteinDistance(a: string, b: string): number {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];
    for (let i = 0; i <= a.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    return matrix[a.length][b.length];
}
