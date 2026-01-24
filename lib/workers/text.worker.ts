/**
 * Web Worker for heavy text processing tasks
 * - Normalization
 * - Reader Formatting (HTML generation)
 * - Correction Applying
 */

// Simple self-contained versions of helpers (to avoid complex imports in worker environment)
const normalizeVietnameseContent = (text: string): string => {
    if (!text) return "";
    if (!/[【［〔】］〕（）\u200B-\u200D\uFEFF：]/.test(text) && !text.includes('\r') && !text.includes('  ') && !text.includes('\n\n\n')) {
        return text.trim();
    }
    return text
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/[【［〔]/g, "[")
        .replace(/[】］〕]/g, "]")
        .replace(/[\u005B\uFF3B\u3014\u3010]{2,}/g, '[')
        .replace(/[\u005D\uFF3D\u3015\u3011]{2,}/g, ']')
        .replace(/（/g, "(")
        .replace(/）/g, ")")
        .replace(/：/g, ":")
        .replace(/[\s\n]+\]/g, "]")
        .replace(/\[([\s\S]*?)\]/g, (match) => {
            const inner = match.slice(1, -1);
            return `[${inner.replace(/\s+/g, " ").trim()}]`;
        })
        .replace(/\(([^\)]*?)\)/g, (match) => {
            const inner = match.slice(1, -1);
            return `(${inner.replace(/\s+/g, " ").trim()})`;
        })
        .replace(/\[[\s\n]+/g, "[")
        .replace(/\s*\)/g, ")")
        .replace(/\(\s*/g, "(")
        .replace(/\](?=[^\s.,;!?\]])/g, "] ")
        .replace(/(?<=[^\s\[])\[/g, " [")
        .replace(/\[\s*\[+/g, "[")
        .replace(/\]\s*\]+/g, "]")
        .replace(/[ \t]{2,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/:\s*\n+\s*\[/g, ": [")
        .trim();
};

const escapeHTML = (str: string) => {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

self.onmessage = (e: MessageEvent) => {
    const { action, payload } = e.data;

    try {
        if (action === 'formatReaderText') {
            const { text, activeTTSIndex = null } = payload;
            if (!text) {
                self.postMessage({ action, result: "" });
                return;
            }

            // Processing logic
            let cleanedText = normalizeVietnameseContent(text);
            cleanedText = cleanedText.replace(/\r\n/g, "\n");
            cleanedText = cleanedText.replace(/:\s*\n+\s*\[/g, ": [");
            cleanedText = cleanedText.replace(/([.!?;…])\s+(?=\[)/g, "$1\n");

            const paragraphs = cleanedText
                .split('\n')
                .map(p => p.trim())
                .filter(p => p.length > 0);

            const html = paragraphs.map((para, index) => {
                const isHighlighted = activeTTSIndex === index;
                const finalClass = isHighlighted
                    ? "reader-txt-style bg-yellow-500/20 rounded transition-colors duration-300"
                    : "reader-txt-style transition-colors duration-500";

                return `<p id="tts-para-${index}" class="${finalClass}">${escapeHTML(para)}</p>`;
            }).join('');

            self.postMessage({ action, result: html });
        }
    } catch (error: unknown) {
        self.postMessage({ action, error: error instanceof Error ? error.message : String(error) });
    }
};
