import { withKeyRotation, recordUsage } from "./client";
import { extractResponseText } from "./contentProcessor";

/**
 * Generate a book summary (blurb) based on context
 */
export async function generateBookSummary(context: string, aiModel: string, onLog?: (msg: string) => void) {
    return withKeyRotation<string>({
        model: aiModel.trim(),
        systemInstruction: "Bạn là dịch giả chuyên nghiệp. Hãy viết blurb (giới thiệu truyện) hấp dẫn dựa trên nội dung trích dẫn.",
        prompt: `Nội dung trích dẫn:\n${context}\n\nĐOẠN MÔ TẢ CHI TIẾT (TIẾNG VIỆT):`,
        generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 2048
        }
    }, onLog).then(raw => {
        const text = extractResponseText(raw);
        // usage recording logic remains
        const rawResponse = raw as { usageMetadata?: { promptTokenCount?: number, candidatesTokenCount?: number } };
        if (rawResponse.usageMetadata) {
            recordUsage(aiModel, rawResponse.usageMetadata);
        }
        return text.trim();
    });
}
