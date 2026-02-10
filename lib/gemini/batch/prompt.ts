/**
 * Batch Prompt Builder
 */

import type { Chapter } from "@/lib/db";
import { buildSystemInstruction } from "../constants";
import { buildGlossaryContext } from "./glossary";

/**
 * Build batch prompt with FULL system instruction + glossary
 * Returns both system instruction and user prompt for optimal API calling
 */
export async function buildBatchPrompt(
  chapters: Chapter[],
  config: {
    customPrompt?: string;
    workspaceId: string;
  }
): Promise<{ systemInstruction: string; userPrompt: string }> {
  // 1. Load glossary context (terms + characters)
  const glossaryContext = await buildGlossaryContext(config.workspaceId);

  // 2. Build system instruction (includes ta/ngươi rules!)
  const systemInstruction = buildSystemInstruction(
    config.customPrompt,
    glossaryContext
  );

  // 3. Build Style Capsule (Bí thuật giữ context cho Flash)
  const styleCapsule = JSON.stringify({
    style_capsule: {
      pov: "Ta/Ngươi (BẮT BUỘC)",
      tone: "truyện mạng, dứt khoát, không văn nói hiện đại",
      taboo: ["hít hơi lạnh", "không khỏi", "tôi/cậu"],
      format: "dịch sát nghĩa, 1 dòng gốc = 1 dòng dịch"
    }
  }, null, 2);

  // 4. Build batch content with CAPSULE Injection
  const batchContent = chapters.map((ch, i) => `
---
[STYLE REMINDER: Ta/Ngươi only]
${styleCapsule}

=== CHƯƠNG ${i + 1}: ${ch.title} ===
${ch.content_original}
`).join('\n\n');

  // 5. Combine into user prompt (NHIỆM VỤ + CONTENT)
  const userPrompt = `
NHIỆM VỤ: Dịch ${chapters.length} chương sau từ tiếng Trung sang tiếng Việt.

${batchContent}

---

YÊU CẦU OUTPUT (CỰC TRỌNG YẾU):
- Trả về JSON chuẩn.
- BẮT BUỘC TUÂN THỦ ĐẠI TỪ: Ngôi thứ nhất = "Ta", Đối thoại = "Ngươi".
- NẾU OUTPUT CÓ "TÔI/CẬU" HOẶC TỪ CẤM -> KẾT QUẢ BỊ COI LÀ FAILED.
- DỊCH ĐẦY ĐỦ TIÊU ĐỀ (Ví dụ: 第11章: 某某 -> Chương 11: Mỗ Mỗ). KHÔNG được chỉ để lại số chương.
- Trả về JSON với format:
{
  "chapters": [
    {
      "index": 0,
      "title": "Tiêu đề đã dịch (GIỮ NGUYÊN SỐ CHƯƠNG)",
      "content": "Nội dung đã dịch"
    }
  ]
}
  `.trim();

  return { systemInstruction, userPrompt };
}
