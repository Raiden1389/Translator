import { Type } from "@google/genai";
import { StyleDNA } from "./types";
import { withKeyRotation } from "./client";
import { extractResponseText } from "./helpers";

/**
 * Analyze Style DNA from sample chapters
 */
export const analyzeStyleDNA = async (chaptersContent: string[], onLog?: (msg: string) => void): Promise<StyleDNA> => {
    return withKeyRotation(async (ai) => {
        // Limit content to ~20k chars to save tokens but get enough context
        const sampleText = chaptersContent.join('\n\n').substring(0, 20000);

        const prompt = `Bạn là nhà phê bình văn học và chuyên gia phân tích văn phong.
Nhiệm vụ: Phân tích đoạn văn mẫu từ 5 chương đầu của một bộ truyện để trích xuất "DNA Văn Học" (Style DNA).

Input Text:
"${sampleText}..."

Yêu cầu output JSON:
{
    "tone": "Giọng văn chủ đạo (VD: Hài hước, Trầm mặc, Sôi nổi...)",
    "setting": "Bối cảnh câu chuyện (VD: Tiên hiệp cổ điển, Mạt thế hiện đại...)",
    "pronouns": "Cách xưng hô đặc trưng của nhân vật chính/phụ (VD: Ta-Ngươi, Hắn-Nàng, Tôi-Cậu...)",
    "keywords": ["từ khóa 1", "từ khóa 2", "từ khóa 3"],
    "description": "Một đoạn mô tả ngắn gọn (2-3 câu) tổng hợp phong cách để ra lệnh cho AI dịch thuật bắt chước theo."
}`;

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        tone: { type: Type.STRING },
                        setting: { type: Type.STRING },
                        pronouns: { type: Type.STRING },
                        keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                        description: { type: Type.STRING }
                    },
                    required: ["tone", "setting", "pronouns", "keywords", "description"]
                }
            }
        });

        const jsonText = extractResponseText(response);
        return JSON.parse(jsonText || '{}');
    }, onLog);
};
