import { TermCandidate } from "../services/name-hunter/types";

export enum BlacklistLevel {
    HARD = 'HARD',       // Absolute noise (System defined or User explicit)
    PHRASE = 'PHRASE',   // Context-specific rejection (exact phrase)
    SOFT = 'SOFT'        // Lower confidence rejection
}

interface BlacklistEntry {
    term: string;
    level: BlacklistLevel;
    timestamp: number;
    count?: number; // Track how many times rejected
}

class BlacklistRepository {
    private static instance: BlacklistRepository;
    private storageKey = 'namehunter_blacklist_v1';

    // In-memory cache
    private hardSet = new Set<string>([
        'Ha Ha', 'Ha Ha Ha', 'Haha', 'Hắc Hắc', 'A A', 'Này Này',
        'Một Cái', 'Tiên Sinh', 'Lão Đệ', 'Huynh Đài', 'Chính Vụ', 'Thế Nhưng',
        'Không Biết', 'Trực Tiếp', 'Thần Sắc', 'Thực Sự', 'Thiên Tử', 'Không Thể', 'Có Lẽ',
        'Kết Quả', 'Tính Cách', 'Thanh Âm', 'Chiến Tranh', 'Quân Sự',
        'Lợi Hại', 'Phủ Đệ', 'Tính Tình', 'Biểu Tình',
        'Kế Sách', 'Huống Chi', 'Thất Phu', 'Tướng Thành', 'Tranh Phong'
    ]);
    private phraseSet = new Set<string>();
    private softMap = new Map<string, BlacklistEntry>();

    private constructor() {
        if (typeof window !== 'undefined') {
            this.load();
        }
    }

    public static getInstance(): BlacklistRepository {
        if (!BlacklistRepository.instance) {
            BlacklistRepository.instance = new BlacklistRepository();
        }
        return BlacklistRepository.instance;
    }

    public addToBlacklist(term: string, level: BlacklistLevel = BlacklistLevel.PHRASE) {
        const normalized = term.trim(); // Keep case for Phrase level usually, but normalized helps

        const entry: BlacklistEntry = {
            term: normalized,
            level,
            timestamp: Date.now()
        };

        if (level === BlacklistLevel.PHRASE) {
            this.phraseSet.add(normalized);
        } else if (level === BlacklistLevel.SOFT) {
            this.softMap.set(normalized, entry);
        }

        this.save();
    }

    public isBlocked(candidate: TermCandidate): boolean {
        const term = candidate.original.trim();

        // 1. Level 1: Hard Blacklist (System or User Hard)
        if (this.hardSet.has(term)) return true;
        // Check case-insensitive for hard junk
        const upper = term.toUpperCase();
        for (const hard of this.hardSet) {
            if (hard.toUpperCase() === upper) return true;
        }

        // 2. Level 2: Context/Phrase Blacklist (User Blocked)
        if (this.phraseSet.has(term)) return true;

        // 3. Level 3: Soft Blacklist (Conditional)
        // If term is in soft blacklist, we block it UNLESS frequency is super high (Revival)
        if (this.softMap.has(term)) {
            const REVIVAL_THRESHOLD = 50; // If it appears 50 times, maybe we shouldn't block it blindly
            if (candidate.count < REVIVAL_THRESHOLD) {
                return true;
            }
        }

        return false;
    }

    private save() {
        if (typeof window === 'undefined') return;

        const data = {
            phrase: Array.from(this.phraseSet),
            soft: Array.from(this.softMap.entries())
        };
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    private load() {
        if (typeof window === 'undefined') return;

        const raw = localStorage.getItem(this.storageKey);
        if (!raw) return;

        try {
            const data = JSON.parse(raw);
            if (data.phrase) {
                data.phrase.forEach((t: string) => this.phraseSet.add(t));
            }
            if (data.soft) {
                data.soft.forEach(([k, v]: [string, BlacklistEntry]) => this.softMap.set(k, v));
            }
        } catch (e) {
            console.error("Failed to load user blacklist", e);
        }
    }
}

export const blacklistRepo = BlacklistRepository.getInstance();
