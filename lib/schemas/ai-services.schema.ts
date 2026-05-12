import { z } from 'zod';

/**
 * Zod Schemas for AI Services (NER, Heuristic, etc.)
 * Validates AI-generated JSON responses
 */

// Entity Type enum
export const EntityTypeSchema = z.enum([
  'Person',
  'Location',
  'Organization',
  'Skill',
  'Item',
  'Unknown'
]);

export type EntityType = z.infer<typeof EntityTypeSchema>;

// Extracted Entity schema
export const ExtractedEntitySchema = z.object({
  original: z.string().min(1, "Original name required"),
  chinese: z.string().min(1, "Chinese name required"),
  type: EntityTypeSchema,
  context: z.string().default(""),
  confidence: z.number().min(0).max(1).optional(),
});

export type ExtractedEntity = z.infer<typeof ExtractedEntitySchema>;

// NER Response (array of entities)
export const NERResponseSchema = z.array(ExtractedEntitySchema);

/**
 * Parse NER response with validation
 */
export function parseNERResponse(rawData: unknown): ExtractedEntity[] {
  return NERResponseSchema.parse(rawData);
}

/**
 * Safe parse with user-friendly errors
 */
export function safeParseNERResponse(rawData: unknown): {
  success: true;
  data: ExtractedEntity[];
} | {
  success: false;
  error: string;
} {
  try {
    const data = parseNERResponse(rawData);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      const path = firstError.path.join('.');
      const message = firstError.message;
      return {
        success: false,
        error: `AI NER response invalid tại "${path}": ${message}`,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi parse NER response",
    };
  }
}

// ============================================
// HEURISTIC REFINER SCHEMAS
// ============================================

export const RefinedTermSchema = z.object({
  original: z.string().min(1),  // The term itself
  type: z.string(),              // Entity type
  chinese: z.string().optional(),
  vietnamese: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  context: z.string().optional(),
});

export type RefinedTerm = z.infer<typeof RefinedTermSchema>;

export const HeuristicRefinerResponseSchema = z.array(RefinedTermSchema);

/**
 * Parse Heuristic Refiner response
 */
export function parseHeuristicRefinerResponse(rawData: unknown): RefinedTerm[] {
  return HeuristicRefinerResponseSchema.parse(rawData);
}

/**
 * Safe parse for Heuristic Refiner
 */
export function safeParseHeuristicRefinerResponse(rawData: unknown): {
  success: true;
  data: RefinedTerm[];
} | {
  success: false;
  error: string;
} {
  try {
    const data = parseHeuristicRefinerResponse(rawData);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      const path = firstError.path.join('.');
      const message = firstError.message;
      return {
        success: false,
        error: `Heuristic refiner response invalid tại "${path}": ${message}`,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi parse heuristic response",
    };
  }
}

// ============================================
// GLOSSARY LENIENT SCHEMAS (Prevent crashes)
// ============================================

/**
 * Lenient schema for glossary extraction
 * Only ensures it's an object, doesn't validate structure strictly
 * Prevents crashes from AI hallucination while allowing flexibility
 */
export const GlossaryResponseSchema = z.object({
  characters: z.array(z.any()).optional().default([]),
  terms: z.array(z.any()).optional().default([]),
}).catchall(z.any()); // Allow extra fields

export type GlossaryResponse = z.infer<typeof GlossaryResponseSchema>;

/**
 * Lenient schema for categorize/translate responses
 */
export const TermArraySchema = z.array(z.record(z.string(), z.any()));

/**
 * Safe parse for glossary response
 */
export function safeParseGlossaryResponse(rawData: unknown): {
  success: true;
  data: GlossaryResponse;
} | {
  success: false;
  error: string;
} {
  try {
    const data = GlossaryResponseSchema.parse(rawData);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Glossary response invalid: Expected object with characters/terms arrays`,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi parse glossary response",
    };
  }
}

/**
 * Safe parse for term arrays (categorize/translate)
 */
export function safeParseTermArray(rawData: unknown): {
  success: true;
  data: Record<string, any>[];
} | {
  success: false;
  error: string;
} {
  try {
    const data = TermArraySchema.parse(rawData);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Term array invalid: Expected array of objects`,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi parse term array",
    };
  }
}
