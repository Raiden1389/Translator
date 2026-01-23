/**
 * Text Normalization Helper
 * Cleans up Vietnamese content formatting
 */
export function normalizeVietnameseContent(text: string): string {
    if (!text) return "";
    return text
        // 1. Normalize Brackets: 【 】 ［ ］ -> [ ]
        .replace(/【/g, "[")
        .replace(/】/g, "]")
        .replace(/［/g, "[")
        .replace(/］/g, "]")
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

        // 10. Fix double/multiple brackets (AI sometimes outputs [[text]] or ]])
        // Replace 2 or more [ with single [
        .replace(/\[{2,}/g, "[")
        .replace(/\]{2,}/g, "]")

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
