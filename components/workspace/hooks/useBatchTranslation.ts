/**
 * Batch Translation Hook
 * 
 * Handles batch translation logic separately from single-chapter translation
 */

import { useCallback } from 'react';
import type { Chapter } from "@/lib/db";
import { prepareBatchMode, buildPromptForBatch } from "@/lib/gemini/batch/wrapper";

export interface UseBatchTranslationConfig {
  enableBatch?: boolean;
  batchSize?: number;
  maxCharsPerBatch?: number;
  customPrompt?: string;
  workspaceId: string;
}

export function useBatchTranslation() {
  /**
   * Check if should use batch mode and prepare batches
   */
  const checkBatchMode = useCallback((
    chapters: Chapter[],
    config: UseBatchTranslationConfig
  ): Chapter[][] | null => {
    return prepareBatchMode(chapters, {
      enableBatch: config.enableBatch || false,
      batchSize: config.batchSize || 3,
      maxCharsPerBatch: config.maxCharsPerBatch || 25000,
      customPrompt: config.customPrompt,
      workspaceId: config.workspaceId
    });
  }, []);

  /**
   * Build prompt for a batch
   */
  const buildBatchPrompt = useCallback(async (
    batch: Chapter[],
    config: {
      customPrompt?: string;
      workspaceId: string;
    }
  ): Promise<{ systemInstruction: string; userPrompt: string }> => {
    return await buildPromptForBatch(batch, config);
  }, []);

  return {
    checkBatchMode,
    buildBatchPrompt
  };
}
