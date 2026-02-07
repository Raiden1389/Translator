import { z } from 'zod';

/**
 * Versioned Backup Schemas
 * Ensures backward compatibility when backup format evolves
 */

// ============================================
// VERSION 1 - Current Format
// ============================================

export const BackupV1Schema = z.object({
  version: z.literal('1').default('1'),
  workspace: z.any(), // Lenient - don't validate internal structure
  chapters: z.array(z.any()),
  dictionary: z.array(z.any()).optional(),
  blacklist: z.array(z.any()).optional(),
  characters: z.array(z.any()).optional(),
  heuristicTerms: z.array(z.any()).optional(),
  corrections: z.array(z.any()).optional(),
  exportedAt: z.string().optional(),
});

export type BackupV1 = z.infer<typeof BackupV1Schema>;

// ============================================
// DISCRIMINATED UNION (Future-proof)
// ============================================

/**
 * Main Backup Schema - supports multiple versions
 * When adding V2, just add to the union:
 * 
 * const BackupV2Schema = z.object({
 *   version: z.literal('2'),
 *   // ... new fields
 * });
 * 
 * export const BackupSchema = z.discriminatedUnion('version', [
 *   BackupV1Schema,
 *   BackupV2Schema,
 * ]);
 */
export const BackupSchema = z.discriminatedUnion('version', [
  BackupV1Schema,
]);

export type Backup = z.infer<typeof BackupSchema>;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Parse backup with validation
 */
export function parseBackup(rawData: unknown): Backup {
  return BackupSchema.parse(rawData);
}

/**
 * Safe parse with user-friendly errors
 */
export function safeParseBackup(rawData: unknown): {
  success: true;
  data: Backup;
} | {
  success: false;
  error: string;
} {
  try {
    const data = parseBackup(rawData);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      const path = firstError.path.join('.');
      const message = firstError.message;
      return {
        success: false,
        error: `Backup file invalid tại "${path}": ${message}`,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi parse backup file",
    };
  }
}

/**
 * Add version to backup data if missing (for backward compatibility)
 */
export function ensureBackupVersion(rawData: any): any {
  if (!rawData.version) {
    return { ...rawData, version: '1' };
  }
  return rawData;
}
