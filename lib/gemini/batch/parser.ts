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
export function parseBatchResponse(
  response: string,
  originalChapters: Chapter[]
): Chapter[] {
  try {
    // Strip markdown code fences if present
    let cleanResponse = response.trim();
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

    return parsed.chapters.map((ch: { title?: string; content?: string }, i: number) => {
      const original = originalChapters[i];
      const translatedContent = ch.content || "";
      return {
        ...original,
        title_translated: ch.title || original.title,
        content_translated: translatedContent,
        translatedAt: Date.now()
      };
    });
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
): Chapter[] {
  console.log(`🔄 [FALLBACK PARSE] Lenient structure extraction`);

  try {
    // Strip markdown wrapper
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Find chapters array
    const chaptersMatch = cleanResponse.match(/"chapters"\s*:\s*\[/);
    if (!chaptersMatch) {
      console.error(`❌ [FALLBACK] Could not find chapters array`);
      return originalChapters.map(ch => ({ ...ch, translatedAt: Date.now() }));
    }

    const startIdx = chaptersMatch.index! + chaptersMatch[0].length;
    const chapters = extractChaptersRaw(cleanResponse, startIdx);

    return originalChapters.map((ch, i) => {
      const parsed = chapters[i];
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
  } catch (error) {
    console.error(`❌ [FALLBACK] Complete failure:`, error);
    return originalChapters.map(ch => ({ ...ch, translatedAt: Date.now() }));
  }
}

/**
 * Extract chapter objects as raw key-value pairs (no JSON.parse)
 */
function extractChaptersRaw(text: string, startIdx: number): Array<{ title: string; content: string }> {
  const chapters: Array<{ title: string; content: string }> = [];
  let i = startIdx;
  const depth = 0;

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

    // Start of chapter object
    if (ch === '{') {
      const chapterData = extractObjectRaw(text, i);
      if (chapterData) {
        chapters.push(chapterData.data);
        i = chapterData.endIdx;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }

  return chapters;
}

/**
 * Extract a single object's fields as raw strings
 */
function extractObjectRaw(text: string, startIdx: number): { data: { title: string; content: string }; endIdx: number } | null {
  let i = startIdx + 1; // skip opening {
  let depth = 1;
  const fields: Record<string, string> = {};

  while (i < text.length && depth > 0) {
    const ch = text[i];

    if (/\s/.test(ch) || ch === ',') {
      i++;
      continue;
    }

    if (ch === '}') {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
      i++;
      continue;
    }

    if (ch === '{') {
      depth++;
      i++;
      continue;
    }

    // Extract key
    if (ch === '"') {
      const keyResult = extractString(text, i);
      if (!keyResult) {
        i++;
        continue;
      }

      const key = keyResult.value;
      i = keyResult.endIdx;

      // Skip colon
      while (i < text.length && (text[i] === ':' || /\s/.test(text[i]))) {
        i++;
      }

      // Extract value (only care about strings)
      if (text[i] === '"') {
        const valueResult = extractString(text, i);
        if (valueResult) {
          // LAYER 3: Decode with lenient string decoder
          fields[key] = decodeLenientString(valueResult.value);
          i = valueResult.endIdx;
        }
      } else {
        // Skip non-string values (numbers, booleans, etc)
        while (i < text.length && text[i] !== ',' && text[i] !== '}') {
          i++;
        }
      }
    } else {
      i++;
    }
  }

  return {
    data: {
      title: fields.title || '',
      content: fields.content || ''
    },
    endIdx: i
  };
}

/**
 * Extract raw string content (including escape sequences)
 */
function extractString(text: string, startIdx: number): { value: string; endIdx: number } | null {
  if (text[startIdx] !== '"') return null;

  let i = startIdx + 1;
  let raw = '';
  let escapeNext = false;

  while (i < text.length) {
    const ch = text[i];

    if (escapeNext) {
      raw += ch;
      escapeNext = false;
      i++;
      continue;
    }

    if (ch === '\\') {
      raw += ch;
      escapeNext = true;
      i++;
      continue;
    }

    if (ch === '"') {
      return { value: raw, endIdx: i + 1 };
    }

    raw += ch;
    i++;
  }

  return null;
}

/**
 * LAYER 3: Lenient string decoder - handle invalid escape sequences
 * Treats AI output as "semi-structured text", not strict JSON
 */
function decodeLenientString(raw: string): string {
  let out = '';
  let i = 0;

  while (i < raw.length) {
    const ch = raw[i];

    if (ch === '\\' && i + 1 < raw.length) {
      const next = raw[i + 1];

      switch (next) {
        case 'n':
          out += '\n';
          i += 2;
          break;
        case 't':
          out += '\t';
          i += 2;
          break;
        case 'r':
          out += '\r';
          i += 2;
          break;
        case '"':
          out += '"';
          i += 2;
          break;
        case '\\':
          out += '\\';
          i += 2;
          break;
        case '/':
          out += '/';
          i += 2;
          break;
        case 'b':
          out += '\b';
          i += 2;
          break;
        case 'f':
          out += '\f';
          i += 2;
          break;
        case 'u':
          // Try parse \uXXXX
          if (i + 5 < raw.length) {
            const hex = raw.slice(i + 2, i + 6);
            if (/^[0-9a-fA-F]{4}$/.test(hex)) {
              out += String.fromCharCode(parseInt(hex, 16));
              i += 6;
              break;
            }
          }
          // Invalid \u escape - keep literal
          out += next;
          i += 2;
          break;
        default:
          // Invalid escape (\x, \q, etc) - keep literal character
          out += next;
          i += 2;
      }
    } else {
      out += ch;
      i++;
    }
  }

  return out;
}
