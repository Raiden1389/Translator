// Update this version whenever CORE_RULES, PRONOUN_RULE or STRUCTURE_RULE changes
// to force cache invalidation for all users.
export const SYSTEM_VERSION = "v1.5";

/**
 * System Instruction Constants (Optimized)
 */

// Pronoun rules (hard mapping)
export const PRONOUN_RULE = `
ĐẠI TỪ BẮT BUỘC:
我=Ta, 我们=Chúng ta
你=Ngươi, 你们=Các ngươi
他=Hắn, 她=Nàng, 它=Nó
`;

// Line & structure rules
export const STRUCTURE_RULE = `
CẤU TRÚC:
- 1 dòng input = 1 dòng output.
- Giữ nguyên \\n\\n.
- KHÔNG gộp/tách dòng.
`;

// Idiom rules (Chengyu)
export const IDIOM_RULE = `
BẢO VỆ THÀNH NGỮ (CHENGYU):
- Giữ nguyên dạng Hán Việt cho các thành ngữ bộ 4 chữ hoặc các câu cổ ngữ nổi tiếng (VD: Thiên ngoại hữu thiên, Mã trung xích thố, Nhân trung lữ bố...).
- TUYỆT ĐỐI KHÔNG thuần Việt hóa các thành ngữ này sang nghĩa giải thích (VD: Không dịch "Thiên ngoại hữu thiên" thành "Ngoài trời còn có trời").
`;

// Core translation rules (Minified)
export const CORE_RULES = `
QUY TẮC:
1. Trả về JSON với 2 key: "title" và "content".
2. Chỉ trả về TIẾNG VIỆT. Cấm tiếng Anh.
3. Dịch sát nghĩa, đầy đủ, không bỏ sót.
4. Giữ nguyên [] và cấu trúc danh sách.
5. Chỉ trả về JSON hợp lệ. Không kèm văn bản thừa.
`;

/**
 * Build full system instruction
 */
export function buildSystemInstruction(
    customInstruction?: string,
    glossaryContext?: string
): string {
    const styleInstruction =
        customInstruction ||
        "Dịch Trung–Việt chuyên nghiệp, văn phong tiểu thuyết mượt mà. Ưu tiên từ ngữ Thuần Việt tự nhiên, diễn đạt trôi chảy, thoát ý nhưng vẫn sát nội dung. Chỉ giữ Hán Việt cho tên riêng, chiêu thức. Tuyệt đối tránh hành văn kiểu 'Convert' thô cứng.";

    return `${styleInstruction}

${CORE_RULES}

${PRONOUN_RULE}

${IDIOM_RULE}

${STRUCTURE_RULE}
${glossaryContext || ""}`;
}
