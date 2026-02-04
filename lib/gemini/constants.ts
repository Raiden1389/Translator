import { IDIOM_SYSTEM_RULE } from "./idioms";

export const SYSTEM_VERSION = "v3.3";

// 🔥 CRITICAL: Title Translation Rule (HIGHEST PRIORITY)
export const TITLE_RULE = `[TIÊU ĐỀ]: Dòng 1 = Tiêu đề dịch (第10章 -> Chương 10). CẤM Hán tự, dùng Âm Hán Việt nếu cần. Chỉ viết hoa chữ đầu.`;

// Optimized System Instruction (Minimalistic & Powerful)
export const CORE_RULES = `
- DỊCH: Trung-Việt tiểu thuyết, thoát ý, thuần Việt. 1 dòng gốc = 1 dòng dịch.
- VIẾT HOA: Tên riêng/đầu câu. Các đại từ (hắn/nàng/tướng quân/môn chủ) VIẾT THƯỜNG.
- ĐẠI TỪ: 我-Ta, 你-Ngươi, 他/she-Hắn/Nàng. Võ hiệp: Ta/Ngươi, Hiện đại: Tôi/Bạn. (Hắn/Nàng viết thường).
- FORMAT: Dòng 1 là Tiêu đề, sau đó xuống dòng, các dòng sau là Nội dung. CẤM JSON/Giải thích.
`;

export const VOICE_TONE_RULE = `- GIỌNG: Sát nhân vật. Thô ráp trong thoại, mượt mà khi tả.`;
export const STRUCTURE_RULE = `- CẤU TRÚC: Phá câu Tàu. Dịch câu ngắn, dồn dập khi chiến đấu.`;
export const IDIOM_RULE = `- THÀNH NGỮ 4 CHỮ: Phổ biến (Tam Quốc, võ học) → GIỮ Âm Hán Việt (VD: Nhân trung Lữ Bố mã trung Xích Thố, Thiên hạ vô song). Hiếm/ít người biết → DỊCH thoát ý. Khi nghi ngờ → DỊCH.`;
export const TOP_BLACKLIST = `- CẤM: hít hơi lạnh, mặt không đỏ tim không đập, vấn đề không lớn, trong lòng không khỏi, thanh âm vang lên.`;
export const BATTLE_RULE = `- CHIẾN ĐẤU: Câu ngắn, dồn dập. "Ngã xuống đất" → "Đập mạnh xuống đất". Tạo cảm giác đau, không ước lệ.`;
export const EMOTION_RULE = `- CẢM XÚC: Thể hiện qua ánh mắt, hơi thở, động tác. KHÔNG gọi tên trực tiếp (tức giận, sợ hãi, vui mừng).`;
export const DIALOGUE_RULE = `- HỘI THOẠI: Giống người NÓI, không giống người KỂ. Không mở đầu "nói rằng", "lên tiếng". Đối thoại nhanh → bỏ chủ ngữ.`;
export const CAPITALIZATION_RULE = "";

export function buildSystemInstruction(
    customInstruction?: string,
    glossaryContext?: string
): string {
    const base = customInstruction || "Dịch giả tiểu thuyết cao cấp.";
    // Priority order: Base → Title Rule (CRITICAL!) → Glossary → Core → Voice → Idioms → Structure
    return `${base}\n${TITLE_RULE}\n${glossaryContext || ""}\n${CORE_RULES}\n${VOICE_TONE_RULE}\n${IDIOM_SYSTEM_RULE}\n${STRUCTURE_RULE}`;
}
