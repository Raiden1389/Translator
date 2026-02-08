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
export const ChapterDataSchema = z.object({
  id: z.number().optional(), // Will be removed before DB insert
  title: z.string().default("Chương mới"),
  content: z.string().optional(),
  content_original: z.string().min(1, "Nội dung chương không được để trống"),
  content_translated: z.string().default(""),
  status: z.enum(['draft', 'translated', 'reviewing']).default('draft'),
  order: z.number().positive().optional(),
  lastTranslatedAt: z.coerce.date().optional(),
  createdAt: z.coerce.date().optional(),
}).passthrough(); // Allow extra fields for flexibility

export type ChapterData = z.infer<typeof ChapterDataSchema>;

// Main JSON import schema - supports two formats:
// 1. { book: {...}, chapters: [...] }
// 2. [...] (array of chapters only)
export const JSONImportSchema = z.union([
  // Format 1: Full workspace data
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

  return {
    book: validated.book || BookInfoSchema.parse({}),
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
