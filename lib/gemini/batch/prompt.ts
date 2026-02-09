/**
 * Batch Prompt Builder
 */

import type { Chapter } from "@/lib/db";
import { buildSystemInstruction } from "../constants";
import { buildGlossaryContext } from "./glossary";

/**
 * Build batch prompt with FULL system instruction + glossary
 * CRITICAL: Must include pronoun rules (ta/ngươi), glossary, and all constants!
 */
export async function buildBatchPrompt(
  chapters: Chapter[],
  config: {
    customPrompt?: string;
    workspaceId: string;
  }
): Promise<string> {
  // 1. Load glossary context (terms + characters)
  const glossaryContext = await buildGlossaryContext(config.workspaceId);

  // 2. Build system instruction (includes ta/ngươi rules!)
  const systemInstruction = buildSystemInstruction(
    config.customPrompt,
    glossaryContext
  );

  // 3. Build batch content
  const batchContent = chapters.map((ch, i) => `
=== CHƯƠNG ${i + 1}: ${ch.title} ===
${ch.content_original}
`).join('\n\n');

  // 4. Combine into full prompt
  const fullPrompt = `
${systemInstruction}

---

NHIỆM VỤ: Dịch ${chapters.length} chương sau từ tiếng Trung sang tiếng Việt.

${batchContent}

---

YÊU CẦU OUTPUT:
- Trả về JSON với format:
{
  "chapters": [
    {
      "index": 0,
      "title": "Tiêu đề đã dịch (GIỮ NGUYÊN SỐ CHƯƠNG nếu có, ví dụ: 第5章 → Chương 5)",
      "content": "Nội dung đã dịch"
    }
  ]
}

- ÁP DỤNG ĐẦY ĐỦ:
  ✓ Đại từ: 我-Ta, 你-Ngươi, 他-Hắn, 她-Nàng
  ✓ Glossary: ${glossaryContext ? 'Có' : 'Không'}
  ✓ Persona: Theo glossary characters
  ✓ Tất cả rules trong system instruction
  ✓ GIỮ NGUYÊN SỐ CHƯƠNG trong title (第1章 → Chương 1, 第2章 → Chương 2, v.v.)
  `.trim();

  return fullPrompt;
}
