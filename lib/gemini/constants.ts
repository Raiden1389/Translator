import { IDIOM_SYSTEM_RULE } from "./idioms";

export const SYSTEM_VERSION = "v3.3";

// 🔥 CRITICAL: Title Translation Rule (HIGHEST PRIORITY)
export const TITLE_RULE = `[TITLE]: Dòng 1 PHẢI là tiếng Việt 100%. VD: "第一章 开始" -> "Chương 1: Khởi Đầu". CẤM Hán tự.`;

// Optimized System Instruction (Minimalistic & Powerful)
export const CORE_RULES = `
- DỊCH: Trung-Việt tiểu thuyết, thoát ý, thuần Việt. 1 dòng gốc = 1 dòng dịch.
- VIẾT HOA: Tên riêng/đầu câu. Các đại từ (hắn/nàng/tướng quân/môn chủ) VIẾT THƯỜNG.
- ĐẠI TỪ: 我-Ta, 你-Ngươi, 他/她-Hắn/Nàng. Võ hiệp: Ta/Ngươi, Hiện đại: Tôi/Bạn.
- FORMAT: Plain Text. Tiêu đề \\n\\n Nội dung. CẤM JSON/Giải thích.
`;

export const VOICE_TONE_RULE = `- GIỌNG: Sát nhân vật. Thô ráp trong thoại, mượt mà khi tả.`;
export const STRUCTURE_RULE = `- CẤU TRÚC: Phá câu Tàu. Dịch câu ngắn, dồn dập khi chiến đấu.`;
export const CAPITALIZATION_RULE = "";

export function buildSystemInstruction(
    customInstruction?: string,
    glossaryContext?: string
): string {
    const base = customInstruction || "Dịch giả tiểu thuyết cao cấp.";
    // Priority order: Base → Title Rule (CRITICAL!) → Glossary → Core → Voice → Idioms → Structure
    return `${base}\n${TITLE_RULE}\n${glossaryContext || ""}\n${CORE_RULES}\n${VOICE_TONE_RULE}\n${IDIOM_SYSTEM_RULE}\n${STRUCTURE_RULE}`;
}
