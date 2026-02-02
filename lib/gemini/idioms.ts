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
- TƯ DUY: Tả CẢM GIÁC (rùng mình), không tả SINH LÝ (hít hơi lạnh).
- CẤM CONVERT: [${HARD_BLACKLIST.slice(0, 5).join(", ")}...]. 1 dòng gốc = 1 dòng dịch thoát ý.
`;
