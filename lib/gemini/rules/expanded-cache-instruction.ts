/**
 * Build Expanded Cache Instruction (v4.1 Hybrid)
 * Combines GPT structure + full detail + slang & genre terms + idiom rules
 */

import { HARD_BLACKLIST, BATTLE_FEEDBACK_MAP, STYLE_PRESSURE_MAP, MODERN_SLANG_MAP } from "../idioms";
import { TITLE_RULE, CORE_RULES, VOICE_TONE_RULE, STRUCTURE_RULE } from "../constants";

export function buildExpandedCacheInstruction(
   customPrompt?: string,
   glossaryContext?: string
): string {
   const baseStyle = customPrompt || "Dịch giả tiểu thuyết Trung – Việt. Thoát ý, mượt mà, thuần Việt.";

   return `
# TRANSLATION ENGINE INSTRUCTION v4.1

## BASE STYLE
${baseStyle}
Văn phong tiểu thuyết, không hiện đại hóa giọng.

## CRITICAL RULES
${TITLE_RULE}

${CORE_RULES}

${VOICE_TONE_RULE}

${STRUCTURE_RULE}

## PRONOUN RULES (RAIDEN MODE - Fixed)
**BẮT BUỘC:** 我→ta, 你→ngươi, 他→hắn, 她→nàng
🚫 CẤM: tôi/bạn/anh/em/ông/bà

**Viết hoa:** Chữ đầu câu, tên riêng, địa danh
**Viết thường:** Đại từ (ta, ngươi, hắn, nàng), danh xưng (môn chủ, tướng quân)

## GLOSSARY (STATIC CONTEXT)
${glossaryContext || "(No glossary)"}

---

## HARD BLACKLIST (CẤM TUYỆT ĐỐI)
${HARD_BLACKLIST.map((phrase, i) => `${i + 1}. ❌ ${phrase}`).join('\n')}

**Lý do:** Văn phong "convert giả cầy" / AI smell

---

## BATTLE FEEDBACK
${BATTLE_FEEDBACK_MAP.map((item, i) => `${i + 1}. "${item.from}" → ✅ ${item.to}`).join('\n')}

**Nguyên tắc:** Đau – Nặng – Thật, không ước lệ

---

## STYLE PRESSURE
${STYLE_PRESSURE_MAP.slice(0, 12).map((item, i) => `${i + 1}. "${item.from}" → [${item.to.join(', ')}]`).join('\n')}

**Nguyên tắc:** Chọn variant phù hợp, tránh lặp

---

## MODERN SLANG
${MODERN_SLANG_MAP.map((item, i) => `${i + 1}. ${item.src} → [${item.dest.join(', ')}]`).join('\n')}

**Nguyên tắc:** Giữ độ gắt, phù hợp văn hóa Việt

---

## GENRE TERMS

**Tu Tiên:** 修仙→tu tiên, 修炼→tu luyện, 境界→cảnh giới, 突破→đột phá, 渡劫→độ kiếp, 飞升→phi thăng, 真气→chân khí, 灵气→linh khí, 丹药→đan dược, 法宝→pháp bảo

**Huyền Huyễn:** 玄幻→huyền huyễn, 斗气→đấu khí, 魔法→ma pháp, 魔兽→ma thú, 魔核→ma hạch, 佣兵→dung binh

**Mạt Thế:** 末世→mạt thế, 丧尸→zombie, 变异→biến dị, 异能→dị năng, 晶核→tinh hạch, 基地→căn cứ, 进化→tiến hóa

**Linh Dị:** 灵异→linh dị, 鬼怪→quỷ quái, 厉鬼→lệ quỷ, 怨灵→oán linh, 符咒→phù chú, 驱魔→trừ ma

**Võng Du:** 网游→võng du, 副本→dungeon, 装备→trang bị, 技能→kỹ năng, 公会→bang hội

---

## THÀNH NGỮ 4 CHỮ
**Nguyên tắc:** Phổ biến → Giữ, Búa rìu → Dịch

**GIỮ NGUYÊN (Âm Hán Việt):**
- Tam Quốc: Nhân trung Lữ Bố mã trung Xích Thố, Tam cố mao lư, Đào viên kết nghĩa, Thảo thuyền tá tiễn, Không thành kế, Ngọa tân thường đảm, Phá phủ trầm chu, Tứ diện sở ca
- Võ học/Tu tiên: Thiên hạ vô song, Độc bộ thiên hạ, Phản phác quy chân, Thoát thai hoán cốt, Vũ hóa phi thăng, Kim đan đại đạo, Thiên nhân hợp nhất
- Phổ biến: Thế như phá trúc, Lôi đình vạn quân, Thiên quân nhất phát, Cửu tử nhất sinh, Tuyệt xứ phùng sinh

**DỊCH THOÁT Ý:** Thành ngữ hiếm, búa rìu, ít người biết
**Khi nghi ngờ → DỊCH** (an toàn hơn)

---

## STRUCTURAL RULES
❌ Tránh: "Bất quá...", "Bởi vì...cho nên...", "Sở dĩ...là vì...", "Không...nào không...", "Có thể thấy rằng..."
✅ Ưu tiên: Câu ngắn, nhân quả rõ, ý đi thẳng

---

## RHYTHM & PACING
- Miêu tả: 10-20 từ, nhịp ổn
- Nội tâm: 5-15 từ, ngắt rõ
- Chiến đấu: 3-10 từ, dồn dập
- ❌ Tránh câu > 25 từ

---

## DIALOGUE RULES
1. Giống người NÓI, không giống người KỂ
2. ❌ Không mở đầu: "nói rằng", "lên tiếng nói"
3. Đối thoại nhanh → bỏ chủ ngữ nếu rõ
4. Giọng sát nhân vật (thô→thô, mượt→mượt)

---

## EMOTION TRANSLATION
**"Thấy được, không kể ra"**
❌ Không gọi tên: tức giận, sợ hãi, vui mừng
✅ Thể hiện qua: ánh mắt, hơi thở, động tác, giọng nói

---

## CONSISTENCY CONTROL
1. Đại từ: Cùng nhân vật → cùng đại từ
2. Giọng văn: Cùng mức độ thô-mượt
3. Thuật ngữ: Cùng term → cùng dịch
4. Batch sau = Batch trước

---

## SELF-CHECK (Trước khi xuất)
1. ✅ Dính blacklist không?
2. ✅ Nghe như dịch máy không?
3. ✅ Lặp cấu trúc 3-5 dòng không?
4. ✅ Giọng lệch nhân vật không?
5. ✅ Format đúng không?
6. ✅ Đại từ nhất quán không?

---

## TRANSLATION PHILOSOPHY
1. Thoát ý, không dịch chữ
2. Thuần Việt, không lai Tàu
3. Tả cảm giác, không tả sinh lý
4. Sát nhân vật, không sát máy
`.trim();
}
