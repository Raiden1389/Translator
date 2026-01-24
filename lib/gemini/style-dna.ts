import { StyleDNA } from "./types";
import { withKeyRotation } from "./client";
import { extractResponseText } from "./helpers";

/**
 * Analyze Style DNA from sample chapters
 */
export const analyzeStyleDNA = async (chaptersContent: string[], onLog?: (msg: string) => void): Promise<StyleDNA> => {
    return withKeyRotation<any>({
        model: "gemini-2.0-flash-exp",
        systemInstruction: "Bạn là nhà phê bình văn học và chuyên gia phân tích văn phong truyện Trung-Việt.",
        prompt: `Phân tích đoạn văn mẫu sau để trích xuất \"DNA Văn Học\" (Style DNA): 
        
${chaptersContent.join('\n\n').substring(0, 8000)}...

Yêu cầu output JSON với các field: tone, setting, pronouns, keywords, description.`,
        generationConfig: {
            temperature: 0.4,
            responseMimeType: "application/json"
        }
    }, onLog).then(raw => {
        const jsonText = extractResponseText(raw);
        try {
            return JSON.parse(jsonText || '{}');
        } catch (e) {
            console.error("Failed to parse Style DNA JSON", e);
            return {} as StyleDNA;
        }
    });
};
