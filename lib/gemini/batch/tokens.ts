/**
 * Token Estimation & Calculation
 */

export interface ChapterMetadata {
  id: number;
  title: string;
  chars: number;
  estimatedTokens: number;
}

export interface BatchTokenLimits {
  inputTokens: number;
  outputTokens: number;
  systemPromptTokens: number;
  glossaryTokens: number;
  contentTokens: number;
}

/**
 * Estimate tokens for text (conservative: 1 token ≈ 4 chars)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate dynamic token limits for batch translation
 * KEY: System prompt + Glossary counted ONCE per batch, not per chapter!
 */
export function calculateBatchTokenLimits(
  chapters: ChapterMetadata[],
  systemPromptSize: number,
  glossarySize: number
): BatchTokenLimits {
  // System prompt (shared across batch) - COUNTED ONCE!
  const systemPromptTokens = estimateTokens(systemPromptSize.toString());

  // Glossary (shared across batch) - COUNTED ONCE!
  const glossaryTokens = estimateTokens(glossarySize.toString());

  // Content tokens (sum of all chapters in batch)
  const contentTokens = chapters.reduce((sum, ch) => sum + ch.estimatedTokens, 0);

  // Total input
  const inputTokens = systemPromptTokens + glossaryTokens + contentTokens;

  // Output tokens (estimated based on input, 20% expansion)
  const outputTokens = Math.ceil(contentTokens * 1.2);

  console.log(`📊 [BATCH TOKENS] System: ${systemPromptTokens} | Glossary: ${glossaryTokens} | Content: ${contentTokens} | Total Input: ${inputTokens} | Est. Output: ${outputTokens}`);

  return {
    inputTokens,
    outputTokens,
    systemPromptTokens,
    glossaryTokens,
    contentTokens
  };
}
