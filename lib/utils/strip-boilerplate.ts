/**
 * Strip Chinese web novel boilerplate text
 * Removes navigation, UI controls, site disclaimers, and other junk
 * that scrapers leave in chapter content.
 */

// Common navigation & UI junk patterns
const JUNK_PATTERNS: RegExp[] = [
    // Navigation
    /^\s*(首页|首頁)\s*$/gm,
    /^\s*(上一章|下一章|目录|目錄|章节目录|章節目錄|上一页|上一頁|下一页|下一頁|返回目录|返回目錄)\s*$/gm,

    // UI controls
    /^\s*(投票推荐|投票推薦|加入书签|加入書籤|小说报错|小說報錯|关灯|關燈|护眼|護眼|字体[\-\+]|字體[\-\+])\s*$/gm,

    // Genre tags
    /^\s*(现代都市|現代都市|玄幻奇幻|武侠仙侠|武俠仙俠|都市言情|历史军事|歷史軍事|游戏竞技|遊戲競技|科幻灵异|科幻靈異|其他类型|其他類型|网游动漫|網遊動漫|恐怖灵异|恐怖靈異|仙侠修真|仙俠修真|穿越重生)\s*$/gm,

    // Page break prompts
    /这章没有结束[，,]请点击下一页继续阅读[！!]?/g,
    /這章沒有結束[，,]請點擊下一頁繼續閱讀[！!]?/g,
    /本章未完[，,]?点击下一页继续(?:阅读)?[。\.！!]?/g,
    /本章未完[，,]?點擊下一頁繼續(?:閱讀)?[。\.！!]?/g,
    /^[ \t]*(点击|點擊)[这這此]里继续阅读.*$/gm,
    /^[ \t]*(点击|點擊)[这這此]裡繼續閱讀.*$/gm,

    // Site disclaimers & watermarks
    /^.*所有章节[、,，]图片内容均为网友更新上传.*$/gm,
    /^.*所有章節[、,，]圖片內容均為網友更新上傳.*$/gm,
    /^[ \t]*(温馨提示|溫馨提示)[：:].*$/gm,
    /^.*按\s*回车.*返回书目.*$/gm,
    /^.*按\s*回車.*返回書目.*$/gm,
    /^.*请记住本书首发域名.*$/gm,
    /^.*請記住本書首發域名.*$/gm,
    /^.*手机版阅读网址.*$/gm,
    /^.*手機版閱讀網址.*$/gm,
    /^.*天才一秒记住.*$/gm,
    /^.*天才一秒記住.*$/gm,
    /^.*最新章节.*最快更新.*$/gm,
    /^.*最新章節.*最快更新.*$/gm,
    /^.*最快更新.*最新章节.*$/gm,
    /^.*最快更新.*最新章節.*$/gm,
    /^.*欢迎.*书友.*支持.*(?:并|並)收藏.*$/gm,
    /^.*歡迎.*書友.*支持.*並收藏.*$/gm,
    /^[ \t]*(本站域名|本站网址|本站網址)[：:].*$/gm,
    /^.*(笔趣阁|筆趣閣).*阅读网址.*$/gm,
    /^.*(笔趣阁|筆趣閣).*閱讀網址.*$/gm,
    /^.*如果你对.*有什么建议.*$/gm,
    /^.*如果你對.*有什麼建議.*$/gm,
    /^.*喜欢.*请大家收藏.*$/gm,
    /^.*喜歡.*請大家收藏.*$/gm,
    /^.*请收藏本站.*$/gm,
    /^.*請收藏本站.*$/gm,
    /^.*求推荐票.*$/gm,
    /^.*求推薦票.*$/gm,
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
    cleaned = cleaned.replace(/^(第[\d一二三四五六七八九十百千]+章\s*[^\n]*)\n+\1/m, '$1');

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
    const dupTitle = text.match(/^(第[\d一二三四五六七八九十百千]+章\s*[^\n]*)\n+\1/m);
    if (dupTitle) {
        found.push(`[重複標題] ${dupTitle[1]}`);
    }

    return found;
}
