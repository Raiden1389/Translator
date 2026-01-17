import { db } from "./db";

// Copy of the fixed normalizer from gemini.ts
function normalizeVietnameseContent(text: string): string {
    if (!text) return "";

    // ULTRA AGGRESSIVE: First, handle the specific case of ".\n\n]" (period, double newline, orphaned bracket)
    // This is the pattern we see in the user's text
    text = text
        // 1. Normalize Brackets: 【 】 -> [ ]
        .replace(/【/g, "[")
        .replace(/】/g, "]")
        // 2. Normalize Parentheses: （ ） -> ( )
        .replace(/（/g, "(")
        .replace(/）/g, ")")

        // 3. MOST CRITICAL: Remove ANY amount of whitespace/newlines before ]
        // This catches patterns like "text.\n]", "text.\n\n]", "text. \n \n ]", etc.
        .replace(/[\s\n]+\]/g, "]")

        // 4. CRITICAL: Handle orphaned ] at start of line (most aggressive fix first)
        // Pattern: "text.\n\n] [next" -> "text.] [next"
        .replace(/\.[\s\n]+\][\s\n]+\[/g, ".] [")

        // 5. Remove ALL whitespace/newlines INSIDE brackets
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

        // 6. Remove newlines/spaces *after* opening brackets
        .replace(/\[[\s\n]+/g, "[")

        // 7. Squash newline between brackets
        .replace(/\][\s\n]+\[/g, "] [")

        // 8. Remove single newline after ] (keep double for paragraph breaks)
        .replace(/\]\n(?!\n)/g, "] ")

        // 9. Same for parentheses
        .replace(/\s*\)/g, ")")
        .replace(/\(\s*/g, "(")

        // 10. Add legitimate spacing
        .replace(/\](?=[^\s.,;!?\]])/g, "] ")
        .replace(/(?<=[^\s\[])\[/g, " [")

        // 11. Fix double spaces
        .replace(/[ \t]{2,}/g, " ")
        // 12. Ensure max 2 newlines
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    return text;
}

export async function fixAllBrackets(workspaceId: string): Promise<{ fixed: number, total: number }> {
    console.log('[FixBrackets] Starting for workspace:', workspaceId);

    const chapters = await db.chapters
        .where('workspaceId')
        .equals(workspaceId)
        .and(c => c.status === 'translated' && !!c.content_translated)
        .toArray();

    console.log('[FixBrackets] Found chapters:', chapters.length);
    let fixed = 0;

    for (const chapter of chapters) {
        const originalContent = chapter.content_translated!;
        const originalTitle = chapter.title_translated || "";

        const cleanedContent = normalizeVietnameseContent(originalContent);
        const cleanedTitle = originalTitle ? normalizeVietnameseContent(originalTitle) : originalTitle;

        // FORCE UPDATE: Always update to ensure normalization is applied
        console.log(`[FixBrackets] Fixing chapter ${chapter.id}: ${chapter.title}`);
        console.log('[FixBrackets] Original length:', originalContent.length, 'Cleaned length:', cleanedContent.length);
        console.log('[FixBrackets] Has \\n]?', originalContent.includes('\n]'));
        console.log('[FixBrackets] Has .\\n\\n]?', originalContent.includes('.\n\n]'));
        console.log('[FixBrackets] Sample:', originalContent.substring(0, 600));

        await db.chapters.update(chapter.id!, {
            content_translated: cleanedContent,
            title_translated: cleanedTitle
        });
        fixed++;
    }

    console.log('[FixBrackets] Fixed:', fixed, 'Total:', chapters.length);
    return { fixed, total: chapters.length };
}
