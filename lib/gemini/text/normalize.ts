/**
 * Text Normalization Module
 * Responsible for cleaning up Unicode (NFC), brackets, and basic formatting.
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
        .replace(/[【［〔]/g, "[")
        .replace(/[】］〕]/g, "]")

        // 1.5. "Unicode Camouflage" & Double Render Fix
        .replace(/[\u005B\uFF3B\u3014\u3010]{2,}/g, '[')
        .replace(/[\u005D\uFF3D\u3015\u3011]{2,}/g, ']')

        // 2. Normalize Parentheses: （ ） -> ( )
        .replace(/（/g, "(")
        .replace(/）/g, ")")
        .replace(/：/g, ":")

        // 3. Remove whitespace before ]
        .replace(/[\s\n]+\]/g, "]")

        // 4. Remove ALL whitespace/newlines INSIDE brackets/parantheses
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

        // 5. Remove newlines/spaces around brackets
        .replace(/\[[\s\n]+/g, "[")
        .replace(/\s*\)/g, ")")
        .replace(/\(\s*/g, "(")

        // 6. Add legitimate spacing & Clean spaces before punctuation
        .replace(/\s+([.,;:!?\])])/g, "$1")
        .replace(/\](?=[^\s.,;!:?\]])/g, "] ")
        .replace(/(?<=[^\s\[])\[/g, " [")

        // 7. Fix double/multiple brackets
        .replace(/\[\s*\[+/g, "[")
        .replace(/\]\s*\]+/g, "]")

        // 8. Fix double spaces (horizontal only)
        .replace(/[ \t]{2,}/g, " ")
        // 9. Ensure max 2 newlines (paragraph break)
        .replace(/\n{3,}/g, "\n\n")

        // 10. Squash unnecessary newlines in dialogues
        .replace(/:\s*\n+\s*\[/g, ": [")

        .trim();
}
