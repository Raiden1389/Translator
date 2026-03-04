import { CorrectionEntry } from "../../db";

/**
 * Correction Engine Module
 * Responsible for applying dictionary rules, corrections, and pattern matching.
 */

export function repairSentenceStructure(text: string): string {
    if (!text) return "";

    const pronouns = "Hắn|Nó|Gã|Mụ|Lão|Người|Kẻ|Cô|Anh|Chị|Ông|Bà|Tên|Con|Thằng|Bọn|Lũ|Các|Những|Mọi|Mỗi|Một";
    const conjunctions = "Nhưng|Và|Thì|Mà|Bởi|Tuy|Nên|Rồi|Đã|Đang|Sẽ|Tại|Vì|Nếu|Do|Để|Với|Cùng";
    const prepositions = "Trong|Ngoài|Trên|Dưới|Trước|Sau|Lúc|Khi|Giờ";
    const verbs = "Thở|Ngước|Nhìn|Thấy|Nghe|Nói|Bảo|Hỏi|Đáp|Cười|Khóc|Đứng|Ngồi|Đi|Chạy|Đến|Về";
    const others = "Cái|Cố|Vị|Đích|Chỉ|Có|Không|Chưa|Chẳng|Biết|Nhớ|Quên|Muốn|Thích|Yêu|Ghét";

    const safeWords = `${pronouns}|${conjunctions}|${prepositions}|${verbs}|${others}`;
    const regex = new RegExp(`, (${safeWords})`, 'g');

    // Smart replacement: only break run-on sentences (clause > 50 chars)
    // Short clauses with comma are valid Vietnamese compound sentences
    return text.replace(regex, (match, word, offset) => {
        const before = text.substring(0, offset);
        const lastBoundary = Math.max(
            before.lastIndexOf('. '),
            before.lastIndexOf('! '),
            before.lastIndexOf('? '),
            before.lastIndexOf('\n'),
            0
        );
        const clauseLength = offset - lastBoundary;
        return clauseLength > 50 ? `. ${word}` : match;
    });
}

/**
 * Repair unmatched quotes in dialogue lines.
 * AI sometimes outputs opening " but forgets closing ".
 * Scans each paragraph — if odd number of quotes, append closing " at the end.
 */
export function repairUnmatchedQuotes(text: string): string {
    if (!text) return "";

    return text.split('\n').map(line => {
        // Count straight quotes
        const straightCount = (line.match(/"/g) || []).length;
        if (straightCount % 2 === 1) {
            // Odd number of " → missing a closing quote, append one
            line = line.trimEnd() + '"';
        }

        // Count curly quotes (left " vs right ")
        const leftCurly = (line.match(/\u201C/g) || []).length;
        const rightCurly = (line.match(/\u201D/g) || []).length;
        if (leftCurly > rightCurly) {
            line = line.trimEnd() + '\u201D';
        }

        return line;
    }).join('\n');
}

export async function generateCacheKey(
    text: string,
    model: string,
    instruction: string,
    _glossaryContext: string = "" // Keep for signature compatibility but ignore in hash
): Promise<string> {
    // AUDIT FIX: We exclude glossaryContext from the cache key.
    // Why? Glossary recommendations might vary slightly between batches,
    // but we don't want to re-translate the same paragraph just because 
    // one minor term was added/removed from the prompt's reference list.
    const data = `${text}|${model}|${instruction}`;
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function applyAllCorrections(text: string, rules: Partial<CorrectionEntry>[]): string {
    if (!text || !rules || rules.length === 0) return text;

    let result = text.normalize('NFC')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/[\u00A0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000]/g, ' ')
        .replace(/[ \t]+/g, ' ');

    const replaces = rules.filter(r => (r.type === 'replace' || !r.type) && (r.from || r.original));
    const wraps = rules.filter(r => r.type === 'wrap' && r.target && r.open && r.close);
    const regexes = rules.filter(r => r.type === 'regex' && (r.pattern || r.original));

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
                    return `\\b${escapeRegExp(cleanFrom)}\\b`;
                })
                .filter(p => p.length > 2  /* more than just \b\b */)
                .join('|'),
            'gi'
        );

        if (pattern.source !== "(?:)" && pattern.source !== "") {
            result = result.replace(pattern, (match) => {
                const to = replacementMap.get(match.toLowerCase());
                if (to === undefined) return match;

                if (match === match.toUpperCase() && match !== match.toLowerCase()) return to.toUpperCase();
                if (match.length > 0 && match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
                    return to.charAt(0).toUpperCase() + to.slice(1);
                }
                return to;
            });
        }
    }

    for (const rule of wraps) {
        result = safeWrap(result, rule.target!.normalize('NFC'), rule.open!, rule.close!);
    }

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

export function applyCorrectionRule(text: string, rule: Partial<CorrectionEntry>): string {
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
