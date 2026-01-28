import { TermCandidate, TermType } from './types';
import { VIETNAMESE_STOPWORDS, HEURISTICS } from './data/stopwords';
import { SyllableRepository } from '../../repositories/syllable-repo';
import { blacklistRepo } from '../../repositories/blacklist-repo';
import { TK_LOCATIONS, TK_PERSONS } from './data/three-kingdoms';

export class NameHunterJudge {
    private syllableRepo: SyllableRepository;

    private surnames = new Set([
        "Lưu", "Tào", "Tôn", "Lữ", "Hạ", "Trương", "Triệu", "Vương", "Lý", "Hoàng",
        "Đông", "Mã", "Viên", "Khương", "Tư Mã", "Gia Cát", "Âu Dương", "Công Tôn",
        "Hạ Hầu", "Nam Cung", "Mộ Dung", "Độc Cô", "Lệnh Hồ", "Hoàng Phủ", "Thượng Quan",
        "Dương", "Trần", "Lê", "Phạm", "Nguyễn", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô",
        "Khổng", "Huyền", "Mạnh", "Trọng", "Quý", "Bá", "Thúc", "Tử", "Ngọa", "Phượng",
        "Quan", "Lục", "Phan", "Uông", "Chu", "Hứa"
    ]);

    private abstractNouns = new Set([
        "Bằng Hữu", "Quan Điểm", "Lập Trường", "Ý Nghĩa", "Duy Nhất", "Thầm Nghĩ",
        "Ly Khai", "Vấn Nhân", "Kết Quả", "Nguyên Nhân", "Mục Đích", "Tinh Thần",
        "Thủ Đoạn", "Công Kích", "Phản Ứng", "Cảm Giác", "Phát Hiện", "Thời Gian",
        "Trạng Thái", "Quá Trình", "Hành Động", "Trách Nhiệm", "Ảnh Hưởng", "Vị Trí",
        "Lợi Hại", "Phủ Đệ", "Tính Tình", "Biểu Tình", "Nội Bộ", "Ngoại Bộ",
        "Tiên Sinh", "Công Tử", "Tiểu Thư", "Đại Nhân", "Phu Nhân", "Tướng Quân"
    ]);

    private spatialSuffixes = new Set(['Nội', 'Ngoại', 'Nội Bộ', 'Ngoại Bộ', 'Phía']);
    private honorificSuffixes = new Set(['Tiên Sinh', 'Công Tử', 'Tiểu Thư', 'Đại Nhân', 'Phu Nhân', 'Tướng Quân', 'Lão Gia', 'Thiếu Gia', 'Tiểu Tỷ']);

    private verbHeads = new Set([
        "Thầm", "Lặng", "Lén", "Âm Thầm", "Ly", "Muốn", "Đang", "Sẽ", "Đã", "Bị", "Được", "Tự"
    ]);

    constructor() {
        this.syllableRepo = SyllableRepository.getInstance();
    }

    public classify(candidate: TermCandidate): { type: TermType, score: number } {
        const text = candidate.original.trim();
        const words = text.split(/\s+/);
        const freq = candidate.count;
        let score = 50; // Base score

        // 1. HARD BLOCKERS (Score = 0)
        if (this._isRepetitive(words)) return { type: TermType.Junk, score: 0 };
        if (/[A-Z]$/.test(text)) return { type: TermType.Junk, score: 0 };
        if (this._isStopword(text)) return { type: TermType.Junk, score: 0 };
        if (blacklistRepo.isBlocked(candidate)) return { type: TermType.Junk, score: 0 };
        if (this.abstractNouns.has(text)) return { type: TermType.Junk, score: 0 };
        if (words.length > 0 && this.verbHeads.has(words[0])) return { type: TermType.Junk, score: 0 };
        if (text.endsWith("Nhất") && !text.startsWith("Đệ") && !text.startsWith("Thống")) return { type: TermType.Junk, score: 0 };
        if (!this.syllableRepo.isValidTerm(text)) return { type: TermType.Junk, score: 0 };

        // SPATIAL & HONORIFIC SUFFIX CHECK
        if (words.length > 1) {
            const lastWord = words[words.length - 1];
            const lastTwoWords = words.length >= 2 ? words[words.length - 2] + " " + words[words.length - 1] : "";

            if (this.spatialSuffixes.has(lastWord) || this.spatialSuffixes.has(lastTwoWords)) return { type: TermType.Junk, score: 0 };
            if (this.honorificSuffixes.has(lastWord) || this.honorificSuffixes.has(lastTwoWords)) return { type: TermType.Junk, score: 0 };
        }


        // 2. GOLD KNOWLEDGE (Three Kingdoms Dictionary)
        if (TK_LOCATIONS.has(text)) return { type: TermType.Location, score: 100 };
        if (TK_PERSONS.has(text)) return { type: TermType.Person, score: 100 };

        // 3. FREQUENCY SCORING (The "LAC" rule)
        if (freq >= 10) score += 30; // High signal
        if (freq <= 3) score -= 20;  // Low signal penalty
        if (freq === 1) score -= 30; // Very weak

        // 4. SEMANTIC SIGNALS (Surname, Titles, Suffixes)
        const first = words[0];
        const last = words[words.length - 1];

        // Surname Check
        const hasSurname = this.surnames.has(first) || (words.length >= 2 && this.surnames.has(words[0] + " " + words[1]));
        if (hasSurname) {
            score += 40;
            // Special Exception: Quách Gia is a Person
            if (text === 'Quách Gia') return { type: TermType.Person, score: 100 };
            // Family Clans (Surname + Gia/Toc)
            if (last === 'Gia' || last === 'Tộc') return { type: TermType.Organization, score: 90 };
            return { type: TermType.Person, score: Math.min(score, 100) };
        }

        // Suffix Heuristics
        const heuristicType = this._matchHeuristics(text);
        if (heuristicType) return { type: heuristicType, score: 90 };

        // Heuristic: If 2+ words and all are capitalized, it's very likely a Name/Entity
        const allCapitalized = words.length >= 2 && words.every(w => /^[A-ZĐƯĂÔÊƠƯ]/.test(w));
        if (allCapitalized) score += 30;

        // 5. FINAL DECISION
        if (score >= 60 && hasSurname) return { type: TermType.Person, score };
        if (score >= 80) return { type: TermType.Unknown, score }; // High signal but no surname -> Let AI decide
        if (score < 30) return { type: TermType.Junk, score };   // Likely Noise

        return { type: TermType.Unknown, score }; // GRAY ZONE
    }

    public shouldIgnore(text: string): boolean {
        // Quick check for regex engine pre-filtering
        return this._isStopword(text) || /[A-Z]$/.test(text);
    }

    private _isRepetitive(words: string[]): boolean {
        if (words.length < 2) return false;
        // Case: "Ha Ha Ha" -> all same
        const first = words[0].toLowerCase();
        return words.every(w => w.toLowerCase() === first);
    }

    private _isStopword(text: string): boolean {
        // Standard check
        if (VIETNAMESE_STOPWORDS.has(text)) return true;

        // Case-insensitive check
        const titleCase = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
        if (VIETNAMESE_STOPWORDS.has(titleCase)) return true;

        return false;
    }

    private _matchHeuristics(text: string): TermType | null {
        // Check suffixes for Locations
        if (HEURISTICS.LOCATION_SUFFIXES.some(suffix => text.endsWith(' ' + suffix) || text === suffix)) {
            return TermType.Location;
        }

        // Check suffixes for Sects/Orgs
        if (HEURISTICS.SECT_SUFFIXES.some(suffix => text.endsWith(' ' + suffix) || text === suffix)) {
            return TermType.Organization;
        }

        // Check keywords for Skills (Suffix only)
        if (HEURISTICS.SKILL_KEYWORDS.some(suffix => text.endsWith(' ' + suffix) || text === suffix)) {
            return TermType.Skill;
        }

        return null;
    }
}
