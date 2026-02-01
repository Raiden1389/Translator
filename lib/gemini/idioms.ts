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
   "trong lòng thầm nghĩ", "xoay người rời đi", "cái địa phương này", "khủng bố như tư"
] as const;

// 2. STYLE PRESSURE (Ép thay thế mềm - Rewrite sang tiếng Việt tự nhiên)
export const STYLE_PRESSURE_MAP = [
   { from: "vấn đề không lớn", to: ["không sao", "chẳng đáng ngại", "không thành vấn đề"] },
   { from: "trong nháy mắt", to: ["thoáng chốc", "chớp mắt", "trong chớp mắt"] },
   { from: "ánh mắt lóe lên", to: ["ánh mắt chợt sáng", "ánh mắt sắc lẹm"] },
   { from: "cười khổ", to: ["cười gượng", "cười cay đắng", "gượng cười"] },
   { from: "đáng tiếc", to: ["tiếc là", "uổng công", "thật tiếc"] },
   { from: "nhìn thấy", to: ["bắt gặp", "trông thấy", "nhận ra"] }
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
KIỂM SOÁT PHONG CÁCH DỊCH & CẢM QUAN (RULE V4.0):

1. NGUYÊN TẮC CẢM QUAN TỐI THƯỢNG (QUAN TRỌNG NHẤT):
- Người Việt mô tả CẢM GIÁC XÃ HỘI, không mô tả SINH LÝ CƠ THỂ.
- Nếu gốc là phản xạ sinh lý (VD: 倒吸一口凉气 - hít một hơi lạnh) -> PHẢI dịch sang cảm giác (VD: xuýt xoa, giật mình, kinh ngạc).
- Tuyệt đối không để lại các cụm từ mô tả cơ thể máy móc như: "mặt không đỏ tim không đập", "trong lòng không khỏi".

2. DỌN SẠCH HARD BLACKLIST:
- Cấm tuyệt đối sử dụng các cụm: [${HARD_BLACKLIST.join(", ")}]. 
- Thay thế chúng bằng cách diễn đạt thuần Việt, ngắn gọn.

3. STYLE PRESSURE (SỨC ÉP PHONG CÁCH):
- Ưu tiên sử dụng các cách diễn đạt mềm mại hơn:
${STYLE_PRESSURE_MAP.map(m => `- ${m.from} -> ưu tiên [${m.to.join(", ")}]`).join("\n")}

4. ANTI-CONVERT STRUCTURE:
- Phá bỏ cấu trúc "Bởi vì... cho nên", "Sở dĩ... là vì". 
- 1 dòng input = 1 dòng output. Giữ nhịp điệu nhanh, dùng nhiều động từ mạnh.

5. CONTEXT-AWARE MAPPING:
- "Ta - Ngươi" là xưng hô mặc định. 
- Whitelist [${WHITELIST.map(w => w.phrase).join(", ")}] chỉ dùng cho Tiên hiệp/Võ hiệp. Hiện đại phải thoát ý.

6. ĐỊNH HƯỚNG TÁC GIẢ:
- Bạn là một người kể chuyện, không phải máy dịch. Khi rewrite, hãy giữ nguyên CẢM XÚC và HÀNH ĐỘNG nhưng dùng ngôn ngữ của người Việt thực thụ.
`;
