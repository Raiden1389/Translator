import { TermType, ChineseTermCandidate } from './types';
import { SyllableRepository } from '../../repositories/syllable-repo';

/**
 * Chinese Name Engine 
 * Refined with Professional Novel Translation Rules (Phase 1)
 * Optimized for Xianxia/Wuxia and compound surnames.
 */
export class ChineseNameEngine {
    private syllableRepo: SyllableRepository;

    // 1. SURNAMES - Categorized for priority matching
    private compoundSurnames = new Set([
        "诸葛", "司马", "欧阳", "上官", "慕容", "东方", "西门", "南宫", "北冥", "独孤", "皇甫", "公孙", "长孙",
        "夏侯", "令狐", "尉迟", "拓跋", "宇文", "司徒", "司空", "申屠", "闻人", "钟离", "澹台", "宗政",
        "濮阳", "公冶", "太史", "公羊", "赫连", "呼延", "轩辕", "东郭", "南门", "百里", "谷梁", "梁丘",
        "左丘", "西陵", "南荣", "公西", "公良"
    ]);

    private singleSurnames = new Set([
        "李", "王", "张", "刘", "陈", "赵", "黄", "周", "吴", "徐", "孙", "胡", "朱", "高", "林", "何", "郭", "马", "罗", "梁",
        "宋", "郑", "谢", "韩", "唐", "冯", "于", "董", "萧", "程", "曹", "袁", "邓", "许", "傅", "沈", "曾", "彭", "吕", "苏",
        "卢", "蒋", "蔡", "贾", "丁", "魏", "薛", "叶", "阎", "余", "潘", "杜", "戴", "夏", "钟", "汪", "田", "任", "姜",
        "龙", "凤", "云", "雷", "风", "岳", "石", "金", "木", "童", "秦", "江", "史", "顾", "侯", "邵", "孟", "万", "段", "钱", "汤", "尹", "黎", "易", "常", "武", "乔", "贺", "赖", "龚", "文", "章", "其"
    ]);

    // 2. TITLES / SUFFIXES - Categorized by standard vs harem
    private haremTitles = new Set(["妃", "贵妃", "皇后", "昭仪", "婕妤", "贵人", "才人", "美人"]);

    private commonTitles = new Set([
        // Xianxia / Wuxia Core
        "宗主", "掌门", "长老", "太上长老", "老祖", "道友", "前辈", "后辈", "圣子", "圣女", "殿主", "宫主", "阁主", "峰主",
        "界主", "域主", "城主", "族长", "少主", "少宗主", "少宫主", "真君", "真人", "天君", "仙君", "仙王", "大帝", "天帝",
        "神王", "神君", "魔尊", "魔君", "妖皇", "妖王", "府主", "堂主", "舵主", "护法",
        // Secular / Military
        "将军", "大将军", "元帅", "统领", "都督", "校尉", "统帅", "主帅", "皇帝", "陛下", "殿下", "太子", "国师", "王爷", "侯爷", "公爵", "伯爵", "大人", "老爷", "大王",
        // Everyday
        "公子", "小姐", "少爷", "先生", "夫人", "兄", "兄长", "师兄", "师弟", "师姐", "师妹"
    ]);

    // 3. LOCATION SUFFIXES
    private locationSuffixes = new Set([
        "山", "岭", "峰", "谷", "林", "江", "河", "湖", "海", "海域", "城", "镇", "关", "关隘", "宫", "殿", "府", "阁", "楼",
        "洞", "洞府", "秘境", "禁地", "遗迹", "福地", "界", "域", "天", "墟", "原", "小世界", "残界"
    ]);

    // 4. JUNK TAILS
    private junkTails = new Set(["上", "下", "的", "了", "在", "到", "看", "问", "说", "道", "之", "与", "也", "是", "个", "人", "<td>", "</td>"]);

    // SPEECH VERBS 
    private speechVerbs = new Set(["道", "曰", "说", "问", "笑道", "冷笑", "静道", "喝道", "骂道", "叹道", "念道", "沉吟", "低声道", "急道"]);

    // Common Prefixes
    private prefixes = new Set(["老", "小", "阿"]);

    // Custom Patterns
    private customPatterns: string[] = ["{0}儿", "阿{0}", "小{0}", "老{0}", "大{0}"];

    constructor() {
        this.syllableRepo = SyllableRepository.getInstance();
    }

    public setCustomPatterns(patterns: string[]) {
        this.customPatterns = patterns;
    }

    public async extractCandidates(chineseText: string): Promise<ChineseTermCandidate[]> {
        const candidates = new Map<string, ChineseTermCandidate>();

        // STEP 1: NLP EXTRACTION
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const nlpResults = await invoke<{ word: string, tag: string }[]>('segment_chinese', { text: chineseText });

            for (const item of nlpResults) {
                const tag = item.tag.toLowerCase();
                if (['nr', 'ns', 'nt', 'nz', 'n'].includes(tag)) {
                    let type = TermType.Unknown;
                    if (tag === 'nr') type = TermType.Person;
                    else if (tag === 'ns') type = TermType.Location;
                    else if (tag === 'nt') type = TermType.Organization;
                    this._addOrUpdate(item.word, candidates, type);
                }
            }
        } catch (e) {
            console.error("[NameHunter] NLP failed", e);
        }

        // STEP 2: HEURISTIC EXTRACTION 
        const heuristicMap = new Map<string, ChineseTermCandidate>();
        this._extractBySurname(chineseText, heuristicMap);
        this._extractByPrefix(chineseText, heuristicMap);
        this._extractByTitle(chineseText, heuristicMap);
        this._extractBySpeechVerbs(chineseText, heuristicMap);
        this._extractByCustomPatterns(chineseText, heuristicMap);

        // STEP 3: SMART MERGE 
        for (const [chinese, hCand] of heuristicMap) {
            const existing = candidates.get(chinese);
            if (existing) {
                existing.count += hCand.count;
                if (hCand.type === TermType.Location) existing.type = TermType.Location;
                else if (existing.type === TermType.Unknown) existing.type = hCand.type;
            } else {
                this._addOrUpdate(chinese, candidates, hCand.type);
            }
        }

        // STEP 4: CLEANUP
        return this._cleanup(Array.from(candidates.values()));
    }

    private _isJunk(text: string, confirmedPerson = false): boolean {
        if (confirmedPerson) return false;
        if (text.length < 2) return true;
        const tail = text.at(-1);
        return tail ? this.junkTails.has(tail) : false;
    }

    private _extractBySurname(text: string, map: Map<string, ChineseTermCandidate>) {
        const compoundPattern = Array.from(this.compoundSurnames).sort((a, b) => b.length - a.length).join('|');
        const singlePattern = Array.from(this.singleSurnames).join('|');
        const pattern = new RegExp(`((${compoundPattern})[\\u4e00-\\u9fa5]{1,2})|((${singlePattern})[\\u4e00-\\u9fa5]{1,2})`, 'g');
        let match;
        while ((match = pattern.exec(text)) !== null) {
            this._addOrUpdate(match[0], map, TermType.Person);
        }
    }

    private _extractByPrefix(text: string, map: Map<string, ChineseTermCandidate>) {
        for (const pref of this.prefixes) {
            const pattern = new RegExp(`${pref}[\\u4e00-\\u9fa5]{1,2}`, 'g');
            let match;
            while ((match = pattern.exec(text)) !== null) {
                this._addOrUpdate(match[0], map, TermType.Person);
            }
        }
    }

    private _extractByTitle(text: string, map: Map<string, ChineseTermCandidate>) {
        const allTitles = [...Array.from(this.commonTitles), ...Array.from(this.haremTitles)];
        const titlePattern = allTitles.sort((a, b) => b.length - a.length).join('|');
        const pattern = new RegExp(`([\\u4e00-\\u9fa5]{1,3})(${titlePattern})`, 'g');
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const full = match[0];
            const name = match[1];
            const title = match[2];
            // Harem titles like '妃' (Phi) ONLY match if the preceding name is 2+ chars
            if (this.haremTitles.has(title) && name.length < 2) continue;
            this._addOrUpdate(full, map, TermType.Person);
        }
    }

    private _extractBySpeechVerbs(text: string, map: Map<string, ChineseTermCandidate>) {
        const verbPattern = Array.from(this.speechVerbs).join('|');
        const pattern = new RegExp(`([\\u4e00-\\u9fa5]{2,3})(${verbPattern})`, 'g');
        let match;
        while ((match = pattern.exec(text)) !== null) {
            this._addOrUpdate(match[1], map, TermType.Person);
        }
    }

    private _extractByCustomPatterns(text: string, map: Map<string, ChineseTermCandidate>) {
        for (const p of this.customPatterns) {
            const regex = new RegExp(p.replace(/\{0\}/g, '([\\u4e00-\\u9fa5]{1,3})'), 'g');
            let match;
            while ((match = regex.exec(text)) !== null) {
                this._addOrUpdate(match[0], map);
            }
        }
    }

    private _addOrUpdate(chinese: string, map: Map<string, ChineseTermCandidate>, type: TermType = TermType.Unknown) {
        let detectedType = type;

        // 1. ABSOLUTE PERSON RULE (Sovereignty)
        if (chinese.length >= 2 && chinese.length <= 3) {
            const first = chinese[0];
            const firstTwo = chinese.slice(0, 2);
            if (this.singleSurnames.has(first) || this.compoundSurnames.has(firstTwo)) {
                this._finishAddOrUpdate(chinese, map, TermType.Person, 1.0);
                return;
            }
        }

        // 2. JUNK FILTER
        if (this._isJunk(chinese, detectedType === TermType.Person)) return;

        // 3. SEMANTIC REFINEMENT
        let forceConfidence = 0.5;
        for (const s of this.locationSuffixes) {
            if (chinese.endsWith(s) && chinese.length >= 2) {
                if (detectedType === TermType.Person && ["山", "峰", "岭"].includes(s)) {
                    // Keep Person
                } else {
                    detectedType = TermType.Location;
                }
                break;
            }
        }

        if (detectedType === TermType.Unknown || detectedType === TermType.Person) {
            const allTitles = [...Array.from(this.commonTitles), ...Array.from(this.haremTitles)];
            for (const t of allTitles) {
                if (chinese.endsWith(t) && chinese.length >= 1) {
                    detectedType = TermType.Person;
                    forceConfidence = 0.9;
                    break;
                }
            }
        }

        this._finishAddOrUpdate(chinese, map, detectedType, forceConfidence);
    }

    private _finishAddOrUpdate(chinese: string, map: Map<string, ChineseTermCandidate>, detectedType: TermType, confidence: number) {
        const existing = map.get(chinese);
        if (existing) {
            existing.count++;
            if (existing.type === TermType.Unknown) existing.type = detectedType;
            else if (existing.type === TermType.Person && detectedType === TermType.Location) existing.type = TermType.Location;
            existing.confidence = Math.max(existing.confidence || 0, confidence);
        } else {
            map.set(chinese, {
                id: `${chinese}_${detectedType}_${Math.random().toString(36).substring(2, 9)}`,
                original: this.syllableRepo.toHanViet(chinese),
                chinese,
                context: '',
                count: 1,
                type: detectedType,
                confidence: confidence
            });
        }
    }

    private _cleanup(candidates: ChineseTermCandidate[]): ChineseTermCandidate[] {
        candidates.sort((a, b) => b.chinese.length - a.chinese.length);
        const result: ChineseTermCandidate[] = [];
        const dropped = new Set<string>();

        for (let i = 0; i < candidates.length; i++) {
            const A = candidates[i];
            if (dropped.has(A.chinese)) continue;

            // IMMUNE RULE: 2-char Surname names are protected
            if (A.type === TermType.Person && A.chinese.length === 2 && this.singleSurnames.has(A.chinese[0])) {
                result.push(A);
                continue;
            }

            let isAlias = false;
            for (let j = 0; j < result.length; j++) {
                const B = result[j];
                // Restricted Merge: only if B is exactly 1 char longer
                if (B.chinese.includes(A.chinese) && B.count >= A.count && B.chinese.length <= A.chinese.length + 1) {
                    B.count += A.count;
                    dropped.add(A.chinese);
                    isAlias = true;
                    break;
                }
            }
            if (!isAlias) result.push(A);
        }
        return result.sort((a, b) => b.count - a.count);
    }
}
