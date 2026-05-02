import { DictionaryEntry } from "../../db";
import { normalizeVietnameseContent } from "./normalize";
import { scrubAIChatter, cleanIdiomExplanations } from "./scrub";
import { repairSentenceStructure, repairUnmatchedQuotes, applyAllCorrections } from "./correction";
import { deduplicateConsecutiveParagraphs, normalizeQuoteStyles, scrubVietnameseAIChatter } from "./post-cleanup";

function cleanupMalformedProfanity(text: string): string {
    return text
        .replace(/([Tt]a|[Nn]gươi|[Hh]ắn|[Nn]àng)\s+con\s+mẹ\s+nó(?=[\s!?.,…]|$)([!?.,…]*)/gu, (_, pronoun: string, punctuation: string) => {
            const replacement = pronoun[0] === pronoun[0].toUpperCase() ? "Đệt" : "đệt";
            return `${replacement}${punctuation || ""}`;
        })
        .replace(/([Nn]gươi|[Tt]a)\s+thằng\s+điên\s+này(?=[\s!?.,…]|$)([!?.,…]*)/gu, (_, pronoun: string, punctuation: string) => {
            const replacement = pronoun[0] === pronoun[0].toUpperCase() ? "Đồ điên" : "đồ điên";
            return `${replacement}${punctuation || ""}`;
        })
        .replace(/địt (bố|mẹ) mày/giu, () => "ĐM");
}

/**
 * Casing & Final Sweep Module
 * The orchestrator for final text cleanup before display.
 */
export function finalSweep(text: string, glossary: DictionaryEntry[] = []): string {
    if (!text) return "";

    // 1. Clean up AI chatter (English + Vietnamese) and standard formatting
    let cleaned = scrubVietnameseAIChatter(scrubAIChatter(normalizeVietnameseContent(text)));

    // 1.5. Remove consecutive duplicate paragraphs (AI stuttering)
    cleaned = deduplicateConsecutiveParagraphs(cleaned);

    // 1.6. Normalize quote styles to Vietnamese standard
    cleaned = normalizeQuoteStyles(cleaned);

    // 2. Recursive cleanup to ensure no double brackets survive
    let prev = "";
    let loopCount = 0;
    while (cleaned !== prev && loopCount < 5) {
        prev = cleaned;
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

    // 2.5. Hard Glossary Enforcement (Force replace Hanzi or lazy AI leftovers)
    if (glossary.length > 0) {
        const glossaryRules = glossary.map(g => ({
            original: g.original,
            replacement: g.translated,
            type: 'replace' as const
        }));
        cleaned = applyAllCorrections(cleaned, glossaryRules);
    }

    // 3. Smart Capitalization Logic
    const hardcoded = [
        "Ta", "Ngươi", "Hắn", "Nàng", "Huynh", "Đệ", "Tỷ", "Muội", "Lão", "Gã", "Mụ",
        "Đại ca", "Nhị ca", "Tam ca", "Đại huynh", "Nhị huynh", "Tam huynh", "Đại tỷ", "Nhị tỷ", "Tam tỷ",
        "Tỷ tỷ", "Muội muội", "Đệ đệ", "Sư phụ", "Sư huynh", "Sư đệ", "Sư tỷ", "Sư muội",
        "Tướng quân", "Minh chủ", "Tiểu thư", "Nương tử", "Mẫu thân", "Phụ thân", "Tiên sinh",
        "Tiểu thúc", "Thúc thúc", "Thẩm thẩm", "Bản tôn", "Bản vương", "Bản tọa", "Bản cung", "Vị này", "Kẻ này", "Tiểu tử"
    ];

    const glossaryTerms = glossary
        .filter(d => d.type === 'term' || d.type === 'phrase' || d.type === 'correction')
        .map(d => d.translated.normalize('NFC'));

    const keywords = Array.from(new Set([...hardcoded, ...glossaryTerms]))
        .filter(k => k && k.length > 1 && /^[A-ZÀ-Ỹ]/.test(k));

    cleaned = cleaned
        .replace(/\[([\s\S]*?)\]/g, (match) => {
            return `\uE000${match.slice(1, -1)}\uE001`;
        });

    for (const kw of keywords) {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?<![a-zà-ỹA-ZÀ-Ỹ])${escaped}(?![a-zà-ỹA-ZÀ-Ỹ])`, 'gi');

        cleaned = cleaned.replace(regex, (match, offset, fullText) => {
            const rawPreceding = fullText.substring(0, offset);
            const preceding = rawPreceding.trim();

            const isNewParagraph = rawPreceding === "" || /\n\s*$/.test(rawPreceding);
            const isStartOfSentence = isNewParagraph ||
                /[.!?:](\s|[\uE000-\uE001])*$/.test(preceding) ||
                /[“"‘\-\—\u2013\u2014«「『]/.test(preceding.slice(-1));

            if (isStartOfSentence) {
                return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
            }
            return match.toLowerCase();
        });
    }

    cleaned = cleaned
        .replace(/\uE000/g, "[")
        .replace(/\uE001/g, "]");

    // 3.5. Capitalize first char inside [] brackets (Sentence case for system/game text)
    // SAI: "[tỷ lệ chuyển đổi]"  →  ĐÚNG: "[Tỷ lệ chuyển đổi]"
    cleaned = cleaned.replace(/\[([a-zà-ỹ\u00C0-\u024F])/gu, (_, firstChar) => {
        return '[' + firstChar.toLocaleUpperCase('vi-VN');
    });

    // 4. Structure Repair & Idiom Cleaning
    cleaned = repairSentenceStructure(cleaned);
    cleaned = repairUnmatchedQuotes(cleaned);
    cleaned = cleanIdiomExplanations(cleaned);
    cleaned = cleanupMalformedProfanity(cleaned);

    return cleaned
        .replace(/\[\s+/g, '[')
        .replace(/\s+\]/g, ']')
        .trim();
}
