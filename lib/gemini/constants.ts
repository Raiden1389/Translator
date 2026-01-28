import { IDIOM_SYSTEM_RULE } from "./idioms";

// Update this version whenever CORE_RULES, PRONOUN_RULE or STRUCTURE_RULE changes
export const SYSTEM_VERSION = "v2.3";

/**
 * System Instruction Constants (Optimized for Novel Translation)
 */

// Voice & Tone rules
export const VOICE_TONE_RULE = `
VĂN PHONG & GIỌNG ĐIỆU:
- TRUNG THÀNH VỚI CẢM XÚC: Nếu gốc mỉa mai, châm biếm -> Bản dịch phải giữ được sắc thái đó (dùng các trợ từ phù hợp).
- CẤM TỰ Ý THÊM HÀI: Nếu gốc nghiêm túc, bi thương -> Tuyệt đối không dùng từ lóng hoặc cách nói hài hước.
- Hài hước phải tự nhiên, hợp ngữ cảnh, tránh dùng quá nhiều ngôn ngữ mạng ("trẻ tre").
`;

// Pronoun rules
export const PRONOUN_RULE = `
ĐẠI TỪ & DANH XƯNG:
- 我/我们: Ta, Chúng ta.
- 你/ yourselves: Ngươi, Các ngươi.
- 他/ she / it: Hắn, Nàng, Nó.
- CHỈ viết hoa danh xưng nếu đứng đầu câu.
`;

// Capitalization rules
export const CAPITALIZATION_RULE = `
QUY TẮC VIẾT HOA:
- CHỈ viết hoa Tên riêng (người, địa danh).
- CẤM viết hoa danh từ chung, chức vụ: thứ sử, đô úy, thái thú, tướng quân, nghĩa phụ, chủ công, tiên sinh...
- CẤM viết hoa quan hệ: huynh, đệ, tỷ, muội...
`;

// Line & structure rules
export const STRUCTURE_RULE = `
CẤU TRÚC:
- 1 dòng input = 1 dòng output. Giữ nguyên \\n\\n.
- Giữ nguyên các ký hiệu đặc biệt [], ().
`;

// Core translation rules
export const CORE_RULES = `
YÊU CẦU CỐT LÕI:
1. Trả về JSON { "title": "...", "content": "..." }.
2. Văn phong tiểu thuyết mượt mà, thoát ý, ưu tiên Thuần Việt. 
3. GIỮ HÁN VIỆT cho: Tên người, Địa danh, Binh chủng (VD: Tịnh Châu Lang Kỵ), Chêu thức.
4. KHÔNG giải thích nghĩa đằng sau.
`;

/**
 * Build full system instruction
 */
export function buildSystemInstruction(
    customInstruction?: string,
    glossaryContext?: string
): string {
    const baseStyle = customInstruction ||
        "Bạn là dịch giả tiểu thuyết Trung - Việt cao cấp. Bản dịch phải tự nhiên như người Việt viết, thoát khỏi văn phong 'Convert'.";

    return `${baseStyle}

${CORE_RULES}

${CAPITALIZATION_RULE}

${PRONOUN_RULE}

${VOICE_TONE_RULE}

${IDIOM_SYSTEM_RULE}

${STRUCTURE_RULE}
${glossaryContext || ""}`;
}
