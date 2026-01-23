import { withKeyRotation, recordUsage } from "./client";
import { extractResponseText } from "./helpers";

/**
 * Generate a book summary (blurb) based on context
 */
export async function generateBookSummary(context: string, aiModel: string, onLog?: (msg: string) => void) {
    return withKeyRotation(async (ai) => {
        const prompt = `Dựa vào các phần trích dẫn sau đây từ một bộ truyện, hãy viết một đoạn mô tả chi tiết và hấp dẫn (blurb) cho bộ truyện đó.

YÊU CẦU:
- Độ dài: 3-5 đoạn văn (khoảng 200-300 từ)
- Tập trung vào: Bối cảnh thế giới, hệ thống sức mạnh (nếu có), tính cách và hành trình của nhân vật chính
- Phong cách: Lôi cuốn, chuyên nghiệp như một dịch giả truyện, tạo sự tò mò cho độc giả
- Cấu trúc gợi ý:
  + Đoạn 1: Hook - Giới thiệu bối cảnh và tình huống đặc biệt
  + Đoạn 2-3: Mô tả nhân vật chính, thử thách họ phải đối mặt
  + Đoạn 4: Hệ thống sức mạnh/yếu tố đặc biệt của thế giới (nếu có)
  + Đoạn 5: Kết thúc mở, tạo sự tò mò
- Kết quả CHỈ bao gồm đoạn văn mô tả, KHÔNG chứa lời dẫn hay ký hiệu markdown

NỘI DUNG TRÍCH DẪN:
${context}

ĐOẠN MÔ TẢ CHI TIẾT (TIẾNG VIỆT):`;

        const response = await ai.models.generateContent({
            model: aiModel.trim(),
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                temperature: 0.8,
                topP: 0.95,
                maxOutputTokens: 2048,
            }
        });

        const text = extractResponseText(response);

        // Track usage
        recordUsage(aiModel, (response as any).usageMetadata || (response as any).response?.usageMetadata);

        return text.trim();
    }, onLog);
}
