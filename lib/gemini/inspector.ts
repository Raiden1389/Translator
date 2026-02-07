import { db } from "../db";
import { InspectionIssue } from "../types";
import { withKeyRotation } from "./client";
import { extractResponseText } from "./contentProcessor";

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

    // 2. Get Character List to prevent false positives on name inconsistency
    const characters = dict.filter(d =>
        (d.type === 'character' || d.type === 'name') &&
        text.includes(d.translated)
    );

    // Create Context Strings
    const glossaryContext = relevantDict.length > 0
        ? `\n\nDANH SÁCH THUẬT NGỮ ĐÚNG (KHÔNG BÁO LỖI): \n${relevantDict.map(d => `- "${d.translated}" (Gốc: ${d.original})`).join('\n')}`
        : '';

    const characterContext = characters.length > 0
        ? `\n\nDANH SÁCH NHÂN VẬT (ĐÂY LÀ NHỮNG NGƯỜI KHÁC NHAU - KHÔNG BÁO LỖI TRÙNG TÊN):\n${characters.map(c => {
            const role = c.metadata?.role || 'unknown';
            const gender = c.metadata?.gender || '';
            return `- "${c.translated}" (Gốc: ${c.original}, vai trò: ${role}${gender ? `, giới tính: ${gender}` : ''})`;
        }).join('\n')}`
        : '';

    return withKeyRotation<unknown>({
        model: "gemini-2.0-flash",
        systemInstruction: `Bạn là biên tập viên truyện Trung-Việt khó tính.

QUY TẮC QUAN TRỌNG:
1. Tìm lỗi: Untranslated (chữ Hán chưa dịch), Pronoun (đại từ sai), Grammar (ngữ pháp)
2. KHÔNG báo lỗi về tên nhân vật trong danh sách - đây là những người KHÁC NHAU
3. Nếu thấy 2 tên tương tự (VD: "Lưu Bang", "Lưu Duệ") → Kiểm tra danh sách nhân vật TRƯỚC
4. CHỈ báo lỗi inconsistency NẾU CHẮC CHẮN là cùng 1 người nhưng dịch khác tên
5. Khi KHÔNG CHẮC → KHÔNG báo lỗi`,
        prompt: `${glossaryContext}${characterContext}

Input:
"${text.substring(0, 30000)}"

Yêu cầu output JSON mảng các object: { original, suggestion, type, reason }.`,
        generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json"
        }
    }, onLog).then(raw => {
        const jsonText = extractResponseText(raw);
        return JSON.parse(jsonText || "[]");
    });
};
