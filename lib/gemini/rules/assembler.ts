/**
 * DYNAMIC PROMPT ASSEMBLER v2.2 (Enhanced Quality Rules)
 */
import { buildSystemInstruction, getPromptProfileForModel } from "../constants";
import { STYLE_PRESSURE_MAP, BATTLE_FEEDBACK_MAP, MODERN_SLANG_MAP, type ModernSlangCategory, type ModernSlangEntry } from "../idioms";

export interface HeuristicAnalysis {
    isCombat: boolean;
    isPersonalityHeavy: boolean;
    detectedRegister: 'High' | 'Low' | 'Ancient' | 'Cute' | 'Neutral';
    confidence: number;
}

export function analyzeTextHeuristics(text: string): HeuristicAnalysis {
    void text;
    // TEMP OFF:
    // Heuristic hiện tại từng dò keyword tiếng Việt trên text gốc tiếng Trung,
    // nên tín hiệu rất yếu và không đủ đáng tin để tác động prompt.
    // Bật lại khi có bộ keyword tiếng Trung thật và luật inject rõ ràng.
    return { isCombat: false, isPersonalityHeavy: false, detectedRegister: 'Neutral', confidence: 0 };
}

/**
 * Filter Idioms based on text content to keep prompt slim
 */
function getRelevantIdioms(text: string): string {
    void text;
    void STYLE_PRESSURE_MAP;
    void BATTLE_FEEDBACK_MAP;
    // TEMP OFF:
    // Dynamic idiom injection này cũng từng dò phrase tiếng Việt trên text tiếng Trung,
    // nên gần như không match được gì ngoài việc làm code khó hiểu hơn.
    return "";
}

const SLANG_CATEGORY_LABELS: Record<ModernSlangCategory, string> = {
    reaction: "SLANG CẢM THÁN / REACTION",
    praise: "SLANG KHEN / HYPE",
    insult: "SLANG CHỬI TRỰC DIỆN",
    censored_profanity: "SLANG CHỬI LÁCH / MEME TỤC",
    behavior: "SLANG TẢ HÀNH VI / THÁI ĐỘ",
};

function renderSlangEntry(entry: ModernSlangEntry): string {
    const choices = entry.dest.slice(0, 4).join(" / ");
    return `- ${entry.src} (${entry.note}) -> ưu tiên: ${choices}; CẤM dịch từng chữ/Hán Việt.`;
}

export function buildDynamicSlangHints(text: string): string {
    const rawMatches = MODERN_SLANG_MAP
        .filter(m => text.includes(m.src))
        .sort((a, b) => b.src.length - a.src.length);
    const matches = rawMatches
        .filter((m, index, list) => !list.some((other, otherIndex) =>
            otherIndex < index && other.src.includes(m.src)
        ))
        .slice(0, 8);

    if (matches.length === 0) return "";

    const orderedCategories: ModernSlangCategory[] = [
        "reaction",
        "praise",
        "censored_profanity",
        "insult",
        "behavior",
    ];

    const grouped = orderedCategories
        .map((category) => {
            const entries = matches.filter((m) => m.category === category);
            if (entries.length === 0) return "";
            return `${SLANG_CATEGORY_LABELS[category]}:\n${entries.map(renderSlangEntry).join("\n")}`;
        })
        .filter(Boolean)
        .join("\n");

    return `\nLƯU Ý INTERNET SLANG / KHẨU NGỮ HIỆN ĐẠI CHO ĐOẠN NÀY (BẮT BUỘC ÁP DỤNG):\n- CẤM ghép đại từ cổ với slang hiện đại thành các kiểu ngu như "Ta đệch", "Ngươi đệch", "Ta vãi", "Ngươi vãi".\n${grouped}`;
}

export function assembleSystemInstruction(
    analysis: HeuristicAnalysis,
    glossaryContext: string = "",
    customInstruction?: string,
    originalText?: string,
    model?: string
): string {
    void analysis;
    const profile = getPromptProfileForModel(model);
    const baseInstruction = buildSystemInstruction(customInstruction, glossaryContext, false, profile);

    const relevantIdioms = originalText ? getRelevantIdioms(originalText) : "";
    const relevantSlang = originalText ? buildDynamicSlangHints(originalText) : "";

    return `${baseInstruction}\n${relevantSlang}\n${relevantIdioms}`;
}
