/**
 * Parse HTML string and extract book info using CSS selectors
 * This is used for Manual Mode when user pastes HTML
 */

import { CrawlerBookInfo } from './shubaCrawler';
import { CRAWLER_RULES } from './rules/registry';
import { detectSelectorsWithAI, getCachedSelectors, cacheSelectors } from './aiSelectorDetector';

export interface ParseResult extends CrawlerBookInfo {
    metadata?: {
        selectorUsed: string;
        detectionMethod: 'hardcoded' | 'ai' | 'cached-ai';
        confidence?: number;
    };
}

export async function parseHTMLManually(html: string, url: string, apiKey?: string, forceAI = false): Promise<ParseResult> {
    // Find matching rule
    const rule = CRAWLER_RULES.find(r => r.patterns.some(p => url.includes(p)));

    // Parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const domain = new URL(url).hostname;

    // Try hardcoded selectors first (unless forceAI)
    let chapters: Array<{ title: string; url: string }> = [];
    let selectorUsed = '';
    let detectionMethod: 'hardcoded' | 'ai' | 'cached-ai' = 'hardcoded';

    // If forceAI is true, skip hardcoded and go straight to AI
    if (forceAI && apiKey) {
        console.log('[ManualParser] Force AI mode enabled, skipping hardcoded selectors');
    } else if (rule) {
        console.log('[ManualParser] Using hardcoded rule for:', rule.site);
        const s = rule.selectors.toc;
        console.log('[ManualParser] Chapter list selector:', s.chapterList);
        console.log('[ManualParser] Chapter link selector:', s.chapterLink);

        const container = doc.querySelector(s.chapterList);
        console.log('[ManualParser] Container found:', !!container);

        if (container) {
            selectorUsed = s.chapterLink;
            const links = container.querySelectorAll(s.chapterLink);
            console.log('[ManualParser] Links found with selector:', links.length);

            // Debug: Show first 3 links
            Array.from(links).slice(0, 3).forEach((el, i) => {
                console.log(`[ManualParser] Link ${i}:`, {
                    text: el.textContent?.trim().substring(0, 50),
                    href: el.getAttribute('href')
                });
            });

            links.forEach(el => {
                const href = el.getAttribute('href');
                if (href) {
                    chapters.push({
                        title: el.textContent?.trim() || '',
                        url: href
                    });
                }
            });
        }
    }

    console.log('[ManualParser] Chapters found with hardcoded:', chapters.length);

    // Declare aiSelectors in outer scope for later use
    let aiSelectors = null;

    // If forceAI OR (no chapters found and we have API key), try AI detection
    if ((forceAI || chapters.length === 0) && apiKey) {
        console.log('[ManualParser] No chapters found with hardcoded selectors, trying AI...');

        // Check cache first
        aiSelectors = getCachedSelectors(domain);

        // If not cached, detect with AI
        if (!aiSelectors) {
            aiSelectors = await detectSelectorsWithAI(html, apiKey);
            if (aiSelectors) {
                cacheSelectors(domain, aiSelectors);
            }
        }

        // Use AI-detected selectors
        if (aiSelectors) {
            console.log('[ManualParser] Using AI-detected selector:', aiSelectors.chapterLinkSelector);
            const links = doc.querySelectorAll(aiSelectors.chapterLinkSelector);
            links.forEach(el => {
                const href = el.getAttribute('href');
                if (href) {
                    chapters.push({
                        title: el.textContent?.trim() || '',
                        url: href
                    });
                }
            });
        }
    }

    // Extract basic info (use AI selectors if available, then rule, then fallback)
    let title = doc.title;
    let author = 'Unknown Author';
    let cover = '';
    let description = '';

    // Try AI-detected selectors first (if we used AI)
    if (aiSelectors) {
        if (aiSelectors.titleSelector) {
            title = doc.querySelector(aiSelectors.titleSelector)?.textContent?.trim() || doc.title;
        }
        if (aiSelectors.authorSelector) {
            author = doc.querySelector(aiSelectors.authorSelector)?.textContent?.trim() || 'Unknown Author';
        }
        if (aiSelectors.descriptionSelector) {
            description = doc.querySelector(aiSelectors.descriptionSelector)?.textContent?.trim() || '';
        }
    }
    // Fallback to hardcoded rule selectors
    else if (rule) {
        title = doc.querySelector(rule.selectors.toc.title)?.textContent?.trim() || doc.title;
        author = doc.querySelector(rule.selectors.toc.author)?.textContent?.trim() || 'Unknown Author';
        cover = doc.querySelector(rule.selectors.toc.cover)?.getAttribute('src') || '';
        description = doc.querySelector(rule.selectors.toc.description)?.textContent?.trim() || '';
    }

    // Normalize URLs
    const domainUrl = new URL(url).origin;

    return {
        title,
        author,
        cover: cover ? (cover.startsWith('http') ? cover : `${domainUrl}${cover}`) : '',
        description,
        chapters: chapters.map(ch => ({
            ...ch,
            url: ch.url.startsWith('http') ? ch.url : `${domainUrl}${ch.url}`
        })).filter(ch => ch.url),
        metadata: {
            selectorUsed,
            detectionMethod,
            confidence: aiSelectors?.confidence
        }
    };
}
