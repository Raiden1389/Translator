import { Type } from "@google/genai";
import { db } from "../db";
import { InspectionIssue } from "./types";
import { withKeyRotation } from "./client";
import { extractResponseText } from "./helpers";

/**
 * AI Inspector (Quality Control)
 */
export const inspectChapter = async (workspaceId: string, text: string, onLog?: (msg: string) => void): Promise<InspectionIssue[]> => {
    // 1. Get Glossary to avoid false positives
    const dict = await db.dictionary.where('workspaceId').equals(workspaceId).toArray();
    const blacklist = await db.blacklist.where('workspaceId').equals(workspaceId).toArray();
    const blockedWords = new Set(blacklist.map(b => b.word.toLowerCase()));

    // Filter relevant terms present in text
    const relevantDict = dict.filter(d =>
        !blockedWords.has(d.original.toLowerCase()) &&
        text.includes(d.translated) // Check if the TRANSLATED term is in the text
    );

    // Create Context String
    const glossaryContext = relevantDict.length > 0
        ? `\n\nDANH SÁCH THUẬT NGỮ ĐÚNG (KHÔNG BÁO LỖI): \n${relevantDict.map(d => `- "${d.translated}" (Gốc: ${d.original})`).join('\n')}`
        : '';

    return withKeyRotation(async (ai) => {
        const prompt = `Bạn là biên tập viên khó tính (Strict Editor). Hãy rà soát văn bản dịch này và tìm lỗi:
- Untranslated: Những chữ Hán hoặc cụm từ chưa được dịch (tuyệt đối ưu tiên).
- Pronoun: Xưng hô bất nhất (đang huynh đệ chuyển sang anh em, hoặc ngôi thứ loạn).
- Grammar: Lỗi ngữ pháp nghiêm trọng khiến câu vô nghĩa.

${glossaryContext}

Input:
"${text.substring(0, 30000)}"

Yêu cầu:
- Chỉ báo lỗi nếu chắc chắn 100%. Nếu nghi ngờ thì bỏ qua.
- Strict Mode: Không báo những lỗi nhỏ nhặt về văn phong.
- BỎ QUA các từ có trong "DANH SÁCH THUẬT NGỮ ĐÚNG".

Output JSON:
[
  { "original": "text lỗi", "suggestion": "đề xuất sửa", "type": "untranslated", "reason": "chưa dịch" }
]`;

        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            original: { type: Type.STRING },
                            suggestion: { type: Type.STRING },
                            type: { type: Type.STRING },
                            reason: { type: Type.STRING }
                        },
                        required: ["original", "suggestion", "type", "reason"]
                    }
                }
            }
        });

        const jsonText = extractResponseText(response);
        return JSON.parse(jsonText || "[]");
    }, onLog);
};
