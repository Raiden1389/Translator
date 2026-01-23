import { Type } from "@google/genai";
import { withKeyRotation } from "./client";
import { extractResponseText } from "./helpers";

/**
 * Generate Prompt Variants for A/B testing
 */
export const generatePromptVariants = async (keywords: string, onLog?: (msg: string) => void): Promise<{ promptA: string, promptB: string }> => {
    return withKeyRotation(async (ai) => {
        const prompt = `Bạn là chuyên gia Prompt Engineering cho việc dịch truyện Trung - Việt.
Nhiệm vụ: Tạo ra 2 phiên bản System Instructions khác nhau dựa trên yêu cầu người dùng.

Yêu cầu người dùng (Keywords/Goals): "${keywords}"

Output JSON:
{
    "promptA": "Phiên bản 1 (Base/Safe): Tập trung vào yêu cầu cơ bản, an toàn, chuẩn mực.",
    "promptB": "Phiên bản 2 (Creative/Strict/Styled): Tập trung vào phong cách cụ thể, sáng tạo hơn hoặc khắt khe hơn theo keywords."
}`;

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        promptA: { type: Type.STRING },
                        promptB: { type: Type.STRING }
                    },
                    required: ["promptA", "promptB"]
                }
            }
        });

        const jsonText = extractResponseText(response);
        return JSON.parse(jsonText || '{"promptA": "", "promptB": ""}');
    }, onLog);
};

/**
 * Evaluate Translation (A/B comparison)
 */
export const evaluateTranslation = async (source: string, resultA: string, resultB: string, onLog?: (msg: string) => void): Promise<{ winner: 'A' | 'B' | 'Draw', reason: string, scoreA: number, scoreB: number }> => {
    return withKeyRotation(async (ai) => {
        const prompt = `So sánh 2 bản dịch tiếng Việt từ văn bản gốc tiếng Trung và chấm điểm.

Original (Chinese): "${source.substring(0, 1000)}"

Translation A: "${resultA.substring(0, 1000)}"

Translation B: "${resultB.substring(0, 1000)}"

Yêu cầu:
- Chấm điểm trên thang 1-10 dựa trên: Độ chính xác, Văn phong (tự nhiên, Hán Việt chuẩn), Ngữ pháp.
- Đưa ra lý do ngắn gọn tại sao bản này tốt hơn bản kia.

Output JSON:
{
    "winner": "A" | "B" | "Draw",
    "reason": "Giải thích ngắn",
    "scoreA": 8.5,
    "scoreB": 9.0
}`;

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        winner: { type: Type.STRING, enum: ["A", "B", "Draw"] },
                        reason: { type: Type.STRING },
                        scoreA: { type: Type.NUMBER },
                        scoreB: { type: Type.NUMBER }
                    },
                    required: ["winner", "reason", "scoreA", "scoreB"]
                }
            }
        });

        const jsonText = extractResponseText(response);
        return JSON.parse(jsonText || '{"winner": "Draw", "reason": "Error", "scoreA": 0, "scoreB": 0}');
    }, onLog);
};
