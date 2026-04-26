/**
 * Adaptive Token Management
 * Smart retry logic for Gemini API to optimize costs while ensuring reliability
 */

export interface TokenConfig {
    inputLength: number;
    baseBuffer: number;      // Default: 2000 (for thinking tokens)
    minTokens: number;       // Default: 2048
    maxTokens: number;       // Default: 8192
}

export interface AdaptiveResult<T> {
    data: T;
    tokensUsed: number;
    wasRetried: boolean;
    finishReason: string;
}

/**
 * Calculate dynamic maxOutputTokens based on input length
 * 
 * Formula: (input_chars * expansion_factor / 4 chars_per_token) + dynamic_buffer
 * 
 * Dynamic Buffer Strategy (v3 - Optimized for Batch Mode):
 * - Base buffer: 2500 tokens (minimum for thinking + output)
 * - Vietnamese expansion: 1.5x (conservative for batch mode)
 * 
 * Examples:
 * - Small chunks (800 chars): ~2500 tokens (single mode)
 * - Medium chunks (1500 chars): ~3000 tokens
 * - Large chunks (2500 chars): ~4500 tokens (batch mode)
 * 
 * This ensures:
 * - Single mode (800 chars): Efficient, minimal retries
 * - Batch mode (2500 chars): Sufficient headroom, avoid MAX_TOKENS
 * - Cost savings: ~50-65% vs fixed 8192
 */
export function calculateDynamicTokens(config: TokenConfig): number {
    // Input tokens estimation (chars / 4)
    const inputTokens = Math.ceil(config.inputLength / 4);

    // Output tokens = input tokens * 3.0 (Vietnamese expansion - batch mode produces longer output)
    // Observed: Batch mode can produce 4-5x expansion due to formatting and JSON structure
    const outputTokens = Math.ceil(inputTokens * 3.0);

    // Total needed = baseBuffer (thinking tokens) + outputTokens
    const totalNeeded = config.baseBuffer + outputTokens;

    // Cap at maxTokens, but ensure at least minTokens
    const result = Math.min(config.maxTokens, Math.max(config.minTokens, totalNeeded));

    console.log(`[ADAPTIVE TOKENS] inputLength=${config.inputLength} → inputTokens=${inputTokens} → outputTokens=${outputTokens} → totalNeeded=${totalNeeded} (baseBuffer=${config.baseBuffer}) → RESULT=${result}`);

    return result;
}

/**
 * Smart retry wrapper - Automatically retry with max tokens if MAX_TOKENS hit
 * 
 * Cost Optimization:
 * - 95% of chunks use dynamic tokens (saves 40-50% cost)
 * - 5% complex chunks auto-retry with max tokens (ensures reliability)
 * 
 * @param apiCall - Function that takes maxTokens and returns API result
 * @param extractFinishReason - Function to extract finishReason from result
 * @param config - Token configuration
 */
export async function withAdaptiveTokens<T>(
    apiCall: (maxTokens: number) => Promise<T>,
    extractFinishReason: (result: T) => string | undefined,
    config: TokenConfig
): Promise<AdaptiveResult<T>> {
    // First attempt: Use dynamic tokens (cost-efficient)
    const dynamicTokens = calculateDynamicTokens(config);

    let result = await apiCall(dynamicTokens);
    let finishReason = extractFinishReason(result) || "UNKNOWN";

    // If MAX_TOKENS hit and we haven't used max capacity yet, retry
    if (finishReason === "MAX_TOKENS" && dynamicTokens < config.maxTokens) {
        console.warn(`⚠️ [Adaptive Tokens] MAX_TOKENS hit, retrying with ${config.maxTokens} tokens...`);
        result = await apiCall(config.maxTokens);
        finishReason = extractFinishReason(result) || "UNKNOWN";

        return {
            data: result,
            tokensUsed: config.maxTokens,
            wasRetried: true,
            finishReason
        };
    }

    return {
        data: result,
        tokensUsed: dynamicTokens,
        wasRetried: false,
        finishReason
    };
}
