/**
 * AI-Powered Selector Detection using Gemini
 * Analyzes HTML and returns optimal CSS selectors
 */

import { GoogleGenAI } from '@google/genai';

interface AIDetectedSelectors {
    chapterLinkSelector: string;
    chapterTitleSelector?: string;
    contentSelector?: string;
    titleSelector?: string;
    authorSelector?: string;
    descriptionSelector?: string;
    sampleContent: string;
    confidence: number;
}

const SELECTOR_DETECTION_PROMPT = `
Analyze this HTML and find the CSS selectors for extracting book information.

Requirements:
1. Find the selector for chapter links (usually in a list or table)
2. Find the selector for book title (main heading)
3. Find the selector for author name
4. Find the selector for book description/summary
5. All selectors should match the correct elements

Return a JSON object with:
{
  "chapterLinkSelector": "CSS selector for chapter links",
  "titleSelector": "CSS selector for book title",
  "authorSelector": "CSS selector for author name",
  "descriptionSelector": "CSS selector for description (optional)",
  "sampleContent": "text content of first chapter found",
  "confidence": 0.0-1.0 (how confident you are)
}

HTML to analyze:
`;

export async function detectSelectorsWithAI(
    html: string,
    apiKey: string
): Promise<AIDetectedSelectors | null> {
    try {
        console.log('[AI Selector] Analyzing HTML with Gemini...');

        const ai = new GoogleGenAI({ apiKey });

        // Truncate HTML if too long (keep first 50KB)
        const truncatedHtml = html.length > 50000
            ? html.substring(0, 50000) + '\n... (truncated)'
            : html;

        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-09-2025',
            contents: SELECTOR_DETECTION_PROMPT + truncatedHtml
        });

        const response = result.text;
        if (!response) {
            console.error('[AI Selector] No response from AI');
            return null;
        }
        console.log('[AI Selector] Raw response:', response);

        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('[AI Selector] No JSON found in response');
            return null;
        }

        const detected: AIDetectedSelectors = JSON.parse(jsonMatch[0]);
        console.log('[AI Selector] Detected selectors:', detected);

        // Validate
        if (!detected.chapterLinkSelector || detected.confidence < 0.5) {
            console.warn('[AI Selector] Low confidence or missing selector');
            return null;
        }

        return detected;

    } catch (error) {
        console.error('[AI Selector] Detection failed:', error);
        return null;
    }
}

/**
 * Cache for AI-detected selectors
 * Key: domain (e.g., "69shuba.com")
 * Value: detected selectors
 */
const selectorCache = new Map<string, AIDetectedSelectors>();

export function getCachedSelectors(domain: string): AIDetectedSelectors | null {
    return selectorCache.get(domain) || null;
}

export function cacheSelectors(domain: string, selectors: AIDetectedSelectors): void {
    selectorCache.set(domain, selectors);
    console.log(`[AI Selector] Cached selectors for ${domain}`);
}
