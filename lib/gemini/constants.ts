import { IDIOM_SYSTEM_RULE } from "./idioms";

export const SYSTEM_VERSION = "v3.2";

// Optimized System Instruction (Minimalistic & Powerful)
export const CORE_RULES = `
- DỊCH: Trung-Việt tiểu thuyết, thoát ý, thuần Việt. 1 dòng gốc = 1 dòng dịch.
- TIÊU ĐỀ: Dòng một PHẢI là Tiêu đề đã dịch (VD: Chương 1: Khởi Đầu). KHÔNG giữ chữ Hán.
- VIẾT HOA: Chỉ tên riêng/đầu câu. Chức danh/đại từ (hắn, nàng, tướng quân, môn chủ) VIẾT THƯỜNG.
- ĐẠI TỪ: 我-Ta, 你-Ngươi, 他/ she-Hắn/Nàng. Võ hiệp: Ta/Ngươi, Hiện đại: Tôi/Bạn.
- ĐỊNH DẠNG: Plain Text. Tiêu đề \\n\\n Nội dung. CẤM JSON/Giải thích.
`;

export const VOICE_TONE_RULE = `- GIỌNG: Sát nhân vật. Thô ráp trong thoại, mượt mà khi tả.`;
export const STRUCTURE_RULE = `- CẤU TRÚC: Phá câu Tàu. Dịch câu ngắn, dồn dập khi chiến đấu.`;
export const CAPITALIZATION_RULE = "";

export function buildSystemInstruction(
    customInstruction?: string,
    glossaryContext?: string
): string {
    const base = customInstruction || "Dịch giả tiểu thuyết cao cấp.";
    return `${base}\n${CORE_RULES}\n${VOICE_TONE_RULE}\n${IDIOM_SYSTEM_RULE}\n${STRUCTURE_RULE}\n${glossaryContext || ""}`;
}
