import { withKeyRotation } from "./client";
import { extractResponseText } from "./helpers";

/**
 * Generate Prompt Variants for A/B testing
 */
export const generatePromptVariants = async (keywords: string, onLog?: (msg: string) => void): Promise<{ promptA: string, promptB: string }> => {
    return withKeyRotation<any>({
        model: "gemini-2.0-flash-exp",
        systemInstruction: "Bạn là chuyên gia Prompt Engineering cho việc dịch truyện Trung - Việt.",
        prompt: `Nhiệm vụ: Tạo ra 2 phiên bản System Instructions khác nhau: (A) Chuẩn mực, (B) Sáng tạo/Khắt khe. Keywords: "${keywords}"`,
        generationConfig: {
            temperature: 0.8,
            responseMimeType: "application/json"
        }
    }, onLog).then(raw => {
        const jsonText = extractResponseText(raw);
        return JSON.parse(jsonText || '{"promptA": "", "promptB": ""}');
    });
};

/**
 * Evaluate Translation (A/B comparison)
 */
export const evaluateTranslation = async (source: string, resultA: string, resultB: string, onLog?: (msg: string) => void): Promise<{ winner: 'A' | 'B' | 'Draw', reason: string, scoreA: number, scoreB: number }> => {
    return withKeyRotation<any>({
        model: "gemini-2.0-flash-exp",
        systemInstruction: "So sánh và chấm điểm bản dịch truyện Trung-Việt.",
        prompt: `Original: ${source.substring(0, 500)}\n\nA: ${resultA.substring(0, 500)}\n\nB: ${resultB.substring(0, 500)}`,
        generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json"
        }
    }, onLog).then(raw => {
        const jsonText = extractResponseText(raw);
        return JSON.parse(jsonText || '{"winner": "Draw", "reason": "Error", "scoreA": 0, "scoreB": 0}');
    });
};
