/**
 * Batch Response Parser
 * 3-Layer Architecture:
 * 1. Strict JSON.parse (fast path)
 * 2. Structure parser (extract raw strings)
 * 3. Lenient string decoder (handle invalid escapes)
 */

import type { Chapter } from "@/lib/db";

/**
 * Parse batch response from AI
 * Tries JSON first, falls back to lenient extraction
 */
export interface ParsedBatch {
  chapters: Chapter[];
}

export function parseBatchResponse(
  response: string,
  originalChapters: Chapter[]
): ParsedBatch {
  try {
    let cleanResponse = response.trim();

    // Strip markdown code fences
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // LAYER 1: Try strict JSON parse (fast path - 80% cases)
    const parsed = JSON.parse(cleanResponse);

    if (!parsed.chapters || !Array.isArray(parsed.chapters)) {
      throw new Error("Invalid JSON structure: missing 'chapters' array");
    }

    const chapters = parsed.chapters.map((ch: { title?: string; content?: string }, i: number) => {
      const original = originalChapters[i];
      const translatedContent = ch.content || "";
      return {
        ...original,
        title_translated: ch.title || original.title,
        content_translated: translatedContent,
        translatedAt: Date.now()
      };
    });

    return {
      chapters
    };
  } catch (error) {
    console.warn(`⚠️ [PARSE] JSON parse failed, trying lenient fallback:`, error);
    return fallbackParseBatch(response, originalChapters);
  }
}

/**
 * LAYER 2: Structure parser - extract raw strings without JSON.parse
 */
function fallbackParseBatch(
  response: string,
  originalChapters: Chapter[]
): ParsedBatch {
  console.log(`🔄 [FALLBACK PARSE] Lenient structure extraction`);

  try {
    // Strip markdown wrapper
    const cleanResponse = response.replace(/```json|```/g, "").trim();

    // Find chapters array block "chapters": [...]
    const chaptersMatch = cleanResponse.match(/"chapters"\s*:\s*\[/);
    if (!chaptersMatch) {
      console.warn("⚠️ [FALLBACK] Could not find chapters array");
      return {
        chapters: originalChapters.map(ch => ({ ...ch, translatedAt: Date.now() }))
      };
    }

    const startIdx = chaptersMatch.index! + chaptersMatch[0].length;
    const chaptersRaw = extractChaptersRaw(cleanResponse, startIdx);

    const chapters: Chapter[] = originalChapters.map((ch, i) => {
      const parsed = chaptersRaw[i];
      if (!parsed) {
        console.warn(`⚠️ [FALLBACK] No data for chapter ${i + 1}`);
        return { ...ch, translatedAt: Date.now() };
      }

      const translatedContent = parsed.content || '';

      return {
        ...ch,
        title_translated: parsed.title || ch.title,
        content_translated: translatedContent,
        translatedAt: Date.now()
      };
    });

    return {
      chapters
    };
  } catch (error) {
    console.error(`❌ [FALLBACK] Complete failure:`, error);
    return {
      chapters: originalChapters.map(ch => ({ ...ch, translatedAt: Date.now() }))
    };
  }
}

/**
 * Extract chapter objects as raw key-value pairs (no JSON.parse)
 */
function extractChaptersRaw(text: string, startIdx: number): Array<{ title: string; content: string }> {
  const chapters: Array<{ title: string; content: string }> = [];
  let i = startIdx;
  let depth = 0;

  while (i < text.length) {
    const ch = text[i];

    // Skip whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // End of array
    if (ch === ']' && depth === 0) {
      break;
    }

    if (ch === '{') {
      const objEnd = findClosingBrace(text, i);
      if (objEnd !== -1) {
        const objRaw = text.substring(i, objEnd + 1);
        chapters.push({
          title: extractValue(objRaw, "title"),
          content: extractValue(objRaw, "content")
        });
        i = objEnd + 1;
        continue;
      }
    }

    if (ch === '[') depth++;
    if (ch === ']') depth--;

    i++;
  }

  return chapters;
}

/**
 * Find matching closing brace
 */
function findClosingBrace(text: string, start: number): number {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    if (text[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Extract value for a key from a raw JSON-like string
 */
function extractValue(raw: string, key: string): string {
  const regex = new RegExp(`"${key}"\\s*:\\s*"(.*?[^\\\\])"`, "s");
  const match = raw.match(regex);
  if (match) {
    // Basic unescape
    return match[1]
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
  return "";
}
