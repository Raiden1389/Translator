/**
 * Strip Chinese web novel boilerplate text
 * Removes navigation, UI controls, site disclaimers, and other junk
 * that scrapers leave in chapter content.
 */

// Common navigation & UI junk patterns
const JUNK_PATTERNS: RegExp[] = [
    // Navigation
    /^首頁$/m,
    /^(上一章|下一章|目錄|章節目錄|上一頁|下一頁)$/m,

    // UI controls
    /^(投票推薦|加入書籤|小說報錯|關燈|字體[\-\+])$/m,

    // Genre tags
    /^(現代都市|玄幻奇幻|武俠仙俠|都市言情|歷史軍事|遊戲競技|科幻靈異|其他類型|網遊動漫|恐怖靈異|仙俠修真|穿越重生)$/m,

    // Page break prompts
    /這章沒有結束[，,]請點擊下一頁繼續閱讀[！!]?/g,
    /本章未完[，,]?點擊下一頁繼續[。\.！!]?/g,
    /點擊[這此]裡繼續閱讀.*$/m,

    // Site disclaimers & watermarks
    /所有章節、圖片內容均為網友更新上傳.*$/m,
    /^溫馨提示[：:].*$/m,
    /按\s*回車.*返回書目.*$/m,
    /請記住本書首發域名.*$/m,
    /手機版閱讀網址.*$/m,
    /天才一秒記住.*$/m,
    /最新章節.*最快更新/m,
    /最快更新.*最新章節/m,
    /歡迎.*書友.*支持.*並收藏.*$/m,
    /本站域名[：:].*$/m,
    /筆趣閣.*閱讀網址.*$/m,
    /如果你對.*有什麼建議.*$/m,
    /喜歡.*請大家收藏.*$/m,
];

/**
 * Strip boilerplate from a single chapter text.
 * Returns cleaned text and whether changes were made.
 */
export function stripBoilerplate(raw: string): { cleaned: string; changed: boolean } {
    let cleaned = raw;

    for (const pattern of JUNK_PATTERNS) {
        cleaned = cleaned.replace(pattern, '');
    }

    // Remove duplicate chapter title at the beginning
    // Pattern: "第X章 Title\n\n第X章 Title" → keep one
    cleaned = cleaned.replace(/^(第[\d一二三四五六七八九十百千]+章\s+[^\n]+)\n+\1/m, '$1');

    // Clean up excessive blank lines from removal
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

    const changed = cleaned !== raw.trim();
    return { cleaned, changed };
}

/**
 * Scan text and return found junk patterns (for preview/debug).
 */
export function scanBoilerplate(text: string): string[] {
    const found: string[] = [];
    for (const pattern of JUNK_PATTERNS) {
        const matches = text.match(pattern);
        if (matches) {
            for (const m of matches) {
                if (m.trim()) found.push(m.trim());
            }
        }
    }

    // Check duplicate chapter title
    const dupTitle = text.match(/^(第[\d一二三四五六七八九十百千]+章\s+[^\n]+)\n+\1/m);
    if (dupTitle) {
        found.push(`[重複標題] ${dupTitle[1]}`);
    }

    return found;
}
