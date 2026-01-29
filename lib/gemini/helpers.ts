import { DictionaryEntry } from "../db";

/**
 * Text Normalization Helper
 * Cleans up Vietnamese content formatting
 */
export function normalizeVietnameseContent(text: string): string {
    if (!text) return "";

    // 0. Unicode Normalization (NFC) - Critical for Vietnamese character matching
    text = text.normalize('NFC');

    // Early bail-out for clean text: reduces regex overhead by ~70% for processed streams.
    if (!/[【［〔】］〕（）\u200B-\u200D\uFEFF：]/.test(text) && !text.includes('\r') && !text.includes('  ') && !text.includes('\n\n\n')) {
        return text.trim();
    }

    return text
        // -1. Normalize all line endings to \n first
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")

        // 0. Nuke invisible characters (Zero-width space, etc)
        .replace(/[\u200B-\u200D\uFEFF]/g, "")

        // 1. Normalize Brackets: 【 】 ［ ］ 〔 〕 -> [ ]
        // Explicitly handle single occurrences first
        .replace(/[【［〔]/g, "[")
        .replace(/[】］〕]/g, "]")

        // 1.5. "Unicode Camouflage" & Double Render Fix (The Nuclear Option)
        // Collapses sequences of mixed Latin/Unicode brackets into a single ASCII bracket
        .replace(/[\u005B\uFF3B\u3014\u3010]{2,}/g, '[')
        .replace(/[\u005D\uFF3D\u3015\u3011]{2,}/g, ']')

        // 2. Normalize Parentheses: （ ） -> ( )
        .replace(/（/g, "(")
        .replace(/）/g, ")")
        .replace(/：/g, ":")

        // 3. MOST CRITICAL: Remove ANY amount of whitespace/newlines before ]
        .replace(/[\s\n]+\]/g, "]")

        // 4. CRITICAL FIX: Remove ALL whitespace/newlines INSIDE brackets first
        .replace(/\[([\s\S]*?)\]/g, (match) => {
            const inner = match.slice(1, -1);
            const cleaned = inner.replace(/\s+/g, " ").trim();
            return `[${cleaned}]`;
        })
        .replace(/\(([^\)]*?)\)/g, (match) => {
            const inner = match.slice(1, -1);
            const cleaned = inner.replace(/\s+/g, " ").trim();
            return `(${cleaned})`;
        })

        // 5. AGGRESSIVE: Remove newlines/spaces *around* brackets
        .replace(/\[[\s\n]+/g, "[")

        // 8. Same for parentheses
        .replace(/\s*\)/g, ")")
        .replace(/\(\s*/g, "(")

        // 9. Add legitimate spacing
        .replace(/\](?=[^\s.,;!?\]])/g, "] ")
        .replace(/(?<=[^\s\[])\[/g, " [")

        // 10. Fix double/multiple brackets (AI or corrections output [[text]] or [ [text] ])
        .replace(/\[\s*\[+/g, "[")
        .replace(/\]\s*\]+/g, "]")

        // 11. Fix double spaces (horizontal only)
        .replace(/[ \t]{2,}/g, " ")
        // 12. Ensure max 2 newlines (paragraph break)
        .replace(/\n{3,}/g, "\n\n")

        // 13. HEALING LOGIC: Squash unnecessary newlines in dialogues to keep 1:1 parity with source
        // Example: "Linh Độ:\n\n[abc]" -> "Linh Độ: [abc]"
        .replace(/:\s*\n+\s*\[/g, ": [")

        .trim();
}

/**
 * Scrubs common AI meta-talk/preambles that leak into content
 */
export function scrubAIChatter(text: string): string {
    if (!text) return "";

    return text
        // 1. Common preambles
        .replace(/^(Of course!|Here is the response|Strictly in JSON|Sure,|Certainly,)[^.]*[:\.]?\s*/i, "")
        // 2. Common postscripts / self-corrections
        .replace(/\s*(Of course!|Here is the response|Strictly in JSON|Just kidding|I know you said|Here it is|Enjoy!|Hope this helps)[\s\S]*$/i, "")
        // 3. Trailing artifacts like JSON leftovers
        .replace(/["'\}\s\n]+$/g, "")
        .trim();
}

/**
 * Extract text from Gemini API response (handles multiple SDK versions)
 */
export function extractResponseText(response: unknown): string {
    try {
        if (!response) return "";

        // Standard SDK response
        const sdkRes = response as { text?: () => string; response?: { text?: () => string } };
        if (typeof sdkRes.text === 'function') return sdkRes.text();
        if (typeof sdkRes.response?.text === 'function') return sdkRes.response.text();

        // Raw response structure
        const rawRes = response as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            response?: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        };

        const candidates = rawRes.candidates || rawRes.response?.candidates;
        return candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch {
        return "";
    }
}

/**
 * Clean JSON response from AI (remove markdown code blocks and extra text)
 */
export function cleanJsonResponse(jsonText: string): string {
    if (!jsonText) return "[]";

    // 1. Remove markdown code blocks (```json ... ```)
    const cleaned = jsonText.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim();

    // 2. Find the start and end of either an object { } or an array [ ]
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    const lastBrace = cleaned.lastIndexOf('}');
    const lastBracket = cleaned.lastIndexOf(']');

    // Find the actual start (earliest of { or [)
    let start = -1;
    let end = -1;

    if (firstBrace !== -1 && (firstBracket === -1 || (firstBrace !== -1 && firstBrace < firstBracket))) {
        start = firstBrace;
        end = lastBrace;
    } else if (firstBracket !== -1) {
        start = firstBracket;
        end = lastBracket;
    }

    if (start !== -1 && end !== -1 && end > start) {
        return cleaned.substring(start, end + 1);
    }

    return cleaned;
}

/**
 * Repair sentence structure (Comma/Period conversion)
 * Fixes: ", Hắn" -> ". Hắn"
 */
function repairSentenceStructure(text: string): string {
    if (!text) return "";

    const pronouns = "Hắn|Nó|Gã|Mụ|Lão|Người|Kẻ|Cô|Anh|Chị|Ông|Bà|Tên|Con|Thằng|Bọn|Lũ|Các|Những|Mọi|Mỗi|Một";
    const conjunctions = "Nhưng|Và|Thì|Mà|Bởi|Tuy|Nên|Rồi|Đã|Đang|Sẽ|Tại|Vì|Nếu|Do|Để|Với|Cùng";
    const prepositions = "Trong|Ngoài|Trên|Dưới|Trước|Sau|Lúc|Khi|Giờ";
    const verbs = "Thở|Ngước|Nhìn|Thấy|Nghe|Nói|Bảo|Hỏi|Đáp|Cười|Khóc|Đứng|Ngồi|Đi|Chạy|Đến|Về";
    const others = "Cái|Cố|Vị|Đích|Chỉ|Có|Không|Chưa|Chẳng|Biết|Nhớ|Quên|Muốn|Thích|Yêu|Ghét";

    const safeWords = `${pronouns}|${conjunctions}|${prepositions}|${verbs}|${others}`;
    const regex = new RegExp(`, (${safeWords})`, 'g');

    return text.replace(regex, '. $1');
}

/**
 * Remove AI-added idiom explanations in parentheses
 * Matches: “Hán Việt” (Giải thích) -> Hán Việt
 */
function cleanIdiomExplanations(text: string): string {
    if (!text) return "";

    return text
        // 1. Double quotes case: “abc” (xyz) -> abc
        .replace(/[“"‘\-\—]([^”"’]+)[”"’]\s*\([^)]+\)/g, '$1')
        // 2. Capitalized case: Phân Đình Kháng Lễ (chia sẻ quyền lực) -> Phân Đình Kháng Lễ
        // Matches 2-5 capitalized words followed by parentheses
        .replace(/([A-ZÀ-Ỹ][a-zà-ỹ]*(\s+[A-ZÀ-Ỹ][a-zà-ỹ]*){1,4})\s*\([^)]+\)/g, '$1');
}

/**
 * THE ABSOLUTE FINAL SWEEP (The Broom)
 * This should be the very last function called before saving/rendering.
 */
export function finalSweep(text: string, glossary: DictionaryEntry[] = []): string {
    if (!text) return "";

    // 1. Clean up AI chatter and standard formatting first
    let cleaned = scrubAIChatter(normalizeVietnameseContent(text));

    // 2. THE ABSOLUTE FINAL SWEEP (The Broom)
    // Recursive cleanup to ensure no double brackets survive
    let prev = "";
    let loopCount = 0;
    while (cleaned !== prev && loopCount < 5) {
        prev = cleaned;
        // String replacement for absolute certainty (bypassing Regex quirks)
        cleaned = cleaned
            .split('[[').join('[')
            .split(']]').join(']')
            .split('[ [').join('[')
            .split('] ]').join(']')
            .replace(/（\s*（/g, '（')
            .replace(/）\s*）/g, '）')
            .replace(/\(\s*\(/g, '(')
            .replace(/\)\s*\)/g, ')');
        loopCount++;
    }

    // 3. Conditional Pronoun Lowercasing (e.g., Ta -> ta, Đại ca -> đại ca)
    // Rule: Lowercase if not at start of sentence AND not inside brackets [...]

    // START: Build dynamic list from hardcoded pronouns + user dictionary
    const hardcoded = ["Ta", "Ngươi", "Hắn", "Nàng", "Huynh", "Đệ", "Tỷ", "Muội", "Đại ca", "Tỷ tỷ", "Muội muội", "Đệ đệ", "Tướng quân", "Minh chủ", "Tiểu thư", "Nương tử", "Mẫu thân", "Phụ thân"];

    // Extract everything from glossary that isn't explicitly a 'name' or 'character' or just lowercase it safely
    const glossaryTerms = glossary
        .filter(d => d.type === 'term' || d.type === 'phrase' || d.type === 'correction')
        .map(d => d.translated);

    const keywords = Array.from(new Set([...hardcoded, ...glossaryTerms]))
        .filter(k => k && k.length > 1 && /^[A-ZÀ-Ỹ]/.test(k)); // Only check words starting with Uppercase
    // END: Build dynamic list

    cleaned = cleaned
        .replace(/\[([\s\S]*?)\]/g, (match) => {
            // Temporarily mask brackets to avoid processing inside
            return `\uE000${match.slice(1, -1)}\uE001`;
        });

    for (const kw of keywords) {
        // Use a more robust check for Vietnamese boundaries instead of \b
        // Matches the keyword when it's NOT preceded/followed by another letter
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?<![a-zà-ỹA-ZÀ-Ỹ])${escaped}(?![a-zà-ỹA-ZÀ-Ỹ])`, 'g');

        cleaned = cleaned.replace(regex, (match, offset, fullText) => {
            const preceding = fullText.substring(0, offset).trim();
            const isStartOfSentence = preceding === "" ||
                /[.!?:]$/.test(preceding) ||
                /[“"‘\-\—\u2013\u2014]$/.test(preceding);

            if (isStartOfSentence) return match;
            // Lowercase mapping (handle multi-word like "Đại ca" -> "đại ca")
            return match.toLowerCase();
        });
    }

    cleaned = cleaned
        // Unmask
        .replace(/\uE000/g, "[")
        .replace(/\uE001/g, "]");

    // 4. Structure Repair & Idiom Cleaning
    cleaned = repairSentenceStructure(cleaned);
    cleaned = cleanIdiomExplanations(cleaned);

    return cleaned
        // Final polish for spacing
        .replace(/\[\s+/g, '[')
        .replace(/\s+\]/g, ']')
        .trim();
}

/**
 * Generate a deterministic hash for caching translation results
 */
export async function generateCacheKey(
    text: string,
    model: string,
    instruction: string,
    glossaryContext: string = ""
): Promise<string> {
    const data = `${text}|${model}|${instruction}|${glossaryContext}`;
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Escapes special characters for use in RegExp
 */
export function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// ----------------------------------------------------------------------
// CORRECTION ENGINE UTILS
// ----------------------------------------------------------------------

/**
 * THE ULTIMATE CORRECTION ENGINE
 * Optimized for performance and correctness:
 * 1. Categorizes rules (Replace, Wrap, Regex)
 * 2. Sorts Replacements by length (Longest First) to prevent partial matching bugs
 * 3. Applies batch regex for efficiency
 * 4. Preserves Case (Upper, TitleCase)
 */
export function applyAllCorrections(text: string, rules: any[]): string {
    if (!text || !rules || rules.length === 0) return text;

    // 0. Pre-process text: Normalize Unicode AND NUKE invisible characters & weird whitespaces
    let result = text.normalize('NFC')
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Nuke zero-width spaces/joiners & byte order marks
        .replace(/[\u00A0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000]/g, ' ') // Convert all weird spaces to standard space
        .replace(/[ \t]+/g, ' '); // Collapse multiple spaces/tabs to single space

    // 1. Separate rules
    const replaces = rules.filter(r => (r.type === 'replace' || !r.type) && (r.from || r.original));
    const wraps = rules.filter(r => r.type === 'wrap' && r.target && r.open && r.close);
    const regexes = rules.filter(r => r.type === 'regex' && (r.pattern || r.original));

    // 2. Handle Simple Replacements (Batch & Sorted)
    if (replaces.length > 0) {
        const sorted = [...replaces].sort((a, b) => {
            const lenA = (a.from || a.original || "").length;
            const lenB = (b.from || b.original || "").length;
            return lenB - lenA;
        });

        const replacementMap = new Map(sorted.map(r => {
            const from = (r.from || r.original || "").trim().normalize('NFC').replace(/\s+/g, ' ').toLowerCase();
            const to = (r.to ?? r.replacement ?? "").normalize('NFC');
            return [from, to];
        }));

        const pattern = new RegExp(
            sorted
                .map(r => {
                    const cleanFrom = (r.from || r.original || "").trim().normalize('NFC').replace(/\s+/g, ' ');
                    return escapeRegExp(cleanFrom);
                })
                .filter(p => p.length > 0)
                .join('|'),
            'gi'
        );

        if (pattern.source !== "(?:)" && pattern.source !== "") {
            result = result.replace(pattern, (match) => {
                const to = replacementMap.get(match.toLowerCase());
                if (to === undefined) return match;

                // Case preservation logic
                if (match === match.toUpperCase() && match !== match.toLowerCase()) return to.toUpperCase();
                if (match.length > 0 && match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
                    return to.charAt(0).toUpperCase() + to.slice(1);
                }
                return to;
            });
        }
    }

    // 3. Handle Wraps
    for (const rule of wraps) {
        result = safeWrap(result, rule.target!.normalize('NFC'), rule.open!, rule.close!);
    }

    // 4. Handle Regexes
    for (const rule of regexes) {
        try {
            const p = rule.pattern || rule.original;
            const r = rule.replace || rule.replacement || "";
            if (p) {
                result = result.replace(new RegExp(p, 'gi'), r);
            }
        } catch (e) {
            console.error("Regex correction failed:", e, rule);
        }
    }

    return result;
}

export function applyCorrectionRule(text: string, rule: any): string {
    return applyAllCorrections(text, [rule]);
}

export function safeReplace(text: string, from: string, to: string) {
    return applyAllCorrections(text, [{ type: 'replace', from, to }]);
}

export function safeWrap(text: string, target: string, open: string, close: string) {
    if (!target || !open || !close) return text;
    const escaped = escapeRegExp(target.normalize('NFC'));
    const regex = new RegExp(escaped, 'gi');

    return text.replace(regex, (match, offset, full) => {
        const before = full[offset - 1];
        const after = full[offset + match.length];
        if (before === open && after === close) return match;
        return `${open}${match}${close}`;
    });
}
