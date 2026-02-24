import { z } from 'zod';

/**
 * Zod Schema for JSON Import Validation
 * Validates data from crawler JSON files before importing into workspace
 */

// Book metadata schema
export const BookInfoSchema = z.object({
  title: z.string().min(1, "Tiêu đề không được để trống").default("Bộ truyện mới"),
  author: z.string().default("Chưa rõ"),
  cover: z.string().optional(),
  description: z.string().optional(),
  genre: z.string().default("Khác"),
  language: z.string().optional(),
});

export type BookInfo = z.infer<typeof BookInfoSchema>;

// Chapter data schema
// z.preprocess normalizes 'content' → 'content_original' before validation
// so crawler JSON (which uses 'content') works without changes
export const ChapterDataSchema = z.preprocess(
  (ch) => {
    if (typeof ch !== 'object' || ch === null) return ch;
    const c = ch as Record<string, unknown>;
    return {
      ...c,
      // Crawler uses 'content', translator uses 'content_original' — unify
      content_original: c.content_original || c.content || '',
    };
  },
  z.object({
    id: z.number().optional(),
    title: z.string().default("Chương mới"),
    content: z.string().optional(),
    content_original: z.string().default(''),
    content_translated: z.string().optional().default(""),
    status: z.enum(['draft', 'translated', 'reviewing']).default('draft'),
    order: z.number().positive().optional(),
    lastTranslatedAt: z.coerce.date().optional(),
    createdAt: z.coerce.date().optional(),
  }).passthrough()
);

export type ChapterData = z.infer<typeof ChapterDataSchema>;

// Main JSON import schema - supports three formats:
// 1. { book: {...}, chapters: [...] }       ← translator backup
// 2. [...] (array of chapters only)
// 3. { metadata: {...}, chapters: [...] }   ← crawler export format
export const JSONImportSchema = z.union([
  // Format 3: Crawler export { metadata, chapters }
  z.object({
    metadata: BookInfoSchema.optional(),
    chapters: z.array(ChapterDataSchema).min(1, "Phải có ít nhất 1 chương"),
  }),
  // Format 1: Full workspace data { book, chapters }
  z.object({
    book: BookInfoSchema.optional(),
    chapters: z.array(ChapterDataSchema).min(1, "Phải có ít nhất 1 chương"),
  }),
  // Format 2: Chapters array only
  z.array(ChapterDataSchema).min(1, "Phải có ít nhất 1 chương"),
]);

export type JSONImportData = z.infer<typeof JSONImportSchema>;

/**
 * Parse and validate JSON import data
 * @param rawData - Raw JSON data from file
 * @returns Validated data with proper types
 * @throws ZodError if validation fails
 */
export function parseJSONImport(rawData: unknown): {
  book: BookInfo;
  chapters: ChapterData[];
} {
  const validated = JSONImportSchema.parse(rawData);

  // Normalize to consistent format
  if (Array.isArray(validated)) {
    return {
      book: BookInfoSchema.parse({}), // Use defaults
      chapters: validated,
    };
  }

  // Handle both 'book' and 'metadata' keys (backward compat + crawler format)
  const bookSource = ('metadata' in validated ? validated.metadata : null)
    || ('book' in validated ? validated.book : null)
    || {};

  return {
    book: BookInfoSchema.parse(bookSource),
    chapters: validated.chapters,
  };
}

/**
 * Safe parse with user-friendly error messages
 */
export function safeParseJSONImport(rawData: unknown): {
  success: true;
  data: { book: BookInfo; chapters: ChapterData[] };
} | {
  success: false;
  error: string;
} {
  try {
    const data = parseJSONImport(rawData);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      const path = firstError.path.join('.');
      const message = firstError.message;
      return {
        success: false,
        error: `Lỗi tại "${path}": ${message}`,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi không xác định",
    };
  }
}
