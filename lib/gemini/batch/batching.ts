/**
 * Smart Batching Logic
 */

import type { Chapter } from "@/lib/db";
import { estimateTokens } from "./tokens";

export interface BatchConfig {
  enabled: boolean;
  batchSize: number;        // 2-5 chapters per batch
  maxCharsPerBatch: number; // 25,000 default (empirical sweet spot)
}

/**
 * Create smart batches with dynamic token awareness
 * Respects: batch size limit, char limit, token limit
 */
export function createSmartBatches(
  chapters: Chapter[],
  config: BatchConfig
): Chapter[][] {
  const batches: Chapter[][] = [];
  let currentBatch: Chapter[] = [];
  let currentChars = 0;
  let currentTokens = 0;

  console.log(`🔨 [SMART BATCHING] Creating batches for ${chapters.length} chapters (size: ${config.batchSize}, max chars: ${config.maxCharsPerBatch})`);

  for (const chapter of chapters) {
    const chapterChars = chapter.content_original?.length || 0;
    const chapterTokens = estimateTokens(chapter.content_original || "");

    // Check if adding this chapter exceeds limits
    const wouldExceedChars = currentChars + chapterChars > config.maxCharsPerBatch;
    const wouldExceedCount = currentBatch.length >= config.batchSize;
    const wouldExceedTokens = currentTokens + chapterTokens > 100000; // Safety limit

    if ((wouldExceedChars || wouldExceedCount || wouldExceedTokens) && currentBatch.length > 0) {
      console.log(`  ✓ Batch ${batches.length + 1}: ${currentBatch.length} chapters, ${currentChars} chars, ${currentTokens} tokens`);
      batches.push(currentBatch);
      currentBatch = [];
      currentChars = 0;
      currentTokens = 0;
    }

    currentBatch.push(chapter);
    currentChars += chapterChars;
    currentTokens += chapterTokens;
  }

  if (currentBatch.length > 0) {
    console.log(`  ✓ Batch ${batches.length + 1}: ${currentBatch.length} chapters, ${currentChars} chars, ${currentTokens} tokens`);
    batches.push(currentBatch);
  }

  console.log(`🎯 [SMART BATCHING] Created ${batches.length} batches from ${chapters.length} chapters`);

  return batches;
}
