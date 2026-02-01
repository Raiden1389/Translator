/**
 * AI Scrubbing Module
 * Responsible for removing AI meta-talk, preambles, and cleaning response text.
 */

export function scrubAIChatter(text: string): string {
    if (!text) return "";

    return text
        // 1. Common preambles
        .replace(/^(Of course!|Here is the response|Strictly in JSON|Sure,|Certainly,)[^.]*[:\.]?\s*/i, "")
        // 2. Common postscripts
        .replace(/\s*(Of course!|Here is the response|Strictly in JSON|Just kidding|I know you said|Here it it|Enjoy!|Hope this helps)[\s\S]*$/i, "")
        // 3. Trailing artifacts
        .replace(/["'\}\s\n]+$/g, "")
        .trim();
}

export function extractResponseText(response: unknown): string {
    try {
        if (!response) return "";

        const sdkRes = response as { text?: () => string; response?: { text?: () => string } };
        if (typeof sdkRes.text === 'function') return sdkRes.text();
        if (typeof sdkRes.response?.text === 'function') return sdkRes.response.text();

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

export function cleanJsonResponse(jsonText: string): string {
    if (!jsonText) return "[]";

    const cleaned = jsonText.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim();

    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    const lastBrace = cleaned.lastIndexOf('}');
    const lastBracket = cleaned.lastIndexOf(']');

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

export function cleanIdiomExplanations(text: string): string {
    if (!text) return "";

    return text
        .replace(/[“"‘\-\—]([^”"’]+)[”"’]\s*\([^)]+\)/g, '$1')
        .replace(/([A-ZÀ-Ỹ][a-zà-ỹ]*(\s+[A-ZÀ-Ỹ][a-zà-ỹ]*){1,4})\s*\([^)]+\)/g, '$1');
}

/**
 * Removes typical web novel site ads, link watermarks, and noise.
 */
export function scrubSourceRags(text: string): string {
    if (!text) return "";

    return text
        // 1. Common URLs and domain patterns
        .replace(/https?:\/\/[^\s]+/gi, "")
        .replace(/www\.[a-z0-9-]+\.[a-z]{2,}/gi, "")
        .replace(/[a-z0-9-]+\.com/gi, "")
        // 2. 69shuba specific patterns (Chinese & Vietnamese common rác)
        .replace(/69书吧/g, "")
        .replace(/69shuba/gi, "")
        .replace(/本章未完，请点击下一页继续阅读/g, "")
        .replace(/请收藏本站：/g, "")
        .replace(/最新章节/g, "")
        .replace(/手机用户请浏览/g, "")
        .replace(/阅读/g, "")
        .replace(/&nbsp;/g, " ")
        // 3. Spacing normalization
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
