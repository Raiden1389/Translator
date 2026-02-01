/**
 * EMOTION INTENSITY LADDER v1.1
 * Purpose: Map abstract emotions to tiered Vietnamese expressions.
 * Logic: [1: Light] -> [2: Medium] -> [3: Heavy/Climax]
 */

export const INTENSITY_MATRIX = {
    // 1. Shock/Surprise (Bất ngờ)
    Shock: {
        1: "khẽ giật mình",
        2: "xuýt xoa kinh ngạc",
        3: "sững sờ, đứng hình"
    },
    // 2. Fear/Danger (Sợ hãi/Nguy hiểm)
    Fear: {
        1: "chột dạ",
        2: "toát mồ hôi hột",
        3: "lạnh sống lưng (đời thường) | kinh hồn bạt vía (võ hiệp)"
    },
    // 3. Regret/Bitterness (Tiếc nuối/Đắng cay)
    Regret: {
        1: "gượng cười",
        2: "cười khan",
        3: "cười cay đắng, tuyệt vọng"
    },
    // 4. Pace/Momentum (Nhịp điệu/Tốc độ)
    Pace: {
        1: "thoáng chốc",
        2: "trong chớp mắt",
        3: "nhanh như điện xuyệt"
    },
    // 5. Contempt/Disdain (Khinh miệt)
    Contempt: {
        1: "cười nhạt",
        2: "khịt mũi",
        3: "cười khẩy, cười lạnh"
    },
    // 6. Pain (Đau đớn)
    Pain: {
        1: "khẽ nhíu mày",
        2: "mặt tái mét vì đau",
        3: "đau thấu xương tủy (nặng) | đau muốn chết đi sống lại (cao trào)"
    },
    // 7. Anger (Giận dữ)
    Anger: {
        1: "mặt hằm hằm",
        2: "giận tím mặt",
        3: "nổi trận lôi đình (đời thường) | sát khí ngút trời (chiến đấu)"
    },
    // 8. Calm/Neutral (Bình thản - Giúp giảm mệt khi đọc)
    Calm: {
        1: "bình thản",
        2: "điềm nhiên",
        3: "lặng lẽ, không chút gợn sóng"
    },
    // 9. Pride/Confidence (Tự tin/Kiêu ngạo)
    Pride: {
        1: "tỏ vẻ tự tin",
        2: "ngẩng cao đầu",
        3: "coi thường tất cả, khí thế áp đảo"
    }
} as const;

export const INTENSITY_RULE_COMPACT = `
EMOTION INTENSITY LADDER (v1.1):
Chọn từ theo cường độ cảm xúc và ngữ cảnh:
- Shock: [1:khẽ giật mình, 2:xuýt xoa, 3:sững sờ]
- Fear: [1:chột dạ, 2:toát mồ hôi, 3:lạnh gáy/kinh hồn]
- Regret: [1:cười gượng, 2:cười khan, 3:cười cay đắng]
- Pace (Speed): [1:thoáng chốc, 2:chớp mắt, 3:nhanh như điện]
- Contempt: [1:cười nhạt, 2:khịt mũi, 3:cười khẩy]
- Pain: [1:nhíu mày, 2:tái mét, 3:đau thấu xương]
- Anger: [1:hằm hằm, 2:tím mặt, 3:nổi trận lôi đình/sát khí]
- Calm: [1:bình thản, 2:điềm nhiên, 3:lặng lẽ không gợn sóng]
- Pride: [1:tự tin, 2:ngẩng cao đầu, 3:coi thường tất cả]

⚠️ QUY TẮC AN TOÀN:
1. TRÁNH ĐỤNG TRẦN: Level 3 chỉ dùng cho Combat hoặc Xung đột trực diện. Đời thường ưu tiên Lv1-Lv2.
2. THOẠI NGẮN: Không áp dụng ladder cho thoại cực ngắn (VD: "Cút!", "Hả?"). Hãy giữ nguyên sự thô ráp.
`;
