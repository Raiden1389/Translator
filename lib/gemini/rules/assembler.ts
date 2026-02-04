/**
 * DYNAMIC PROMPT ASSEMBLER v2.2 (Enhanced Quality Rules)
 */
import { CORE_RULES, TITLE_RULE, IDIOM_RULE, TOP_BLACKLIST, BATTLE_RULE, EMOTION_RULE, DIALOGUE_RULE } from "../constants";
import { IDIOM_SYSTEM_RULE, STYLE_PRESSURE_MAP, BATTLE_FEEDBACK_MAP } from "../idioms";

export interface HeuristicAnalysis {
    isCombat: boolean;
    isPersonalityHeavy: boolean;
    detectedRegister: 'High' | 'Low' | 'Ancient' | 'Cute' | 'Neutral';
    confidence: number;
}

export function analyzeTextHeuristics(text: string): HeuristicAnalysis {
    if (!text || text.length < 300) {
        return { isCombat: false, isPersonalityHeavy: false, detectedRegister: 'Neutral', confidence: 100 };
    }

    const sample = text.substring(0, 500).toLowerCase();

    // Improved Combat Detection
    const combatWords = ["đánh", "giết", "chiến", "oành", "nổ", "máu", "kiếm", "đao", "chiêu", "thức", "động", "lực", "hồn"];
    const combatCount = combatWords.filter(w => sample.includes(w)).length;

    const highScore = ["tiên tử", "tiểu thư", "thanh nhã", "phi phàm"].filter(w => sample.includes(w)).length;
    const ancientScore = ["lão quái", "trưởng bối", "lão tổ", "bối phận"].filter(w => sample.includes(w)).length;

    let detectedRegister: 'High' | 'Low' | 'Ancient' | 'Cute' | 'Neutral' = 'Neutral';
    if (highScore > 1) detectedRegister = 'High';
    else if (ancientScore > 1) detectedRegister = 'Ancient';

    return {
        isCombat: combatCount > 2,
        isPersonalityHeavy: (highScore + ancientScore) > 1,
        detectedRegister,
        confidence: 100
    };
}

/**
 * Filter Idioms based on text content to keep prompt slim
 */
function getRelevantIdioms(text: string): string {
    const raw = text.toLowerCase();
    const relevant: string[] = [];

    // Check Battle Idioms
    BATTLE_FEEDBACK_MAP.forEach(m => {
        if (raw.includes(m.from.toLowerCase())) {
            relevant.push(`${m.from} -> ${m.to}`);
        }
    });

    // Check Style Idioms (Limit to top 5 to avoid bloat)
    const styleMatches = STYLE_PRESSURE_MAP
        .filter(m => raw.includes(m.from.toLowerCase()))
        .slice(0, 5);

    styleMatches.forEach(m => {
        relevant.push(`${m.from} -> ưu tiên [${m.to.slice(0, 2).join(", ")}]`);
    });

    if (relevant.length === 0) return "";
    return `\nLƯU Ý THÀNH NGỮ CHO ĐOẠN NÀY (HÃY ÁP DỤNG):\n${relevant.join("\n")}`;
}

export function assembleSystemInstruction(
    analysis: HeuristicAnalysis,
    glossaryContext: string = "",
    customInstruction?: string,
    originalText?: string // New optional param for smart filtering
): string {
    // Use custom instruction if provided, otherwise use default base style
    const baseStyle = customInstruction || "Dịch giả tiểu thuyết Trung-Việt. Thoát ý, mượt mà.";

    // Smart Idioms injection
    const relevantIdioms = originalText ? getRelevantIdioms(originalText) : "";

    // Priority: Title Rule (#1) -> Glossary -> Base Style -> Core Rules -> Quality Rules -> Idioms
    // Quality Rules: Blacklist, Battle, Emotion, Dialogue, Idiom handling
    return `${TITLE_RULE}\n${glossaryContext}\n${baseStyle}\n${CORE_RULES}\n${TOP_BLACKLIST}\n${BATTLE_RULE}\n${EMOTION_RULE}\n${DIALOGUE_RULE}\n${IDIOM_RULE}\n${IDIOM_SYSTEM_RULE}${relevantIdioms}`;
}
