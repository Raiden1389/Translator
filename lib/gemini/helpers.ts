/**
 * Text Normalization Helper
 * Cleans up Vietnamese content formatting
 */
export function normalizeVietnameseContent(text: string): string {
    if (!text) return "";
    return text
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

        // 6. Fix: Squash newline between brackets: ] \n [ -> ] [
        .replace(/\]\s*\n+\s*\[/g, "] [")

        // 7. Fix: Remove newline after ] if it's not a paragraph break
        .replace(/\]\n(?!\n)/g, "] ")

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
export function extractResponseText(response: any): string {
    try {
        if (typeof response.text === 'function') {
            return response.text();
        } else if (typeof response.response?.text === 'function') {
            return response.response.text();
        }
        // Fallback for different SDK versions
        const candidates = response.candidates || response.response?.candidates;
        return candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch {
        return "";
    }
}

/**
 * Clean JSON response from AI (remove markdown code blocks and extra text)
 */
export function cleanJsonResponse(jsonText: string): string {
    if (!jsonText) return "{}";

    // 1. Remove markdown code blocks (```json ... ```)
    jsonText = jsonText.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim();

    // 2. Find the first '{' and last '}' to extract the JSON object
    const firstBrace = jsonText.indexOf('{');
    const lastBrace = jsonText.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1);
    } else if (firstBrace !== -1) {
        // Truncated JSON? Try to close it (Desperate measure)
        jsonText = jsonText.substring(firstBrace) + '"}';
    }

    return jsonText;
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

    return cleaned
        // Final polish for spacing
        .replace(/\[\s+/g, '[')
        .replace(/\s+\]/g, ']');
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
export function applyCorrectionRule(text: string, rule: any): string {
    if (!text || !rule) return text;

    try {
        if (rule.type === 'wrap') {
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
            if (!from) return text;
            return safeReplace(text, from, to || "");
        }
    } catch (e) {
        console.error("Failed to apply correction rule:", e, rule);
        return text;
    }
}

