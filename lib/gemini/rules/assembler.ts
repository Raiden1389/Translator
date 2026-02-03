/**
 * DYNAMIC PROMPT ASSEMBLER v2.1 (Smart Contextual Delivery)
 */
import { CORE_RULES, TITLE_RULE } from "../constants";
import { IDIOM_SYSTEM_RULE, STYLE_PRESSURE_MAP, BATTLE_FEEDBACK_MAP } from "../idioms";
import { INTENSITY_RULE_COMPACT } from "./intensity";
import { REGISTER_RULE_COMPACT } from "./register";

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
    const baseStyle = customInstruction || "Dịch giả tiểu thuyết Trung-Việt. Thoát ý, mượt mà.";

    let extra = "";
    if (analysis.isCombat) extra += `\n${INTENSITY_RULE_COMPACT}`;
    if (analysis.detectedRegister !== 'Neutral') extra += `\n${REGISTER_RULE_COMPACT}`;

    // Smart Idioms injection
    const relevantIdioms = originalText ? getRelevantIdioms(originalText) : "";

    // Priority: Title Rule (#1) -> Base Style -> Core Rules -> Contextual Rules -> Glossary
    return `${TITLE_RULE}\n${baseStyle}\n${CORE_RULES}\n${IDIOM_SYSTEM_RULE}${extra}${relevantIdioms}\n${glossaryContext}`;
}
