// Update this version whenever CORE_RULES, PRONOUN_RULE or STRUCTURE_RULE changes
// to force cache invalidation for all users.
export const SYSTEM_VERSION = "v1.2";

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
        "Dịch Trung–Việt chuyên nghiệp. Văn phong Hán Việt chuẩn, tự nhiên.";

    return `${styleInstruction}

${CORE_RULES}

${PRONOUN_RULE}

${STRUCTURE_RULE}
${glossaryContext || ""}`;
}
