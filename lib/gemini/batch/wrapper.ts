/**
 * Batch Translation Wrapper
 * 
 * Simple wrapper to add batch translation to existing TranslationProvider
 * Call this BEFORE the single-chapter loop
 */

import type { Chapter } from "@/lib/db";
import { createSmartBatches, buildBatchPrompt } from "@/lib/gemini/batch";

export interface BatchTranslationConfig {
  enableBatch: boolean;
  batchSize: number;
  maxCharsPerBatch: number;
  customPrompt?: string;
  workspaceId: string;
}

/**
 * Check if should use batch mode and return batches
 * Returns null if should use single-chapter mode
 */
export function prepareBatchMode(
  chapters: Chapter[],
  config: BatchTranslationConfig
): Chapter[][] | null {
  // Check if batch mode enabled
  if (!config.enableBatch || !config.batchSize || chapters.length <= 1) {
    console.log(`📝 [SINGLE MODE] Processing ${chapters.length} chapters individually`);
    return null;
  }

  console.log(`🚀 [BATCH MODE] Enabled with batch size: ${config.batchSize}`);

  // Create batches
  const batches = createSmartBatches(chapters, {
    enabled: true,
    batchSize: config.batchSize,
    maxCharsPerBatch: config.maxCharsPerBatch
  });

  console.log(`📦 [BATCH MODE] Created ${batches.length} batches from ${chapters.length} chapters`);

  return batches;
}

/**
 * Build prompt for a batch
 */
export async function buildPromptForBatch(
  batch: Chapter[],
  config: {
    customPrompt?: string;
    workspaceId: string;
  }
): Promise<string> {
  return await buildBatchPrompt(batch, config);
}
