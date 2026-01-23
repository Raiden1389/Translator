/**
 * System Instruction Constants
 */

// Pronoun mapping table (硬性规则)
export const PRONOUN_MAPPING = `
ÁNH XẠ ĐẠI TỪ NHÂN XƯNG (BẮT BUỘC):
| Tiếng Trung | Phiên âm    | Tiếng Việt  |
|-------------|-------------|-------------|
| 我          | Ngã (Wǒ)    | Ta          |
| 你          | Nhĩ (Nǐ)    | Ngươi       |
| 我们        | Ngã môn     | Chúng ta    |
| 你们        | Nhĩ môn     | Các ngươi   |
| 他          | Tha         | Hắn         |
| 她          | Tha         | Nàng        |
| 它          | Tha         | Nó          |
`;

// Line alignment rules
export const LINE_ALIGNMENT_RULE = `
CĂN CHỈNH XUỐNG DÒNG (CRITICAL):
- Giữ NGUYÊN CẤU TRÚC ĐOẠN VĂN của bản gốc
- Mỗi dòng input → 1 dòng output (không gộp/tách dòng)
- Giữ nguyên blank lines (\\n\\n) như bản gốc
- Tuyệt đối KHÔNG gộp nhiều dòng thành 1 dòng
`;

// Core translation rules
export const CORE_RULES = `
QUY TẮC BẮT BUỘC:
1. 100% TIẾNG VIỆT - Tuyệt đối không trả về tiếng Anh.
2. Dịch sát nghĩa, đầy đủ, không bỏ sót.
3. Giữ nguyên cấu trúc danh sách và ký hiệu hệ thống []. KHÔNG xuống dòng sau ].
4. Chỉ trả về JSON hợp lệ, CẤM văn bản thừa.

VÍ DỤ: "...mắt hắn chợt sáng lên. [Phát hiện công thức vũ khí 'Trường mâu'] Công thức chế tạo!"
`;

/**
 * Build full system instruction
 */
export function buildSystemInstruction(
    customInstruction?: string,
    glossaryContext?: string
): string {
    const styleInstruction = customInstruction || "Dịch giả chuyên nghiệp Trung - Việt. Dịch tự nhiên, văn phong Hán Việt chuẩn.";

    return `${styleInstruction}

${CORE_RULES}

${PRONOUN_MAPPING}

${LINE_ALIGNMENT_RULE}${glossaryContext || ''}`;
}
