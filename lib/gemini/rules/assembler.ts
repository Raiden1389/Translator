/**
 * PROMPT ASSEMBLER v1.0
 * Purpose: Dynamically assemble the system instruction based on sample analysis.
 */
import { CORE_RULES, CAPITALIZATION_RULE, PRONOUN_RULE, STRUCTURE_RULE, VOICE_TONE_RULE } from "../constants";
import { IDIOM_SYSTEM_RULE } from "../idioms";
import { INTENSITY_RULE_COMPACT } from "./intensity";
import { REGISTER_RULE_COMPACT } from "./register";

export interface HeuristicAnalysis {
    isCombat: boolean;
    isPersonalityHeavy: boolean;
    detectedRegister: 'High' | 'Low' | 'Ancient' | 'Cute' | 'Neutral';
    confidence: number;
}

/**
 * Heuristic Scan v1.0
 * Multi-point sampling (Start, Middle, End) to detect context.
 */
export function analyzeTextHeuristics(text: string): HeuristicAnalysis {
    if (!text || text.length < 300) {
        return { isCombat: false, isPersonalityHeavy: false, detectedRegister: 'Neutral', confidence: 100 };
    }

    const points = [
        text.substring(0, 200),
        text.substring(Math.floor(text.length / 2) - 100, Math.floor(text.length / 2) + 100),
        text.substring(text.length - 200)
    ];

    const sample = points.join(" ").toLowerCase();

    // 1. Detect Combat keywords
    const combatWords = ["đánh", "giết", "chiến", "oành", "nổ", "máu", "kiếm", "đao", "thủ", "công", "bạo"];
    const combatCount = combatWords.filter(w => sample.includes(w)).length;

    // 2. Detect Register
    const highWords = ["tiên tử", "tiểu thư", "thanh nhã", "phi phàm", "thoát tục", "quý"];
    const lowWords = ["lưu manh", "côn đồ", "vĩa", "mịa", "ngưu bức", "trang bức", "gáy"];
    const ancientWords = ["lão quái", "trưởng bối", "lão tổ", "ngàn năm", "tổ sư", "uy nghiêm"];
    const cuteWords = ["tiểu sư muội", "nhí nhảnh", "linh thú", "nha", "nhé", "ngây thơ"];

    const highScore = highWords.filter(w => sample.includes(w)).length;
    const lowScore = lowWords.filter(w => sample.includes(w)).length;
    const ancientScore = ancientWords.filter(w => sample.includes(w)).length;
    const cuteScore = cuteWords.filter(w => sample.includes(w)).length;

    let detectedRegister: 'High' | 'Low' | 'Ancient' | 'Cute' | 'Neutral' = 'Neutral';
    const scores = [
        { type: 'High' as const, score: highScore },
        { type: 'Low' as const, score: lowScore },
        { type: 'Ancient' as const, score: ancientScore },
        { type: 'Cute' as const, score: cuteScore }
    ];

    const top = scores.sort((a, b) => b.score - a.score)[0];
    if (top.score > 2) detectedRegister = top.type;

    // 3. Confidence Calculation
    const totalScore = combatCount + highScore + lowScore + ancientScore + cuteScore;
    let confidence = 50;
    if (totalScore > 5) confidence = 85;
    if (totalScore < 2) confidence = 30; // Ambiguous

    return {
        isCombat: combatCount > 3,
        isPersonalityHeavy: (highScore + lowScore + ancientScore + cuteScore) > 2,
        detectedRegister,
        confidence
    };
}

export function assembleSystemInstruction(analysis: HeuristicAnalysis, glossaryContext: string = "", customInstruction?: string): string {
    const baseStyle = customInstruction || "Bạn là dịch giả tiểu thuyết Trung - Việt cao cấp. Bản dịch phải thoát ý, tự nhiên và ĐẶC BIỆT chú trọng vào cảm xúc người đọc.";

    let extraModules = "";

    // Safety Fallback: Only load modules if confidence > 70
    if (analysis.confidence >= 70) {
        if (analysis.isCombat || analysis.isPersonalityHeavy) {
            extraModules += `\n${INTENSITY_RULE_COMPACT}`;
        }

        if (analysis.detectedRegister !== 'Neutral') {
            extraModules += `\n${REGISTER_RULE_COMPACT}`;
            extraModules += `\nLƯU Ý: Đang ở chế độ Role-play Register: ${analysis.detectedRegister}.`;
        }
    } else {
        extraModules += "\nCHẾ ĐỘ: Trung lập (Neutral Fallback). Ưu tiên sự an toàn và chuẩn mực.";
    }

    return `${baseStyle}

${CORE_RULES}

${CAPITALIZATION_RULE}

${PRONOUN_RULE}

${VOICE_TONE_RULE}

${IDIOM_SYSTEM_RULE}
${extraModules}

${STRUCTURE_RULE}
${glossaryContext}`;
}
