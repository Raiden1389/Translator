import { z } from 'zod';

/**
 * Zod Schema for Gemini API Response Validation
 * Validates responses from Google Gemini API to catch format changes early
 */

// Usage metadata schema
export const UsageMetadataSchema = z.object({
  promptTokenCount: z.number().int().nonnegative().optional(),
  candidatesTokenCount: z.number().int().nonnegative().optional(),
  thoughtsTokenCount: z.number().int().nonnegative().optional(), // Gemini 2.5 Flash thinking tokens
  totalTokenCount: z.number().int().nonnegative().optional(),
});

export type UsageMetadata = z.infer<typeof UsageMetadataSchema>;

// Content part schema
const ContentPartSchema = z.object({
  text: z.string(),
});

// Content schema
const ContentSchema = z.object({
  parts: z.array(ContentPartSchema),
  role: z.string().optional(),
});

// Candidate schema
const CandidateSchema = z.object({
  content: ContentSchema.optional(),
  finishReason: z.enum([
    'STOP',
    'MAX_TOKENS',
    'SAFETY',
    'RECITATION',
    'OTHER',
    'FINISH_REASON_UNSPECIFIED',
    'BLOCKLIST',
    'PROHIBITED_CONTENT',
    'SPII'
  ]).optional(),
  blockReason: z.string().optional(),
  index: z.number().int().nonnegative().optional(),
  safetyRatings: z.array(z.object({
    category: z.string(),
    probability: z.string(),
    blocked: z.boolean().optional(),
  })).optional(),
});

// Error schema
const GeminiErrorSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  status: z.string().optional(),
});

// Main Gemini API response schema
export const GeminiResponseSchema = z.object({
  candidates: z.array(CandidateSchema).optional(),
  usageMetadata: UsageMetadataSchema.optional(),
  error: GeminiErrorSchema.optional(),
  promptFeedback: z.object({
    blockReason: z.string().optional(),
    safetyRatings: z.array(z.object({
      category: z.string(),
      probability: z.string(),
      blocked: z.boolean().optional(),
    })).optional(),
  }).optional(),
});

export type GeminiResponse = z.infer<typeof GeminiResponseSchema>;

/**
 * Parse Gemini API response with validation
 * @param rawResponse - Raw response from Gemini API
 * @returns Validated response
 * @throws ZodError if validation fails
 */
export function parseGeminiResponse(rawResponse: unknown): GeminiResponse {
  return GeminiResponseSchema.parse(rawResponse);
}

/**
 * Safe parse with user-friendly error messages
 */
export function safeParseGeminiResponse(rawResponse: unknown): {
  success: true;
  data: GeminiResponse;
} | {
  success: false;
  error: string;
} {
  try {
    const data = parseGeminiResponse(rawResponse);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      const path = firstError.path.join('.');
      const message = firstError.message;
      return {
        success: false,
        error: `Gemini API response invalid tại "${path}": ${message}`,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi không xác định khi parse Gemini response",
    };
  }
}

/**
 * Extract text from validated Gemini response
 * @param response - Validated Gemini response
 * @returns Extracted text or null if not found
 */
export function extractTextFromResponse(response: GeminiResponse): string | null {
  if (response.error) {
    throw new Error(`Gemini API Error: ${response.error.message}`);
  }

  const firstCandidate = response.candidates?.[0];
  if (!firstCandidate) {
    return null;
  }

  const parts = firstCandidate.content?.parts;
  if (!parts || parts.length === 0) {
    return null;
  }

  return parts.map(p => p.text).join('');
}

/**
 * Check if response indicates token limit exceeded
 */
export function isTokenLimitExceeded(response: GeminiResponse): boolean {
  return response.candidates?.[0]?.finishReason === 'MAX_TOKENS';
}

/**
 * Check if response has safety issues
 */
export function hasSafetyIssues(response: GeminiResponse): boolean {
  return response.candidates?.[0]?.finishReason === 'SAFETY';
}
