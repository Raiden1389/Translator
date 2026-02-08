import { withKeyRotation, recordUsage } from "./client";
import { extractResponseText } from "./contentProcessor";

/**
 * Generate a book summary (blurb) based on context
 */
export async function generateBookSummary(context: string, aiModel: string, onLog?: (msg: string) => void) {
    const systemPrompt = `[BẮT BUỘC] Bạn là chuyên gia marketing và dịch giả cao cấp.
Nhiệm vụ: Viết đoạn giới thiệu (Blurb) cực kỳ hấp dẫn cho bộ truyện này.

[QUY TẮC NGHIÊM NGẶT]:
1. ⛔ TUYỆT ĐỐI KHÔNG giữ lại bất kỳ chữ Hán (tiếng Trung) nào.
2. ⛔ KHÔNG dùng ngoặc đơn để giải thích tên gốc (Ví dụ: SAI: "Trần Thật (Chen Shi)", ĐÚNG: "Trần Thật").
3. Chỉ viết bằng tiếng Việt thuần túy, chuyên nghiệp, khơi gợi trí tò mò của người đọc.
4. Lọc bỏ các thông tin rác, các ký tự lạ hoặc định mã nguồn nếu có trong ngữ cảnh.`;

    return withKeyRotation<string>({
        model: aiModel.trim(),
        systemInstruction: systemPrompt,
        prompt: `Dựa trên nội dung sau, hãy viết một bản giới thiệu truyện (Blurb) thật "quyền lực" và hấp dẫn:\n\n${context}\n\n[BẢN GIỚI THIỆU TIẾNG VIỆT QUYẾN RŨ]:`,
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

