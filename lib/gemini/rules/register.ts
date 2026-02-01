/**
 * CHARACTER SOCIAL REGISTER v1.0
 * Role: Categorize vocabulary based on social status and personality.
 * RULE: Pronoun Rule (Ta/Ngươi) is IMMUTABLE. This only affects adjectives/adverbs.
 */

export const SOCIAL_REGISTERS = {
    // 1. Quý tộc / Tiên tử / Nhã nhặn
    High: {
        keywords: ["tiên tử", "tiểu thư", "quý tộc", "nhã nhặn", "thanh cao"],
        instruction: "Dùng từ ngữ Hán Việt nhẹ nhàng, thoát ý, mỹ miều. Tránh dùng tiếng lóng thô tục."
    },
    // 2. Côn đồ / Lưu manh / Tầng lớp thấp
    Low: {
        keywords: ["lưu manh", "côn đồ", "thô lỗ", "chợ búa", "hệ thống"],
        instruction: "Dùng từ ngữ gãy gọn, ngắn, thô. Được phép dùng tiếng lóng gắt (vãi, mịa, gáy...). Giữ immersion thô ráp."
    },
    // 3. Lão quái / Trưởng bối / Uy nghiêm (Ancient/Philosophical)
    Ancient: {
        keywords: ["lão quái", "trưởng bối", "tổ sư", "lão tổ", "uy nghiêm", "ngàn năm", "trầm mặc"],
        instruction: "Dùng từ ngữ Hán Việt cô đọng, mang tính triết lý, uy nghiêm, nói ít hiểu nhiều."
    },
    // 4. Trẻ con / Nhí nhảnh / Linh thú (Cute/Child)
    Cute: {
        keywords: ["tiểu sư muội", "nhí nhảnh", "linh thú", "trẻ con", "ngây thơ"],
        instruction: "Từ ngữ nhí nhảnh, kéo dài âm tiết (nhé, nha, ạ...), cảm thán nhiều."
    },
    // 5. Trung lập (Mặc định)
    Neutral: {
        keywords: [],
        instruction: "Văn phong tiểu thuyết hiện đại mượt mà, thuần Việt, chuẩn mực."
    }
} as const;

export const REGISTER_RULE_COMPACT = `
CHARACTER VOICE REGISTER:
- High (Tiểu thư/Tiên tử): Mỹ miều, nhã nhặn.
- Low (Lưu manh/Côn đồ): Gãy, thô, lóng gắt (vãi, mịa...).
- Ancient (Lão quái/Lão tổ): Uy nghiêm, triết lý, cô đọng.
- Cute (Tiểu sư muội/Linh thú): Nhí nhảnh, cảm thán (nha, ạ, nhé).
AI phải tự nhận diện vai diễn để dùng từ phù hợp.
`;
