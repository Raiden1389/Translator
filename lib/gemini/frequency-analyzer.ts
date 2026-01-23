/**
 * Frequency-based Term Analyzer
 * Phân tích tần suất xuất hiện của thuật ngữ để lọc ra những từ quan trọng
 */

import { Chapter } from "../db";

// Stop-words tiếng Trung (các từ phổ biến cần loại trừ)
const CHINESE_STOP_WORDS = new Set([
    // Đại từ
    "我们", "你们", "他们", "她们", "它们", "咱们",
    "这里", "那里", "哪里", "这个", "那个", "哪个",
    "什么", "怎么", "为什么", "多少", "这种", "那种", "这样", "那样",
    "自己", "别人", "大家", "所有", "一切", "每个",
    // Trợ từ & Phủ định
    "的", "了", "吗", "呢", "吧", "啊", "呀", "哦",
    "是", "不是", "没有", "并没有", "真的", "还是",
    "在", "到", "自", "从", "对", "对于", "关于", "和", "与", "跟",
    "并", "而", "而且", "不仅", "甚至", "即", "即是", "即刻",
    // Động từ & Tính từ phổ biến
    "可以", "能够", "应该", "必须", "需要", "想要", "不会",
    "知道", "看到", "听到", "想到", "说道", "聽到", "感觉到",
    "非常", "十分", "特别", "极其", "最", "很", "一点", "一些",
    "已经", "正在", "准备", "已经", "最后", "开始", "结束",
    // Thời gian & Vị trí
    "今天", "明天", "昨天", "现在", "以前", "以后", "之前", "之后",
    "一天", "两天", "三天", "几天", "这一刻", "那一天",
    "上面", "下面", "左边", "右边", "中间", "周围", "里面", "外面",
    // Conjunctions (Liên từ)
    "所以", "但是", "因为", "还是", "或者", "还是", "而是", "所以", "因此", "于是",
    "因为", "由于", "即使", "虽然", "尽管", "即便", "只要", "除非",
    // Common Nouns/Politeness (Từ xưng hô chung)
    "前辈", "晚辈", "阁下", "各位", "诸位", "先生", "个人", "人类",
    "时间", "空间", "发现", "出现", "准备", "离开",
]);

// Các mẫu rác (Junk Patterns) - Nếu từ chứa hoặc bắt đầu bằng cụm này thì loại bỏ luôn
const JUNK_SUBSTRING_PATTERNS = [
    "正是", "看到", "那些", "什么", "怎么", "一个", "这种", "但是", "于是", "所以"
];

// Hậu tố nhận diện loại thuật ngữ
const SUFFIX_PATTERNS = {
    character: ["老", "小", "大", "少", "公子", "姑娘", "先生"],
    organization: ["宗", "派", "门", "会", "帮", "教", "盟", "阁"],
    location: ["山", "城", "谷", "峰", "洞", "府", "宫", "殿", "楼", "台"],
    skill: ["诀", "法", "功", "术", "剑", "掌", "拳", "指"],
    item: ["丹", "药", "符", "宝", "器", "珠", "玉", "石"],
};

// Tiền tố nhận diện
const PREFIX_PATTERNS = {
    character: ["老", "小", "大", "少"],
    location: ["东", "西", "南", "北", "中"],
};

export interface TermFrequency {
    term: string;
    count: number;
    chapters: Set<number>;
    weight: number; // Trọng số dựa trên heuristics
    category?: string; // name, organization, location, skill, item
    contexts: string[]; // Các ngữ cảnh xuất hiện (để debug)
}

export interface FrequencyAnalysisResult {
    allTerms: TermFrequency[];
    highFrequencyTerms: TermFrequency[];
    stats: {
        totalTerms: number;
        filteredTerms: number;
        filterRate: number;
    };
}

/**
 * Trie Node cho việc đếm tần suất hiệu quả
 */
class TrieNode {
    children: Map<string, TrieNode> = new Map();
    count: number = 0;
    chapters: Set<number> = new Set();
    contexts: string[] = [];
    isEndOfWord: boolean = false;
}

class TermTrie {
    root: TrieNode = new TrieNode();

    insert(term: string, chapterId: number, context: string) {
        let node = this.root;
        for (const char of term) {
            if (!node.children.has(char)) {
                node.children.set(char, new TrieNode());
            }
            node = node.children.get(char)!;
        }
        node.isEndOfWord = true;
        node.count++;
        node.chapters.add(chapterId);
        if (node.contexts.length < 3) { // Chỉ lưu 3 context đầu tiên
            node.contexts.push(context);
        }
    }

    getAllTerms(): TermFrequency[] {
        const results: TermFrequency[] = [];
        this._traverse(this.root, "", results);
        return results;
    }

    private _traverse(node: TrieNode, prefix: string, results: TermFrequency[]) {
        if (node.isEndOfWord && node.count > 0) {
            results.push({
                term: prefix,
                count: node.count,
                chapters: node.chapters,
                weight: 1.0,
                contexts: node.contexts,
            });
        }
        for (const [char, childNode] of node.children) {
            this._traverse(childNode, prefix + char, results);
        }
    }
}

/**
 * Trích xuất các pattern Hán tự từ text
 */
function extractChinesePatterns(text: string, chapterId: number, trie: TermTrie) {
    // Regex để tìm chuỗi Hán tự liên tiếp (2-6 ký tự)
    const chineseRegex = /[\u4e00-\u9fff]{2,6}/g;
    let match;

    while ((match = chineseRegex.exec(text)) !== null) {
        const term = match[0];
        const index = match.index;

        // Loại trừ stop-words
        if (CHINESE_STOP_WORDS.has(term)) continue;

        // Lấy context (20 ký tự trước + sau)
        const contextStart = Math.max(0, index - 20);
        const contextEnd = Math.min(text.length, index + term.length + 20);
        const context = text.substring(contextStart, contextEnd);

        // Thêm vào Trie với các độ dài khác nhau (2-6 ký tự)
        for (let len = 2; len <= Math.min(6, term.length); len++) {
            const subTerm = term.substring(0, len);

            // Hard Filter: Skip if it starts with or contains junk patterns
            if (JUNK_SUBSTRING_PATTERNS.some(p => subTerm.includes(p))) continue;

            if (!CHINESE_STOP_WORDS.has(subTerm)) {
                trie.insert(subTerm, chapterId, context);
            }
        }
    }
}

/**
 * Tính trọng số dựa trên heuristics
 */
function calculateWeight(termFreq: TermFrequency): number {
    let weight = 1.0;
    const { term, contexts } = termFreq;

    // 1. Kiểm tra vị trí trong câu (đầu câu = tên nhân vật)
    const atSentenceStart = contexts.some(ctx => {
        const trimmed = ctx.trim();
        return trimmed.startsWith(term) || trimmed.match(/^[。！？]\s*[\u4e00-\u9fff]/);
    });
    if (atSentenceStart) weight += 0.5;

    // 2. Kiểm tra trong ngoặc kép 「」『』（）
    const inQuotes = contexts.some(ctx =>
        ctx.includes(`「${term}`) ||
        ctx.includes(`『${term}`) ||
        ctx.includes(`（${term}`)
    );
    if (inQuotes) weight += 0.3;

    // 3. Kiểm tra hậu tố
    for (const [category, suffixes] of Object.entries(SUFFIX_PATTERNS)) {
        if (suffixes.some(suffix => term.endsWith(suffix))) {
            weight += 0.4;
            termFreq.category = category;
            break;
        }
    }

    // 4. Kiểm tra tiền tố
    for (const [category, prefixes] of Object.entries(PREFIX_PATTERNS)) {
        if (prefixes.some(prefix => term.startsWith(prefix))) {
            weight += 0.2;
            if (!termFreq.category) termFreq.category = category;
            break;
        }
    }

    // 5. Độ dài tối ưu (3-4 ký tự thường là tên riêng)
    if (term.length >= 3 && term.length <= 4) {
        weight += 0.2;
    }

    // 6. Xuất hiện ở nhiều chương khác nhau
    const chapterSpread = termFreq.chapters.size;
    if (chapterSpread >= 5) weight += 0.3;
    if (chapterSpread >= 10) weight += 0.5;

    return weight;
}

/**
 * Phân tích tần suất thuật ngữ từ nhiều chương
 */
export function analyzeTermFrequency(
    chapters: Chapter[],
    options: {
        minFrequencyPerChapter?: number;
        minFrequencyTotal?: number;
        minChapterSpread?: number;
        minWeight?: number;
    } = {}
): FrequencyAnalysisResult {
    const {
        minFrequencyTotal = 10,
        minChapterSpread = 2,
        minWeight = 1.0,
    } = options;

    const trie = new TermTrie();

    // Phase 1: Extract và đếm tần suất
    for (const chapter of chapters) {
        const text = chapter.content_original || "";
        extractChinesePatterns(text, chapter.id!, trie);
    }

    // Phase 2: Lấy tất cả terms và tính weight
    const allTerms = trie.getAllTerms();

    for (const termFreq of allTerms) {
        termFreq.weight = calculateWeight(termFreq);
    }

    // Phase 3: Lọc theo threshold
    const highFrequencyTerms = allTerms.filter(termFreq => {
        // Điều kiện 0: Luật "Độ phủ > 80% cho từ 2 ký tự"
        // Nếu là từ 2 ký tự mà xuất hiện ở hầu hết các chương (>=80%) -> Thường là rác ngữ pháp
        if (chapters.length >= 5 && termFreq.term.length === 2) {
            const coverage = termFreq.chapters.size / chapters.length;
            if (coverage >= 0.8) return false;
        }

        // Điều kiện 1: Tần suất tổng
        if (termFreq.count < minFrequencyTotal) return false;

        // Điều kiện 2: Xuất hiện ở đủ số chương
        if (termFreq.chapters.size < minChapterSpread) return false;

        // Điều kiện 3: Trọng số đủ cao
        const weightedScore = termFreq.count * termFreq.weight;
        if (weightedScore < minFrequencyTotal * minWeight) return false;

        return true;
    });

    // Phase 4: Substring Suppression (Redundancy Control)
    // Nếu một từ ngắn là substring của một từ dài và có tần suất tương đương, loại bỏ từ ngắn.
    const sortedHighFreq = [...highFrequencyTerms].sort((a, b) => b.term.length - a.term.length);
    const suppressedTerms = new Set<string>();

    for (let i = 0; i < sortedHighFreq.length; i++) {
        const longer = sortedHighFreq[i];
        if (suppressedTerms.has(longer.term)) continue;

        for (let j = i + 1; j < sortedHighFreq.length; j++) {
            const shorter = sortedHighFreq[j];
            if (suppressedTerms.has(shorter.term)) continue;

            if (longer.term.includes(shorter.term)) {
                // Nếu tần suất từ ngắn không cao hơn từ dài quá 20%, coi như là rác trùng lặp
                if (shorter.count < longer.count * 1.2) {
                    suppressedTerms.add(shorter.term);
                }
            }
        }
    }

    const finalTerms = highFrequencyTerms.filter(t => !suppressedTerms.has(t.term));

    // Sắp xếp theo trọng số và tần suất
    finalTerms.sort((a, b) => {
        const scoreA = a.count * a.weight;
        const scoreB = b.count * b.weight;
        return scoreB - scoreA;
    });

    // Chỉ lấy Top 100 ứng viên tiềm năng nhất để gửi cho AI Filter
    const topCandidates = finalTerms.slice(0, 100);

    return {
        allTerms,
        highFrequencyTerms: topCandidates,
        stats: {
            totalTerms: allTerms.length,
            filteredTerms: topCandidates.length,
            filterRate: allTerms.length > 0
                ? ((allTerms.length - topCandidates.length) / allTerms.length) * 100
                : 0,
        },
    };
}

/**
 * Phân tích một chương đơn lẻ
 */
export function analyzeSingleChapter(
    chapter: Chapter,
    minFrequency: number = 3
): FrequencyAnalysisResult {
    return analyzeTermFrequency([chapter], {
        minFrequencyTotal: minFrequency,
        minChapterSpread: 1,
    });
}
