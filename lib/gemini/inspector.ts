import { db } from "../db";
import { InspectionIssue } from "../types";
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

    return withKeyRotation<any>({
        model: "gemini-2.0-flash-exp",
        systemInstruction: "Bạn là biên tập viên truyện Trung-Việt khó tính. Hãy tìm lỗi Untranslated, Pronoun, Grammar.",
        prompt: `${glossaryContext}

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
