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

export type ModernSlangCategory =
   | "reaction"
   | "praise"
   | "insult"
   | "censored_profanity"
   | "behavior";

export interface ModernSlangEntry {
   src: string;
   category: ModernSlangCategory;
   dest: string[];
   note: string;
}

// 5. MODERN SLANG WITH TAXONOMY
export const MODERN_SLANG_MAP: ModernSlangEntry[] = [
   { src: "我靠", category: "reaction", dest: ["Đệt!", "Đệch!", "Vãi!", "Vãi lol!"], note: "Ngã kháo - cảm thán ngôi một, cấm dịch là 'Ta dựa vào' hoặc ghép thành 'Ta đệch'" },
   { src: "我操", category: "reaction", dest: ["Đệt!", "Đệch!", "ĐM!", "Vãi lol!"], note: "Ngã thao - cảm thán/chửi ngôi một, không dịch từng chữ và cấm ghép 'Ta đệch'" },
   { src: "我去", category: "reaction", dest: ["Vãi!", "Ơ kìa!", "Vái nhái!", "Đệt!"], note: "Ngã khứ - cảm thán bất ngờ, không dịch là 'Ta đi'" },
   { src: "卧槽", category: "reaction", dest: ["Đệt!", "Đệch!", "Vãi lol!", "Vãi cứt!"], note: "Ngoại tào - cảm thán sốc mạnh, cấm dịch literal hoặc ghép với đại từ cổ" },
   { src: "靠", category: "reaction", dest: ["Đệch!", "Vãi thật!", "Vãi lol!", "Xúi quẩy!"], note: "Kháo" },
   { src: "绷不住了", category: "reaction", dest: ["Không nhịn nổi nữa!", "Cười ỉa!", "Đỡ kiểu gì được!", "Bó tay thật!"], note: "Reaction bật cười/sụp đổ cảm xúc, không dịch literal" },
   { src: "离谱", category: "reaction", dest: ["Vô lý vãi!", "Lố bịch thật!", "Khó đỡ vãi!", "Quá ba chấm!"], note: "Chê cái gì đó quá mức, khó tin" },
   { src: "逆天", category: "reaction", dest: ["Bá đạo vãi!", "Lỗi game thật!", "Phi lý vãi!", "Quá trời luôn!"], note: "Mức độ vượt chuẩn, có thể khen hoặc chê tùy câu" },
   { src: "乱七八糟", category: "reaction", dest: ["loạn mẹ hết cả lên", "lung ta lung tung", "rối như canh hẹ", "lôm côm vãi"], note: "Tả trạng thái bừa bộn/hỗn loạn, không đọc Hán Việt" },
   { src: "一脸懵逼", category: "reaction", dest: ["đơ cmn mặt", "ngu người luôn", "mặt đần ra", "đứng hình luôn"], note: "Reaction ngơ ngác/sốc, không dịch literal" },

   { src: "666", category: "praise", dest: ["Đỉnh vkl", "Gắt đấy", "Ảo thật", "Hay vl"], note: "Meme số dùng để hype/khen, tuyệt đối không đọc số ra chữ" },
   { src: "太6了", category: "praise", dest: ["Gắt thật đấy", "Đỉnh vkl", "Ảo ma thật", "Hay vl"], note: "Khen ai/cái gì đó quá đỉnh" },
   { src: "牛逼", category: "praise", dest: ["đỉnh thật", "ghê thật", "bá đạo", "xịn thật"], note: "Khen/ngạc nhiên, không dịch thô là 'trâu bức'" },

   { src: "妈的", category: "censored_profanity", dest: ["ĐM!", "Đệt!", "Đệch!", "Vãi cứt!"], note: "Ma đích - trợ từ chửi thề, không dịch theo nghĩa 'mẹ của ai đó'" },
   { src: "他妈的", category: "censored_profanity", dest: ["ĐM!", "Đệt!", "Đệch!", "Vãi lol!"], note: "Chửi thề nhẹ/mạnh tùy ngữ cảnh" },
   { src: "我他妈", category: "censored_profanity", dest: ["Đệt", "Đệch", "ĐM", "Vãi thật"], note: "Cụm chửi chen giữa câu, cấm dịch thành 'Ta con mẹ nó' hoặc 'Ta đệch'" },
   { src: "你他妈", category: "censored_profanity", dest: ["Đệch", "ĐM", "Đệt", "Vãi lol"], note: "Cụm chửi nhắm vào đối phương, cấm dịch thành 'Ngươi con mẹ nó' hoặc 'Ngươi đệch'" },
   { src: "操你妈", category: "censored_profanity", dest: ["ĐM!", "Đệch!", "Cút đi!", "Khốn kiếp!"], note: "Chửi cực gắt, ưu tiên rút gọn thành 'ĐM', không tự chế thành 'địt bố mày'" },
   { src: "草泥马", category: "censored_profanity", dest: ["ĐM!", "Vãi cứt!", "Đệt mịa!", "Vãi lol!"], note: "Meme né kiểm duyệt, gốc tục gần với chửi thề, cấm giữ nguyên pinyin/Hán Việt" },
   { src: "千只草泥马", category: "censored_profanity", dest: ["cả đàn ĐM", "đm vãi chưởng", "đệt mịa thật sự", "vãi cứt luôn"], note: "Biến thể phóng đại của meme chửi, tuyệt đối không dịch kiểu 'ngàn con thảo nê mã'" },
   { src: "千只草泥马奔腾而过", category: "censored_profanity", dest: ["cả đàn ĐM chạy qua đầu", "đm đúng kiểu cạn lời", "vãi cứt thật sự", "đệt mịa luôn"], note: "Meme phóng đại cảm xúc sốc/cạn lời, cấm dịch literal hoặc Hán Việt" },
   { src: "尼玛", category: "censored_profanity", dest: ["ĐM", "Vãi thật", "Đệt", "Bó tay vãi"], note: "Mắng/chửi lách, cấm giữ nguyên pinyin/Hán Việt" },

   { src: "傻逼", category: "insult", dest: ["đồ ngu", "đồ đần", "ngu vãi", "thằng ngu"], note: "Mắng chửi trực diện, không ép ra 'ngươi thằng điên này' hay 'ngươi đệch bị bệnh'" },

   { src: "腹黑", category: "behavior", dest: ["mưu mô", "thâm sâu", "đen bụng", "cáo già"], note: "Phúc hắc" },
   { src: "装逼", category: "behavior", dest: ["làm màu", "gáy", "ra vẻ", "thích thể hiện"], note: "Trang bức" },
   { src: "骚操作", category: "behavior", dest: ["thao tác cực gắt", "xử lý ảo ma", "màn múa lửa"], note: "Tao thao tác" }
];

export const IDIOM_SYSTEM_RULE = `
- TƯ DUY: Tả cảm giác, không tả sinh lý.
- CẤM: hít hơi lạnh, không đỏ mặt, vấn đề không lớn.
`;
