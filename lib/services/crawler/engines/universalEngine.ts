import { spawnHiddenWebviewAndExtract } from "../spawnHiddenWebviewAndGetHTML";
import { CrawlerRule, CRAWLER_RULES } from "../rules/registry";
import { CrawlerBookInfo, CrawlerChapter } from "../shubaCrawler"; // Reuse interfaces

export class UniversalEngine {
    static findRule(url: string): CrawlerRule | null {
        return CRAWLER_RULES.find(r => r.patterns.some(p => url.includes(p))) || null;
    }

    /**
     * Heuristic: Guess the chapter list container and items
     */
    static guessTOC(doc: Document): { chapters: CrawlerChapter[] } {
        const chapters: CrawlerChapter[] = [];
        const links = Array.from(doc.querySelectorAll('a'));

        // Heuristic: Look for strings like "第xx章", "Chapter xx", "xx.xx"
        const chapterPattern = /(第?\s*\d+\s*[章回节])|(Chapter\s*\d+)|(^\d+[\.\s]\s*)|(Chương\s*\d+)/i;

        const candidates = links.filter(a => {
            const text = a.textContent?.trim() || "";
            // Chapters are usually short titles (under 60 chars) and match a pattern
            return text.length < 60 && text.length > 2 && chapterPattern.test(text);
        });

        if (candidates.length > 0) {
            // Group by parent and find the most populated container (likely the TOC list)
            const parentMap = new Map<HTMLElement, HTMLAnchorElement[]>();
            candidates.forEach(a => {
                const parent = a.parentElement;
                if (parent) {
                    const list = parentMap.get(parent) || [];
                    list.push(a);
                    parentMap.set(parent, list);
                }
            });

            let bestParent: HTMLElement | null = null;
            let maxCount = 0;
            parentMap.forEach((list, parent) => {
                if (list.length > maxCount) {
                    maxCount = list.length;
                    bestParent = parent;
                }
            });

            if (bestParent) {
                const domain = new URL(doc.baseURI).origin;
                // Get all links from this best container
                const linksInTOC = (bestParent as HTMLElement).querySelectorAll('a');
                linksInTOC.forEach(a => {
                    const href = a.getAttribute('href');
                    if (href && a.textContent?.trim()) {
                        chapters.push({
                            title: a.textContent.trim(),
                            url: href.startsWith('http') ? href : `${domain}${href}`
                        });
                    }
                });
            }
        }

        return { chapters };
    }

    static async fetchTOC(url: string, isManual = false): Promise<CrawlerBookInfo> {
        const rule = this.findRule(url);
        const domain = new URL(url).origin;

        const script = `
            const rule = ${JSON.stringify(rule)};
            if (rule) {
                const s = rule.selectors.toc;
                const title = document.querySelector(s.title)?.textContent?.trim() || 'Unknown Title';
                const author = document.querySelector(s.author)?.textContent?.trim() || 'Unknown Author';
                const cover = document.querySelector(s.cover)?.getAttribute('src') || '';
                const description = document.querySelector(s.description)?.textContent?.trim() || '';
                
                const chapters = [];
                const container = document.querySelector(s.chapterList);
                if (container) {
                    container.querySelectorAll(s.chapterLink).forEach(el => {
                        const href = el.getAttribute('href');
                        if (href) chapters.push({ title: el.textContent?.trim(), url: href });
                    });
                }
                return { title, author, cover, description, chapters };
            } else {
                const chapterPattern = /(第?\\s*\\d+\\s*[章回节])|(Chapter\\s*\\d+)|(^\\d+[\\.\\s]\\s*)|(Chương\\s*\\d+)/i;
                const links = Array.from(document.querySelectorAll('a')).filter(a => {
                    const text = a.textContent?.trim() || "";
                    return text.length < 60 && text.length > 2 && chapterPattern.test(text);
                });
                return { 
                    title: document.title, 
                    author: 'Unknown', 
                    chapters: links.map(a => ({ title: a.textContent?.trim(), url: a.getAttribute('href') })) 
                };
            }
        `;

        console.log(`[Crawler] Calling native_crawl_v2 for: ${url}`);
        const html = await spawnHiddenWebviewAndExtract(url, {
            timeoutMs: isManual ? 60000 : 30000,
            waitAfterLoadMs: isManual ? 1000 : 4000
        });

        console.log(`[Crawler] HTML received! Length: ${html.length}`);
        console.log(`[Crawler] HTML preview:`, html.substring(0, 500));

        // Parse HTML using DOMParser
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        console.log(`[Crawler] Body text length:`, doc.body?.textContent?.length || 0);
        console.log(`[Crawler] All links count:`, doc.querySelectorAll('a').length);

        // Extract data using rule selectors
        let data: CrawlerBookInfo;

        if (rule) {
            const s = rule.selectors.toc;
            const title = doc.querySelector(s.title)?.textContent?.trim() || 'Unknown Title';
            const author = doc.querySelector(s.author)?.textContent?.trim() || 'Unknown Author';
            const cover = doc.querySelector(s.cover)?.getAttribute('src') || '';
            const description = doc.querySelector(s.description)?.textContent?.trim() || '';

            const chapters: Array<{ title: string; url: string }> = [];
            const container = doc.querySelector(s.chapterList);
            if (container) {
                container.querySelectorAll(s.chapterLink).forEach(el => {
                    const href = el.getAttribute('href');
                    if (href) {
                        chapters.push({
                            title: el.textContent?.trim() || '',
                            url: href
                        });
                    }
                });
            }

            data = { title, author, cover, description, chapters };
        } else {
            // Fallback
            data = {
                title: doc.title,
                author: 'Unknown',
                cover: '',
                description: '',
                chapters: []
            };
        }

        console.log(`[Crawler] Extracted ${data.chapters.length} chapters`);

        return {
            ...data,
            cover: data.cover ? (data.cover.startsWith('http') ? data.cover : `${domain}${data.cover}`) : '',
            chapters: data.chapters.map(ch => ({
                ...ch,
                url: ch.url ? (ch.url.startsWith('http') ? ch.url : `${domain}${ch.url}`) : ''
            })).filter(ch => ch.url)
        };
    }

    static async fetchChapter(chapterUrl: string, isManual = false): Promise<{ title: string; content: string }> {
        const rule = this.findRule(chapterUrl);
        const script = `
            const rule = ${JSON.stringify(rule)};
            if (rule) {
                const s = rule.selectors.chapter;
                const title = document.querySelector(s.title)?.textContent?.replace(/（.*?）/g, '').trim() || '';
                const contentEl = document.querySelector(s.content)?.cloneNode(true);
                if (contentEl) {
                    s.remove.forEach(sel => contentEl.querySelectorAll(sel).forEach(el => el.remove()));
                    return { title, content: contentEl.innerHTML };
                }
            } else {
                const containers = Array.from(document.querySelectorAll('div, article, section'));
                let best = null;
                let maxL = 0;
                containers.forEach(n => {
                    if (n.textContent.length > maxL) { maxL = n.textContent.length; best = n; }
                });
                return {
                    title: document.querySelector('h1')?.textContent?.trim() || 'Guessed Chapter',
                    content: best ? best.innerHTML : 'Failed to extract'
                };
            }
            return { title: 'Unknown', content: '' };
        `;

        const payload = await spawnHiddenWebviewAndExtract(chapterUrl, {
            extractionScript: script,
            waitAfterLoadMs: isManual ? 1500 : 5000 // 5s for background tasks to bypass CF more reliably
        });

        if (payload.includes('Just a moment...') || payload.includes('cloudflare')) {
            console.error('[Crawler] Cloudflare challenge detected for:', chapterUrl);
            return { title: 'Error (Cloudflare)', content: 'Bị chặn bởi Cloudflare. Hãy thử mở "⚡ Giải vây Cloudflare" rồi quay lại.' };
        }

        let title = 'Unknown';
        let rawContent = '';

        try {
            const extracted = JSON.parse(payload);
            title = extracted.title;
            rawContent = extracted.content;
        } catch (e) {
            console.warn('[Crawler] Payload is not JSON, attempting heuristic extraction from raw HTML...');
            // Fallback: Payload is raw HTML (e.g. from Rust's reqwest or failed script)
            const parser = new DOMParser();
            const doc = parser.parseFromString(payload, 'text/html');

            // Heuristic Chapter Extraction
            const rule = this.findRule(chapterUrl);
            if (rule) {
                const s = rule.selectors.chapter;
                title = doc.querySelector(s.title)?.textContent?.trim() || 'Unknown Title';
                const contentEl = doc.querySelector(s.content);
                if (contentEl) {
                    const clone = contentEl.cloneNode(true) as HTMLElement;
                    s.remove.forEach(sel => clone.querySelectorAll(sel).forEach(el => el.remove()));
                    rawContent = clone.innerHTML;
                }
            } else {
                title = doc.querySelector('h1')?.textContent?.trim() || 'Guessed Chapter';
                const containers = Array.from(doc.querySelectorAll('div, article, section'));
                let best = null;
                let maxL = 0;
                containers.forEach(n => {
                    if (n.textContent!.length > maxL) { maxL = n.textContent!.length; best = n; }
                });
                rawContent = best ? (best as HTMLElement).innerHTML : 'Failed to extract from HTML';
            }
        }

        const content = rawContent
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<p[^>]*>/gi, '')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .trim();

        return { title, content };
    }
}
