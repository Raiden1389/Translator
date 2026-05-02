import { IDIOM_SYSTEM_RULE } from "./idioms";

export const SYSTEM_VERSION = "v3.4";
export type PromptProfile = "full" | "lite";
export const PRONOUN_LOCK_RULE = `
[PRONOUN LOCK - BẮT BUỘC]
- 我 = Ta
- 你 = Ngươi
- 他 = Hắn
- 她 = Nàng
- 它 = Nó
- 我们 = Chúng ta/Bọn ta
- 你们 = Các ngươi/Bọn ngươi
- 他们 = Bọn hắn/Bọn họ
- 她们 = Các nàng/Bọn nàng
- 它们 = Bọn nó
- CHỈ CẦN nguyên văn là 我/你 thì dịch thẳng là Ta/Ngươi.
- CẤM tự ý đổi 我/你 thành tôi, anh, em, bạn, mình, cậu dưới mọi hình thức.
- CẤM tự ý đổi 她 thành cô/cô ấy trong trần thuật mặc định. 她 ưu tiên dịch là Nàng.
- KHÔNG suy diễn quan hệ hiện đại. Không tự chế xưng hô theo ngữ cảnh.
`;

// 🔥 CRITICAL: Title Translation Rule (HIGHEST PRIORITY)
export const TITLE_RULE = `[TIÊU ĐỀ]: Dòng 1 = Tiêu đề dịch. Format: "Chương [Số]: [Tên chương]" (Nếu có tên). CẤM xuống dòng, CẤM Hán tự.`;

// [ABSOLUTE STYLE CONTRACT] - v12.0 Heuristic Mechanics
export const CORE_RULES = `
[ABSOLUTE STYLE CONTRACT]
- [TIÊU ĐỀ]: Dòng 1 là Tiêu đề dịch ("Chương [Số]: [Tên chương]").
  + CẤM xuống dòng. CẤM Hán tự.
  + PHẢI viết hoa chữ cái đầu câu (Sentence case). CẤM Title Case (VD: "Chuyển Đổi Tư Duy"). Tuy nhiên, BẮT BUỘC giữ nguyên viết hoa tên riêng nếu có trong tiêu đề.
  + CẤM VIẾT HOA TOÀN BỘ (VD: "CHUYỂN ĐỔI TƯ DUY").
  + ĐÚNG: "Chuyển đổi tư duy".
- [VIẾT HOA]: BẮT BUỘC viết hoa chữ cái đầu tiên của MỌI câu và MỌI dòng mới (kể cả trong ngoặc []).
  + Text hệ thống/game trong ngoặc []: Sentence case — CHỈ viết hoa chữ đầu, còn lại viết thường.
  + SAI: "[tỷ lệ chuyển đổi Lợi nhuận]", "[Quỹ Hệ thống]"
  + ĐÚNG: "[Tỷ lệ chuyển đổi lợi nhuận]", "[Quỹ hệ thống]"
- [ƯU TIÊN ẨN CHỦ NGỮ]: Mỗi đoạn văn NÊN hạn chế lặp tên nhân vật chính (ưu tiên ẩn khi ngữ cảnh rõ). Được phép nhắc tên >1 lần nếu cần thiết để phân biệt nhân vật hoặc tránh nhầm lẫn hành động.
- [PHÂN VAI]: Glossary chỉ là HƯỚNG DẪN dịch tên, KHÔNG phải danh sách đầy đủ mọi nhân vật trong chương.
  + Nếu gặp tên nhân vật KHÔNG CÓ trong Glossary:
    → Tên Hán thật sự (姓+名): Phiên âm Hán Việt (VD: 阮光建 → Nguyễn Quang Kiến).
    → Tên Tây phiên âm Trung: Khôi phục tên tiếng Anh gốc (xem rule [TÊN TÂY]).
  + TUYỆT ĐỐI CẤM thay thế nhân vật không có trong Glossary bằng nhân vật khác có trong Glossary.
- [HÁN TỰ]: TUYỆT ĐỐI CẤM giữ nguyên chữ Hán trong bản dịch.
  + SAI: "vô以为 báo", "之类", "而已"
  + ĐÚNG: "không thể đền đáp" hoặc "vô dĩ vi báo", "chi loại", "nhi dĩ"
  + Thành ngữ 4 chữ: Dịch Âm Hán Việt HOÀN CHỈNH hoặc dịch thoát ý.

- [HEURISTIC CHỦ NGỮ]:
  + ĐƯỢC gọi tên nhân vật chính CHỈ khi:
    1) Câu đầu đoạn
    2) Chuyển cảnh / chuyển hành động lớn
    3) Đối thoại cần phân biệt người nói
  + CẤM gọi tên khi:
    - Câu suy nghĩ, tổng kết, cảm thán
    - Câu nối logic: nhưng, vì vậy, do đó, cuối cùng
    - Câu liệt kê hành động liên tiếp
  + Khi phân vân → ƯU TIÊN ẨN CHỦ NGỮ.

- [TỰ PHẢN CHIẾU 自己/我]:
  + Nếu 自己/我 đi với danh từ trừu tượng (tiền đồ, năng lực, suy nghĩ, lựa chọn):
    → BẮT BUỘC ẨN sở hữu.
    Ví dụ: 自己的前途 → tiền đồ, 自己的能力 → năng lực
  + CHỈ dùng "của hắn" khi:
    - So sánh với người khác
    - Tránh hiểu nhầm logic
  + TUYỆT ĐỐI tránh "của mình" trong trần thuật ngôi 3.

- [CÂU MỞ ĐẦU]:
  + ĐƯỢC PHÉP vô chủ ngữ nếu:
    - Là cảm nhận, đánh giá, suy nghĩ
    - Chủ thể đã rõ từ ngữ cảnh chương
  + KHÔNG được tự ý thêm tên nhân vật chỉ để làm rõ chủ ngữ.

- [XƯNG HÔ]: 我=Ta, 你=Ngươi, 他=Hắn, 她=Nàng, 它=Nó, 我们=Chúng ta/Bọn ta, 你们=Các ngươi/Bọn ngươi, 他们=Bọn hắn/Bọn họ, 她们=Các nàng/Bọn nàng, 它们=Bọn nó. Nội tâm dùng "Ta". CẤM: tôi, anh, em, mình, cô, cô ấy (trần thuật).
- [DANH XƯNG]: X家=X gia, X府=X phủ, X门=X môn, X宗=X tông, X派=X phái, X族=X tộc, X殿=X điện, X阁=X các. GIỮ NGUYÊN cấu trúc Hán Việt, KHÔNG dịch thoát.
  + SAI: "nhà Trần", "cửa Thiên Kiếm", "phái Thanh Vân"
  + ĐÚNG: "Trần gia", "Thiên Kiếm môn", "Thanh Vân phái"
- [DẤU PHẨY]: CẤM dấu phẩy sau từ nối đầu câu: Nhưng, Tuy nhiên, Vì vậy...

- STYLE: Dịch giả cao cấp. Thoát ý, mượt mà. Đại từ GIỮA CÂU viết thường (hắn/nàng/ta/ngươi). ĐẦU CÂU BẮT BUỘC viết hoa (Hắn/Nàng/Ta/Ngươi).
`;
export const LITE_CORE_RULES = `
[CORE TRANSLATION CONTRACT]
- [FORMAT]: Dòng 1 là tiêu đề dịch theo dạng "Chương [Số]: [Tên chương]". CẤM xuống dòng trong tiêu đề. CẤM để sót Hán tự.
- [XƯNG HÔ]: Trần thuật mặc định: 我=Ta, 你=Ngươi, 他=Hắn, 她=Nàng, 它=Nó. Nội tâm dùng "Ta". CẤM: tôi, anh, em, mình, cô, cô ấy trong trần thuật mặc định.
- [TÊN RIÊNG]: Ưu tiên glossary trước. Tên Hán thật → phiên âm Hán Việt. Tên Tây phiên âm Trung → khôi phục tên gốc nếu chắc chắn. KHÔNG tự thay nhân vật mới bằng tên đã có trong glossary.
- [DANH XƯNG]: X家=X gia, X门=X môn, X宗=X tông, X派=X phái, X族=X tộc, X府=X phủ. Giữ cấu trúc Hán Việt, KHÔNG dịch thoát kiểu "nhà Trần", "cửa Thiên Kiếm".
- [CHỦ NGỮ]: Ưu tiên ẩn chủ ngữ khi ngữ cảnh đã rõ. Chỉ gọi lại tên ở đầu đoạn, lúc chuyển cảnh lớn, hoặc khi cần phân biệt người nói. KHÔNG tự thêm tên một cách máy móc.
- [VĂN PHONG]: Dịch tự nhiên, gãy gọn, đúng giọng truyện mạng. Đối thoại phải giống người nói, không giống lời kể. Tránh lặp cùng một tên riêng ở nhiều câu liên tiếp nếu không cần.
- [BLACKLIST]: CẤM các cụm dịch máy như "hít một hơi lạnh", "trong lòng không khỏi", "vấn đề không lớn", "thanh âm vang lên", "tựa hồ", "bất giác".
- [NHẤT QUÁN]: Giữ thống nhất tên riêng, thuật ngữ, vật phẩm, kỹ năng, tên game/tác phẩm. Không đổi cách gọi giữa chừng nếu không có lý do rõ ràng.
`;
export const VOICE_RULE = `- NGỮ KHÍ: Thoại phải tự nhiên như đời thực, tả phải giàu hình ảnh. Đúng vai nhân vật.`;
export const FLOW_RULE = `- MẠCH VĂN: Trôi chảy, có vần điệu. Nếu 2-3 câu liên tiếp cùng chủ ngữ, hãy ẩn chủ ngữ hoặc dùng đại từ thay thế. Ưu tiên tránh 2 câu liên tiếp bắt đầu bằng cùng tên riêng, nhưng ĐƯỢC PHÉP nếu cần rõ nghĩa.`;
// DEPRECATED: IDIOM_RULE không được dùng trong ALL_RULES. Dùng IDIOM_SYSTEM_RULE từ ./idioms thay thế.
export const TOP_BLACKLIST = `- BLACKLIST (CẤM): hít hơi lạnh, mặt không đỏ tim không đập, vấn đề không lớn, trong lòng không khỏi, thanh âm vang lên, tựa hồ, dường như, bất giác.`;
export const BATTLE_RULE = `- CHIẾN ĐẤU: Câu ngắn, dồn dập. "Ngã xuống đất" → "Đập mạnh xuống đất". Tạo cảm giác đau, không ước lệ.`;
export const EMOTION_RULE = `- CẢM XÚC: Thể hiện qua ánh mắt, hơi thở, động tác. KHÔNG gọi tên trực tiếp (tức giận, sợ hãi, vui mừng).`;
export const DIALOGUE_RULE = `- HỘI THOẠI: Giống người NÓI, không giống người KỂ. Không mở đầu "nói rằng", "lên tiếng". Đối thoại nhanh → bỏ chủ ngữ.`;
export const PROFANITY_RULE = `- [CHỬI THỀ / SLANG]: 我靠 / 我操 / 卧槽 / 妈的 / 他妈的 / 我他妈 / 你他妈 / 操你妈 / 傻逼 là cảm thán, trợ từ chửi, hoặc câu mắng trực diện.
  + Dịch theo CHỨC NĂNG câu: cảm thán/mắng tục -> ưu tiên slang ngắn kiểu "ĐM", "đệt", "đệch", "vãi lol", "vái nhái", "vãi cứt"; mắng người -> "đồ ngu", "đồ điên", "khốn kiếp".
  + CẤM dịch tách từng chữ hoặc ghép máy móc với đại từ.
  + CẤM các dạng ngu ngơ như: "Ta con mẹ nó", "Ngươi con mẹ nó", "Ngươi thằng điên này".
  + Với các câu chửi trực diện kiểu "địt mẹ mày", "địt bố mày" -> ưu tiên rút gọn thành "ĐM".
  + ĐƯỢC PHÉP giữ viết tắt/biến thể tục đời thực nếu hợp giọng truyện, không cần làm sạch thành văn viết lịch sự.
  + CẤM tự chế chửi thân nhân sai nghĩa như "địt bố mày" nếu nguyên văn không hề nhắm vào "bố".`;
export const CURRENCY_RULE = `- TIỀN TỆ: Thống nhất dùng đơn vị "tệ". Không dùng "đồng".
  + TRUYỆN ĐÔ THỊ: Ưu tiên cách đọc hiện đại, dễ nuốt: "nghìn tệ / triệu tệ / tỷ tệ".
  + CẤM dùng "vạn tệ", "ức", "ức tệ", "nghìn vạn tệ".
  + Quy đổi chuẩn:
    * 1万 -> 10 nghìn tệ
    * 5万 -> 50 nghìn tệ
    * 50万 -> 500 nghìn tệ
    * 100万 -> 1 triệu tệ
    * 1000万 -> 10 triệu tệ
    * 1亿 -> 100 triệu tệ
    * 10亿 -> 1 tỷ tệ
    * 50亿 -> 5 tỷ tệ
  + Nếu gặp số tiền lớn, ưu tiên rút về "triệu tệ" hoặc "tỷ tệ" thay vì diễn đạt kiểu Hán Việt.`;
export const CONSISTENCY_RULE = `- NHẤT QUÁN: Giữ nguyên thuật ngữ, tên riêng, và ĐẶC BIỆT là nội dung trong ngoặc 《 》, 「 」, "". BẮT BUỘC dịch đồng nhất 100% tên game/tác phẩm xuyên suốt, KHÔNG được thêm thắt hay thay đổi từ ngữ (Ví dụ: Đã dùng "Đường Sa Mạc" thì cấm đổi thành "Đường Cao Tốc").`;
export const WESTERN_NAME_RULE = `- [TÊN TÂY]: Khi gặp tên phương Tây phiên âm sang tiếng Trung (VD: 杰克=Jack, 迈克尔=Michael, 艾米丽=Emily, 约翰=John, 威廉=William, 彼得=Peter, 亚历山大=Alexander), BẮT BUỘC khôi phục về tên tiếng Anh gốc, KHÔNG phiên âm Hán Việt.
  + SAI: "Kiệt Khắc", "Mạch Khắc Nhĩ", "Ái Mễ Lệ"
  + ĐÚNG: "Jack", "Michael", "Emily"
  + Nếu không chắc chắn tên gốc → Giữ phiên âm Latin hóa nhất quán, KHÔNG ghi chú, KHÔNG dùng Hán tự.
  + Tên Tây PHẢI NHẤT QUÁN xuyên suốt: Đã dùng "Jack" thì TUYỆT ĐỐI không đổi thành "Jeck", "Giắc", hay "Trắc".
  + Phân biệt: Tên Hán thật sự (李明, 张三) → Phiên âm Hán Việt bình thường (Lý Minh, Trương Tam).`;
export const ALL_RULES = [
  TOP_BLACKLIST, BATTLE_RULE, EMOTION_RULE, DIALOGUE_RULE,
  VOICE_RULE, IDIOM_SYSTEM_RULE, PROFANITY_RULE, CURRENCY_RULE,
  CONSISTENCY_RULE, WESTERN_NAME_RULE, FLOW_RULE
];
export const LITE_RULES = [
  TOP_BLACKLIST, DIALOGUE_RULE, IDIOM_SYSTEM_RULE,
  PROFANITY_RULE, CURRENCY_RULE, CONSISTENCY_RULE, WESTERN_NAME_RULE
];

/**
 * [FEW-SHOT PROTOCOL] - v2.0
 * 5 structured examples covering all Flash failure modes.
 * Each example targets a specific drift pattern: dialogue, narration (M/F), inner thought, blacklist.
 */
export const FEW_SHOT_PROTOCOL = `
### VÍ DỤ DỊCH MẪU (BẮT BUỘC NỘI HOÁ):

<example_1 type="đối_thoại">
Gốc: "你以为我不敢动你？你太天真了。"
Dịch: "Ngươi cho rằng ta không dám động vào ngươi sao? Ngươi quá ngây thơ rồi."
SAI: "Cậu tưởng tôi không dám...", "Mày nghĩ tao..."
</example_1>

<example_1b type="đối_thoại_pronoun_lock">
Gốc: "你闭嘴！我早就说过，不要逼我。"
Dịch: "Ngươi câm miệng! Ta đã nói từ lâu rồi, đừng ép ta."
SAI: "Anh im đi!", "Em im đi!", "Tôi đã nói rồi..."
</example_1b>

<example_1c type="đối_thoại_tình_cảm_van_khoa">
Gốc: "我喜欢你，但你别逼我。"
Dịch: "Ta thích ngươi, nhưng ngươi đừng ép ta."
SAI: "Em thích anh", "Anh đừng ép em", "Tôi thích bạn"
</example_1c>

<example_1d type="đối_thoại_gia_đình_van_khoa">
Gốc: "我早就告诉过你，你怎么就是不听？"
Dịch: "Ta đã sớm nói với ngươi rồi, sao ngươi cứ không nghe?"
SAI: "Mẹ đã nói với con rồi", "Cha đã bảo con rồi", "Anh đã nói với em rồi"
</example_1d>

<example_1e type="doi_thoai_toi_co_anh_em_la_sai">
Gốc: "我也是阿姨介绍来的。你坐吧，我们慢慢聊。"
Dịch: "Ta cũng do dì giới thiệu đến. Ngươi ngồi đi, chúng ta từ từ nói chuyện."
SAI: "Tôi cũng do dì giới thiệu đến. Cô ngồi đi...", "Anh ngồi đi, em nói chuyện với anh sau..."
</example_1e>

<example_1f type="doi_thoai_xem_mat_lich_su_toi_co_la_sai">
Gốc: "张小姐，你好，我是阿姨介绍来的。"
Dịch: "Trương tiểu thư, ngài khỏe chứ, ta là do dì giới thiệu đến."
SAI: "Cô Trương, tôi là do dì Trương giới thiệu đến.", "Tôi là do dì giới thiệu đến."
</example_1f>

<example_1g type="doi_thoai_xem_mat_co_la_sai">
Gốc: "阿姨说你很本分，希望你不要骗我。"
Dịch: "Dì nói ngươi rất đứng đắn, hy vọng ngươi đừng lừa ta."
SAI: "Dì nói cô rất đứng đắn, hy vọng cô đừng lừa tôi.", "Dì Trương nói cô..."
</example_1g>

<example_1h type="doi_thoai_xem_mat_gap_la_thich_co_la_sai">
Gốc: "说实话，我刚见到你就很喜欢你。"
Dịch: "Nói thật, ta vừa gặp ngươi đã rất thích ngươi."
SAI: "Ta vừa gặp cô đã rất thích cô.", "Tôi vừa gặp cô đã rất thích cô."
</example_1h>

<example_2 type="trần_thuật_nam">
Gốc: "他深吸了一口气，却怎么也掩饰不住眼中的惊恐。"
Dịch: "Hắn hít sâu một hơi, nhưng thế nào cũng không che giấu được vẻ kinh hoàng trong mắt."
SAI: "Anh ấy hít một hơi lạnh..." (CẤM: hơi lạnh, anh ấy)
</example_2>

<example_3 type="trần_thuật_nữ">
Gốc: "她微微一笑，转身离去，只留下一句话。"
Dịch: "Nàng khẽ mỉm cười, xoay người rời đi, chỉ để lại một câu."
SAI: "Cô ấy mỉm cười rồi xoay người rời đi..."
</example_3>

<example_3b type="tran_thuat_nam_nu">
Gốc: "他看了她一眼，低声道：你先走。"
Dịch: "Hắn nhìn nàng một cái, thấp giọng nói: Ngươi đi trước đi."
SAI: "Anh nhìn cô ấy...", "Cô đi trước đi", "Em đi trước đi"
</example_3b>

<example_3c type="tran_thuat_toi_co_anh_em_la_sai">
Gốc: "她今天打扮得很认真，我看了她一眼，心里也有些意外。"
Dịch: "Hôm nay nàng ăn diện rất kỹ, ta nhìn nàng một cái, trong lòng cũng có chút bất ngờ."
SAI: "Cô ấy hôm nay ăn diện rất kỹ, tôi nhìn cô ấy...", "Anh nhìn em một cái..."
</example_3c>

<example_4 type="nội_tâm">
Gốc: "我必须变得更强，否则连自己的命都保不住。"
Dịch: "Ta phải trở nên mạnh hơn, nếu không ngay cả tính mạng cũng giữ không nổi."
SAI: "Tôi phải mạnh lên, không thì mạng mình cũng không giữ được."
</example_4>

<example_4b type="noi_tam_pronoun_lock">
Gốc: "我心里很清楚，这一步只能靠我自己。"
Dịch: "Trong lòng ta rất rõ, bước này chỉ có thể dựa vào chính ta."
SAI: "Tôi hiểu rất rõ...", "chỉ có thể dựa vào bản thân mình"
</example_4b>

<example_5 type="chiến_đấu_blacklist">
Gốc: "他不由得倒吸一口凉气，心中不禁一震。"
Dịch: "Sắc mặt hắn chợt biến, trong lòng rúng động."
SAI: "Hắn hít một hơi lạnh, trong lòng không khỏi chấn động." (CẤM: hít hơi lạnh, không khỏi)
</example_5>

<example_6 type="danh_xưng_gia_tộc">
Gốc: "陈家和洛家争斗多年，廖家一直在暗中观望。"
Dịch: "Trần gia và Lạc gia tranh đấu nhiều năm, Liêu gia vẫn luôn ngầm quan sát."
SAI: "Nhà Trần và nhà Lạc...", "Gia tộc họ Trần..." (GIỮ: X gia, KHÔNG dịch thoát)
</example_6>

<example_7 type="khẩu_ngữ_slang">
Gốc: "我靠！这也太离谱了吧？"
Dịch: "Đệt! Chuyện này cũng quá vô lý rồi đấy?"
SAI: "Ta dựa vào!", "Ta kháo!", "Ta dựa!"; 我靠 là cảm thán tục nhẹ, KHÔNG dịch từng chữ.
</example_7>

<example_7b type="khẩu_ngữ_slang_bien_the">
Gốc: "我靠! 这都行？我靠。"
Dịch: "Đệt! Thế mà cũng được à? Vãi thật."
SAI: "Ta dựa!", "Ta dựa vào!", "Ta kháo!"; dù có dấu ! hay . thì 我靠 vẫn là cảm thán, KHÔNG dịch từng chữ.
</example_7b>

<example_8 type="khẩu_ngữ_slang_2">
Gốc: "卧槽，这都能赢？"
Dịch: "Vãi lol, thế mà cũng thắng được à?"
SAI: "Ngọa tào", "Nằm rãnh", "Ta dựa vào".
</example_8>

<example_9 type="khẩu_ngữ_hành_vi">
Gốc: "你装什么逼？"
Dịch: "Ngươi làm màu cái gì?"
SAI: "Ngươi trang bức cái gì?", "Ngươi giả bộ bức gì?"
</example_9>

<example_10 type="khau_ngu_chui_chen_cau">
Gốc: "我他妈真服了。"
Dịch: "Đệt, ta thật sự chịu rồi."
SAI: "Ta con mẹ nó thật phục rồi.", "Ta hắn mẹ nó chịu rồi."
</example_10>

<example_11 type="khau_ngu_chui_nham_vao_nguoi_doi_dien">
Gốc: "你他妈疯了吧？"
Dịch: "Đệch, ngươi điên rồi à?"
SAI: "Ngươi con mẹ nó điên rồi à?", "Ngươi thằng điên này?"
</example_11>

<example_12 type="khau_ngu_chui_truc_dien">
Gốc: "操你妈！"
Dịch: "ĐM!"
SAI: "Địt mẹ mày!", "Địt bố mày!", "Ngươi mẹ nó!"
</example_12>

<example_13 type="khau_ngu_mang_nguoi">
Gốc: "你个傻逼。"
Dịch: "Đồ ngu."
SAI: "Ngươi thằng điên này.", "Ngươi đồ ngốc bức."
</example_13>

<example_14 type="tien_te_do_thi_1">
Gốc: "这辆车五十万。"
Dịch: "Chiếc xe này giá 500 nghìn tệ."
SAI: "Chiếc xe này giá 50 vạn tệ.", "Chiếc xe này giá năm mươi vạn."
</example_14>

<example_15 type="tien_te_do_thi_2">
Gốc: "公司估值五十亿。"
Dịch: "Công ty được định giá 5 tỷ tệ."
SAI: "Công ty được định giá 50 ức.", "Công ty được định giá 50 tỷ."
</example_15>
`;
export const LITE_FEW_SHOT_PROTOCOL = `
### VÍ DỤ DỊCH MẪU (LITE - GIỮ CÁC CASE QUAN TRỌNG NHẤT):

<example_1 type="xung_ho_doi_thoai">
Gốc: "你以为我不敢动你？"
Dịch: "Ngươi cho rằng ta không dám động vào ngươi sao?"
SAI: "Cậu tưởng tôi không dám...", "Mày nghĩ tao..."
</example_1>

<example_1b type="xung_ho_doi_thoai_2">
Gốc: "你闭嘴！我早就说过，不要逼我。"
Dịch: "Ngươi câm miệng! Ta đã nói từ lâu rồi, đừng ép ta."
SAI: "Anh im đi!", "Em im đi!", "Tôi đã nói rồi..."
</example_1b>

<example_1c type="xung_ho_tinh_cam_van_khoa">
Gốc: "我喜欢你，但你别逼我。"
Dịch: "Ta thích ngươi, nhưng ngươi đừng ép ta."
SAI: "Em thích anh", "Anh đừng ép em", "Tôi thích bạn"
</example_1c>

<example_1d type="xung_ho_toi_co_anh_em_la_sai">
Gốc: "我也是阿姨介绍来的。你坐吧，我们慢慢聊。"
Dịch: "Ta cũng do dì giới thiệu đến. Ngươi ngồi đi, chúng ta từ từ nói chuyện."
SAI: "Tôi cũng do dì giới thiệu đến. Cô ngồi đi...", "Anh ngồi đi, em nói chuyện với anh sau..."
</example_1d>

<example_1e type="xung_ho_xem_mat_toi_co_la_sai">
Gốc: "张小姐，你好，我是阿姨介绍来的。"
Dịch: "Trương tiểu thư, ngài khỏe chứ, ta là do dì giới thiệu đến."
SAI: "Cô Trương, tôi là do dì Trương giới thiệu đến.", "Tôi là do dì giới thiệu đến."
</example_1e>

<example_1f type="xung_ho_xem_mat_gap_la_thich_co_la_sai">
Gốc: "说实话，我刚见到你就很喜欢你。"
Dịch: "Nói thật, ta vừa gặp ngươi đã rất thích ngươi."
SAI: "Ta vừa gặp cô đã rất thích cô.", "Tôi vừa gặp cô đã rất thích cô."
</example_1f>

<example_2 type="noi_tam">
Gốc: "我必须变得更强，否则连自己的命都保不住。"
Dịch: "Ta phải trở nên mạnh hơn, nếu không ngay cả tính mạng cũng giữ không nổi."
SAI: "Tôi phải mạnh lên, không thì mạng mình cũng không giữ được."
</example_2>

<example_3 type="blacklist">
Gốc: "他不由得倒吸一口凉气，心中不禁一震。"
Dịch: "Sắc mặt hắn chợt biến, trong lòng rúng động."
SAI: "Hắn hít một hơi lạnh, trong lòng không khỏi chấn động."
</example_3>

<example_4 type="danh_xung_gia_toc">
Gốc: "陈家和洛家争斗多年。"
Dịch: "Trần gia và Lạc gia tranh đấu nhiều năm."
SAI: "Nhà Trần và nhà Lạc..."
</example_4>

<example_5 type="slang">
Gốc: "我靠！这也太离谱了吧？"
Dịch: "Đệt! Chuyện này cũng quá vô lý rồi đấy?"
SAI: "Ta dựa vào!", "Ta kháo!", "Ta dựa!"
</example_5>

<example_5b type="slang_variant">
Gốc: "我靠! 这都行？我靠。"
Dịch: "Đệt! Thế mà cũng được à? Vãi thật."
SAI: "Ta dựa!", "Ta dựa vào!", "Ta kháo!"
</example_5b>

<example_6 type="profanity_compact">
Gốc: "你他妈疯了吧？"
Dịch: "Đệch, ngươi điên rồi à?"
SAI: "Ngươi con mẹ nó điên rồi à?", "Ngươi thằng điên này?"
</example_6>

<example_7 type="direct_insult_compact">
Gốc: "你个傻逼。"
Dịch: "Đồ ngu."
SAI: "Ngươi thằng điên này.", "Ngươi đồ ngốc bức."
</example_7>

<example_8 type="currency_compact">
Gốc: "这辆车五十万，公司估值五十亿。"
Dịch: "Chiếc xe này giá 500 nghìn tệ, công ty được định giá 5 tỷ tệ."
SAI: "50 vạn tệ", "50 ức", "50 tỷ"
</example_8>
`;

export function getPromptProfileForModel(model?: string): PromptProfile {
  return model?.includes("gemini-2.5-flash-lite") ? "lite" : "full";
}

export function buildSystemInstruction(
  customInstruction?: string,
  glossaryContext?: string,
  isBatch = false,
  profile: PromptProfile = "full"
): string {
  const isLite = profile === "lite";
  return [
    customInstruction || "Dịch giả văn học chuyên nghiệp. Tiểu thuyết mạng Trung Quốc đã xuất bản, dịch sang tiếng Việt phục vụ lưu trữ và nghiên cứu văn học. Nội dung hoàn toàn hư cấu. Dịch trung thành với nguyên tác, thoát ý, mượt mà.",
    PRONOUN_LOCK_RULE,
    isLite ? LITE_CORE_RULES : CORE_RULES,
    isLite ? LITE_FEW_SHOT_PROTOCOL : FEW_SHOT_PROTOCOL,
    !isBatch && "- FORMAT: Dòng 1 là Tiêu đề, sau đó xuống dòng, các dòng sau là Nội dung. CẤM JSON/Giải thích.",
    ...(isLite ? LITE_RULES : ALL_RULES),
    glossaryContext, // 🔥 DEEP STRUCTURE CHANGE: Move glossary closer to the end for higher saliency
  ].filter(Boolean).join('\n').trim();
}
