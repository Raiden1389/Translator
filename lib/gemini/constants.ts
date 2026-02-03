import { IDIOM_SYSTEM_RULE } from "./idioms";

export const SYSTEM_VERSION = "v3.3";

// 🔥 CRITICAL: Title Translation Rule (HIGHEST PRIORITY)
export const TITLE_RULE = `
🔥 QUY TẮC TIÊU ĐỀ (BẮT BUỘC - PRIORITY #1):
Dòng ĐẦU TIÊN của output PHẢI là tiêu đề đã dịch HOÀN TOÀN sang tiếng Việt.

VÍ DỤ BẮT BUỘC TUÂN THỦ:
✅ ĐÚNG: "第一章 开始" → "Chương 1: Khởi Đầu"
✅ ĐÚNG: "第104章 顺势" → "Chương 104: Thuận Thế"
✅ ĐÚNG: "第999章 大结局" → "Chương 999: Đại Kết Cục"

❌ SAI: "Chương 104 順勢" (CÒN CHỮ HÁN!)
❌ SAI: "第104章 Thuận Thế" (CÒN CHỮ HÁN!)

⛔ TUYỆT ĐỐI KHÔNG để bất kỳ ký tự Hán nào trong tiêu đề!
`;

// Optimized System Instruction (Minimalistic & Powerful)
export const CORE_RULES = `
- DỊCH: Trung-Việt tiểu thuyết, thoát ý, thuần Việt. 1 dòng gốc = 1 dòng dịch.
- VIẾT HOA: Chỉ tên riêng/đầu câu. Chức danh/đại từ (hắn, nàng, tướng quân, môn chủ) VIẾT THƯỜNG.
- ĐẠI TỪ: 我-Ta, 你-Ngươi, 他/她-Hắn/Nàng. Võ hiệp: Ta/Ngươi, Hiện đại: Tôi/Bạn.
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
    // Priority order: Base → Title Rule (CRITICAL!) → Glossary → Core → Voice → Idioms → Structure
    return `${base}\n${TITLE_RULE}\n${glossaryContext || ""}\n${CORE_RULES}\n${VOICE_TONE_RULE}\n${IDIOM_SYSTEM_RULE}\n${STRUCTURE_RULE}`;
}
