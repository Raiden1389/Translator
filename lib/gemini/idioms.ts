/**
 * Idiom Control System
 * Purpose:
 * - Blacklist: Force AI to translate "Convert-look" phrases into natural Vietnamese.
 * - Whitelist: Protect iconic historical/martial arts allusions.
 * - Pattern Rules: Detect & neutralize AI-style / Convert-style sentence patterns.
 */

export const IDIOM_BLACKLIST = [
   // Văn ngôn cấu trúc (Grammar structures that make it look like "Convert")
   "nghênh nhận nhi giải",
   "dĩ hậu", "dĩ tiền", "dĩ chí", "sở dĩ", "dĩ kỳ", "nhi hậu", "hà dĩ",
   "do thử", "cố nhi", "vị chi", "vị tất", "bất đắc dĩ", "dĩ nhiên",
   "bất quá", "kỳ thực", "vô luận", "phát sinh", "tiêu thất",

   // Convert-look phrases (Redundant / unnatural Vietnamese)
   "nhất thời chi gian",
   "trong khoảnh khắc chi gian",
   "tự cổ chí kim",
   "từ đầu chí cuối",
   "nhất cử nhất động",
   "nhất ngôn nhất hành",
   "nhất thời bán khắc",
   "thanh âm vang lên",
   "trong lòng thầm nghĩ",
   "xoay người rời đi",
   "cái địa phương này"
] as const;

export const IDIOM_WHITELIST = [
   // Tam Quốc / Lịch sử kinh điển
   "nhân trung Lữ Bố",
   "mã trung Xích Thố",
   "tam anh chiến Lữ Bố",
   "ngũ hổ tướng",
   "thiên hạ vô song",
   "nhất kỵ đương thiên",
   "vạn phu bất đương",
   "ngôn quá kỳ thực",
   "danh bất hư truyền",

   // Võ hiệp / Tiên hiệp phổ thông
   "võ lâm chí tôn",
   "thiên hạ đệ nhất",
   "anh hùng hào kiệt",
   "chính tà báo ứng",
   "chính tà bất lưỡng lập",
   "hòa quang đồng trần",
   "phản phác quy chân"
] as const;

/**
 * AI / CONVERT TRANSLATION PATTERN RULES
 * Các pattern CẤU TRÚC, không phải từ vựng.
 * Gặp là phải sửa câu, không được giữ nguyên.
 */
export const AI_TRANSLATION_PATTERNS = [
   // 1. MỞ CÂU KIỂU AI (nặng văn, vô chủ thể)
   "có thể thấy rằng",
   "có thể nói là",
   "không thể không nói",
   "điều này cho thấy",
   "từ đó có thể thấy",

   // 2. CÂU NHÂN QUẢ LAI TÀU
   "bởi vì.*cho nên",
   "do đó mà",
   "vì thế mà",
   "từ đó mà",
   "chính vì vậy mà"
] as const;

export const IDIOM_SYSTEM_RULE = `
KIỂM SOÁT THÀNH NGỮ & PHONG CÁCH DỊCH:

1. BLACKLIST:
- Các cụm trong Blacklist BẮT BUỘC phải dịch sang tiếng Việt thuần, cấm giữ Hán Việt.
- Chỉ cần thấy là rewrite câu.

[${IDIOM_BLACKLIST.join(", ")}]

2. WHITELIST:
- Các điển cố, danh xưng mang tính biểu tượng ĐƯỢC PHÉP giữ nguyên Hán Việt.
- Không được Việt hóa làm mất chất.

[${IDIOM_WHITELIST.join(", ")}]

3. AI / CONVERT PATTERN RULE:
- Nếu câu khớp bất kỳ pattern nào sau -> PHẢI viết lại câu theo văn nói Việt.
- Ưu tiên: ngắn, trực diện, có chủ thể rõ.

[${AI_TRANSLATION_PATTERNS.join(", ")}]

4. ANTI-HYBRID RULE:
- Cấm cấu trúc lai Trung: "do đó mà", "bởi vì... cho nên..."
- Dùng tiếng Việt gọn: "nên", "vì vậy", "thế là".

5. FALLBACK:
- Không nằm trong Whitelist -> mặc định dịch thoát ý.
- Ưu tiên người đọc, không ưu tiên chữ.

6. NGUYÊN TẮC CUỐI:
- Truyện đọc như người Việt viết.
- Không giống AI.
- Không giống convert.
`;
