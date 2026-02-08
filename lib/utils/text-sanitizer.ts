/**
 * Text Sanitizer Utility
 * 
 * Removes HTML tags, special characters, and normalizes whitespace
 * Used in both import and translation pipelines
 */

/**
 * Clean HTML content by removing tags and normalizing whitespace
 * 
 * @param html - Raw HTML string
 * @returns Clean text without HTML tags
 */
export function cleanHtmlContent(html: string): string {
  if (!html) return "";

  return html
    // Convert <br> to newlines FIRST (before stripping tags)
    .replace(/<br\s*\/?>/gi, "\n")

    // Remove ALL other HTML tags (including <div>, <span>, <p>, etc.)
    .replace(/<\/?[^>]+(>|$)/g, "")

    // Clean HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&emsp;/g, " ")
    .replace(/&ensp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")

    // Remove Chinese special whitespace characters
    .replace(/\u2003/g, " ")  // Em space (Chinese)
    .replace(/\u3000/g, " ")  // Ideographic space

    // Normalize multiple newlines
    .replace(/\n\s*\n\s*\n+/g, "\n\n")  // Max 2 consecutive newlines

    // Trim each line
    .split("\n")
    .map(line => line.trim())
    .join("\n")

    // Final trim
    .trim();
}

/**
 * Aggressive sanitization for translated content
 * Removes any remaining HTML artifacts that AI might have generated
 * 
 * @param text - Translated text from AI
 * @returns Sanitized text
 */
export function sanitizeTranslatedContent(text: string): string {
  if (!text) return "";

  return cleanHtmlContent(text)
    // Extra aggressive: Remove any remaining angle brackets
    .replace(/<[^>]*>/g, "")

    // Remove markdown-style HTML comments
    .replace(/<!--[\s\S]*?-->/g, "")

    // Clean up any escaped HTML that AI might generate
    .replace(/&lt;[^&]*&gt;/g, "")

    .trim();
}
