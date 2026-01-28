/**
 * Text Normalization Helper
 * Cleans up Vietnamese content formatting
 */
export function normalizeVietnameseContent(text: string): string {
    if (!text) return "";

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
export function finalSweep(text: string): string {
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

    // 3. Conditional Pronoun Lowercasing: Ta -> ta
    // Rule: Lowercase if not at start of sentence AND not inside brackets [...]
    cleaned = cleaned
        .replace(/\[([\s\S]*?)\]/g, (match) => {
            // Temporarily mask brackets to avoid processing inside
            return `\uE000${match.slice(1, -1)}\uE001`;
        })
        .replace(/\bTa\b/g, (match, offset, fullText) => {
            const preceding = fullText.substring(0, offset).trim();
            // Start of string OR preceded by sentence terminator OR dialogue markers
            // Includes: . ! ? " “ ” - —
            const isStartOfSentence = preceding === "" ||
                /[.!?]$/.test(preceding) ||
                /[“"‘\-\—\u2013\u2014]$/.test(preceding);
            return isStartOfSentence ? "Ta" : "ta";
        })
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

export function safeReplace(text: string, from: string, to: string) {
    if (!from || !to) return text;
    const escaped = escapeRegExp(from);
    const regex = new RegExp(escaped, 'g');
    return text.replace(regex, to);
}

export function safeWrap(text: string, target: string, open: string, close: string) {
    if (!target || !open || !close) return text;
    const escaped = escapeRegExp(target);
    const regex = new RegExp(escaped, 'g');

    return text.replace(regex, (match, offset, full) => {
        const before = full[offset - 1];
        const after = full[offset + match.length];

        // Check if already wrapped
        if (before === open && after === close) return match;

        return `${open}${match}${close}`;
    });
}

/**
 * Universal dispatcher for all correction types
 */
export function applyCorrectionRule(text: string, rule: {
    type?: string,
    target?: string,
    open?: string,
    close?: string,
    pattern?: string,
    original?: string,
    replace?: string,
    replacement?: string,
    from?: string,
    to?: string
}): string {
    if (!text || !rule) return text;

    try {
        if (rule.type === 'wrap' && rule.target && rule.open && rule.close) {
            return safeWrap(text, rule.target, rule.open, rule.close);
        } else if (rule.type === 'regex') {
            const pattern = rule.pattern || rule.original;
            const replacement = rule.replace || rule.replacement;
            if (!pattern) return text;
            return text.replace(new RegExp(pattern, 'g'), replacement || "");
        } else {
            // Default: replace (legacy support for items without type)
            const from = rule.from || rule.original;
            const to = rule.to || rule.replacement;
            if (from) {
                return safeReplace(text, from, to || "");
            }
            return text;
        }
    } catch (e) {
        console.error("Failed to apply correction rule:", e, rule);
        return text;
    }
}
