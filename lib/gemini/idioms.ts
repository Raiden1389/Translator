/**
 * IDIOM & STYLE CONTROL SYSTEM v4.0 - SENSORY STRUCTURE
 * Role: The "Soul" of the translation engine.
 * Focus: Social Feelings vs. Physiological Descriptions.
 */

// 1. HARD BLACKLIST (Cấm tuyệt đối - Diệt tận gốc văn phong Convert giả cầy)
export const HARD_BLACKLIST = [
   "hít một hơi lạnh", "mặt không đỏ tim không đập", "vấn đề không lớn",
   "trong lòng không khỏi", "không khỏi giật mình", "nghênh nhận nhi giải",
   "nhất thời chi gian", "trong khoảnh khắc chi gian", "thanh âm vang lên",
   "trong lòng thầm nghĩ", "xoay người rời đi", "cái địa phương này", "khủng bố như tư",
   "vắt vẻo", "ngã nhào", "ngơ ngác", "thì ra là thế"
] as const;

// 1.1. BATTLE FEEDBACK (Mô tả va chạm/chiến đấu gắt)
export const BATTLE_FEEDBACK_MAP = [
   { from: "xương cốt kêu rắc rắc", to: "tiếng xương gãy vụn nghe rợn người" },
   { from: "âm thanh vang dội", to: "một tiếng nổ điếc tai" },
   { from: "ngã xuống đất", to: "đập mạnh xuống đất", note: "Tạo cảm giác đau đớn" },
   { from: "máu chảy thành sông", to: "máu tươi loang lổ khắp nơi", note: "Tránh ước lệ" },
   { from: "văng ra ngoài", to: "bị hất văng", replacement2: "bay tuốt ra xa" }
];

// 2. STYLE PRESSURE (Ép thay thế mềm - Rewrite sang tiếng Việt tự nhiên)
export const STYLE_PRESSURE_MAP = [
   { from: "vấn đề không lớn", to: ["không sao", "chẳng đáng ngại", "không thành vấn đề"] },
   { from: "trong nháy mắt", to: ["thoáng chốc", "chớp mắt", "trong chớp mắt"] },
   { from: "ánh mắt lóe lên", to: ["ánh mắt chợt sáng", "ánh mắt sắc lẹm"] },
   { from: "cười khổ", to: ["cười gượng", "cười cay đắng", "gượng cười"] },
   { from: "đáng tiếc", to: ["tiếc là", "uổng công", "thật tiếc"] },
   { from: "nhìn thấy", to: ["bắt gặp", "trông thấy", "nhận ra"] },
   // Nhóm Thân thể & Trạng thái (Body & State)
   { from: "khóe miệng giật giật", to: ["mặt nhăn nhó", "gượng cười", "vẻ mặt khó coi"] },
   { from: "thanh âm", to: ["giọng nói", "tiếng thét", "tiếng động"] },
   { from: "thân ảnh", to: ["bóng người", "dáng vẻ", "hình dáng"] },
   // Nhóm Thể diện (Face & Pride)
   { from: "đâu kiểm", to: ["muối mặt", "nhục nhã", "mất mặt", "không còn lỗ nẻ mà chui"] },
   { from: "mất mặt", to: ["muối mặt", "nhục nhã", "xấu hổ"] },
   { from: "tỉnh để chi oa", to: ["ếch ngồi đáy giếng", "hạng kiến thức nông cạn"] }
];

// 3. STRUCTURAL BLACKLIST (Bắt cấu trúc câu - Regex Pro Max)
export const STRUCTURAL_BLACKLIST = [
   { pattern: /bất\s*quá/i, note: "Tránh: nói chung thì, xét cho cùng" },
   { pattern: /bởi\s*vì[\s\S]*?cho\s*nên/i, note: "Cấu trúc nhân quả lai Tàu" },
   { pattern: /sở\s*dĩ[\s\S]*?là\s*vì/i, note: "Cấu trúc giải thích rườm rà" },
   { pattern: /không\s*[^.\n]*?\s*nào\s*không/i, note: "Phủ định của phủ định kiểu Hán Việt" },
   { pattern: /có\s*thể\s*thấy\s*rằng/i, note: "Văn phong AI giải thích" }
];

// 4. WHITELIST WITH CONTEXT LOCK
export const WHITELIST = [
   { phrase: "thiên hạ vô song", contexts: ["historical", "martial", "xianxia"] },
   { phrase: "nhân trung Lữ Bố", contexts: ["historical"] },
   { phrase: "phản phác quy chân", contexts: ["xianxia", "martial"] }
];

// 5. MODERN SLANG WITH MULTI-DEST
export const MODERN_SLANG_MAP = [
   { src: "卧槽", dest: ["Vãi!", "Đậu xanh!", "Cái đệt!", "Đù!"], note: "Ngoại tào" },
   { src: "靠", dest: ["Mịa nó!", "Vãi thật!", "Khốn khiếp!", "Xúi quẩy!"], note: "Kháo" },
   { src: "草泥马", dest: ["Đệt mịa!", "Vãi đạn!", "Khốn kiếp!", "Khốn kiếp!"], note: "Thảo nê mã" },
   { src: "腹黑", dest: ["mưu mô", "thâm sâu", "đen bụng", "cáo già"], note: "Phúc hắc" },
   { src: "装逼", dest: ["làm màu", "gáy", "ra vẻ", "thích thể hiện"], note: "Trang bức" },
   { src: "骚操作", dest: ["thao tác cực gắt", "xử lý ảo ma", "màn múa lửa"], note: "Tao thao tác" }
];

export const IDIOM_SYSTEM_RULE = `
KIỂM SOÁT PHONG CÁCH DỊCH & CẢM QUAN (V5.0 - STORYTELLER):

1. NGUYÊN TẮC CẢM QUAN TỐI THƯỢNG (QUAN TRỌNG NHẤT):
- Người Việt mô tả CẢM GIÁC XÃ HỘI, không mô tả SINH LÝ CƠ THỂ.
- Nếu gốc là phản xạ sinh lý (VD: 倒吸一口凉气 - hít một hơi lạnh) -> PHẢI dịch sang cảm giác (VD: xuýt xoa, giật mình, kinh ngạc).
- Tuyệt đối không để lại các cụm từ mô tả cơ thể máy móc như: "mặt không đỏ tim không đập", "trong lòng không khỏi".

2. DỌN SẠCH HARD BLACKLIST:
- Cấm tuyệt đối sử dụng các cụm: [${HARD_BLACKLIST.join(", ")}]. Thay thế bằng cách diễn đạt thuần Việt.

3. STYLE PRESSURE & BATTLE:
- Chiến đấu: Dùng từ ngữ mạnh, rợn người: [${BATTLE_FEEDBACK_MAP.map(m => `${m.from} -> ${m.to}`).join(", ")}].
- ONOMATOPOEIA (TỪ TƯỢNG THANH): Khuyến khích dùng các từ tượng thanh thuần Việt như "Bốp", "Chát", "Thịch", "Rầm", "Vút" để tăng tính hình động cho cảnh chiến đấu.
- Đời thường: Ưu tiên diễn đạt mềm mại:
${STYLE_PRESSURE_MAP.map(m => `- ${m.from} -> ưu tiên [${m.to.join(", ")}]`).join("\n")}
- ANTI-OVERDRAMATIZATION: Không dùng mô tả kịch tính (rợn người, sát khí, kinh hồn) cho tình huống đời thường hoặc thoại ngắn.

4. DIALOGUE PROTECTION (LỜI THOẠI):
- Luôn phân biệt Lời kể và Lời thoại. 
- Với Lời thoại ngắn: Ưu tiên câu gãy, trực tiếp, ngắn gọn. Tránh dùng thành ngữ hoặc mô tả cảm xúc dài dòng (VD: "Cút!" là "Cút!", không phải "Cút đi cho ta!").
- SLANG PACING: Không dùng slang mạnh (vãi, đệt, đù) liên tiếp nhiều câu nếu ngữ cảnh không thực sự căng thẳng.

5. SOCIAL REGISTER (PHONG THÁI NHÂN VẬT):
- Xuất thân thấp/Giang hồ: Dùng từ thô, ngắn, trực diện. Tránh văn hoa.
- Địa vị cao/Quý tộc: Lời nói tiết chế, gọn gàng, dùng từ Hán Việt nhã nhặn.

6. STRUCTURE & WHITELIST:
- Phá bỏ cấu trúc "Bởi vì... cho nên", "Sở dĩ... là vì". 1 dòng input = 1 dòng output.
- WHITELIST FLEXIBILITY: Whitelist [${WHITELIST.map(w => w.phrase).join(", ")}] có thể giữ nguyên, nhưng nếu rewrite giúp câu tự nhiên hơn thì ƯU TIÊN REWRITE.

7. ĐỊNH HƯỚNG TÁC GIẢ:
- Bạn là một người kể chuyện, không phải máy dịch. Khi rewrite, hãy giữ nguyên CẢM XÚC và HÀNH ĐỘNG nhưng dùng ngôn ngữ của người Việt thực thụ.
`;
