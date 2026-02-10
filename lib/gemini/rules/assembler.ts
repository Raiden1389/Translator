/**
 * DYNAMIC PROMPT ASSEMBLER v2.2 (Enhanced Quality Rules)
 */
import { buildSystemInstruction } from "../constants";
import { STYLE_PRESSURE_MAP, BATTLE_FEEDBACK_MAP } from "../idioms";

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
    // 🛡️ SYNC: Use the central builder to ensure Title and Format rules are applied
    const baseInstruction = buildSystemInstruction(customInstruction, glossaryContext, false);

    // Smart Idioms injection
    const relevantIdioms = originalText ? getRelevantIdioms(originalText) : "";

    return `${baseInstruction}\n${relevantIdioms}`;
}
