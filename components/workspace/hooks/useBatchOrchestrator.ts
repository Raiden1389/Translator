/**
 * Batch Orchestrator Hook
 * 
 * Handles multi-chapter batch translation via batch API.
 * Extracted from TranslationProvider.v2.tsx for separation of concerns.
 */

import { useCallback } from "react";
import { db } from "@/lib/db";
import { migrateModelId } from "@/lib/ai-models";
import type { Chapter, CorrectionEntry, DictionaryEntry } from "@/lib/db";
import type { UseTranslationQueueReturn } from "./useTranslationQueue";
import type { UseTranslationProgressReturn } from "./useTranslationProgress";

export interface BatchTranslateConfig {
  customPrompt: string;
  enableChunking: boolean;
  maxConcurrentChunks: number;
  chunkSize?: number;
  enableThinking?: boolean;
  thinkingLevel?: "minimal" | "low" | "medium" | "high";
  enableBatch?: boolean;
  batchSize?: number;
  maxCharsPerBatch?: number;
}

/**
 * Hook that orchestrates batch (multi-chapter) translation.
 */
export function useBatchOrchestrator(
  queue: UseTranslationQueueReturn,
  progress: UseTranslationProgressReturn
) {
  const translateBatches = useCallback(async (
    chaptersToTranslate: Chapter[],
    workspaceId: string,
    config: BatchTranslateConfig,
    _glossary: readonly DictionaryEntry[],
    _corrections: CorrectionEntry[]
  ): Promise<void> => {
    console.log(`⚡ [BATCH MODE] ${chaptersToTranslate.length} chapters → batches of ${config.batchSize}`);

    const { createSmartBatches, buildBatchPrompt } = await import('@/lib/gemini/batch');
    const batches = createSmartBatches(chaptersToTranslate, {
      enabled: true,
      batchSize: config.batchSize!,
      maxCharsPerBatch: config.maxCharsPerBatch || 25000
    });

    progress.addNotification({
      message: `⚡ Batch: ${chaptersToTranslate.length} chương → ${batches.length} batches`,
      type: 'turbo'
    });

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`📦 [BATCH ${i + 1}/${batches.length}] ${batch.length} chapters`);
      batch.forEach(ch => queue.updateStatus(ch.id!, 'processing'));

      try {
        const { translateBatch } = await import('@/lib/gemini/batch-api');
        console.log(`📡 [BATCH ${i + 1}/${batches.length}] Calling API for ${batch.length} chapters...`);
        progress.addNotification({
          message: `📡 Batch ${i + 1}/${batches.length}: Đang dịch ${batch.length} chương...`,
          type: 'turbo'
        });

        const modelSetting = await db.settings.get("aiModel");
        const aiModel = migrateModelId((modelSetting?.value as string) || "gemini-2.5-flash");

        const { systemInstruction, userPrompt } = await buildBatchPrompt(batch, {
          customPrompt: config.customPrompt,
          workspaceId,
          model: aiModel,
        });

        const result = await translateBatch(
          userPrompt,
          batch,
          aiModel,
          workspaceId,
          (msg: string) => console.log(`[BATCH ${i + 1}] ${msg}`),
          config.enableChunking,
          config.chunkSize || 8000,
          config.maxConcurrentChunks || 5,
          config.enableThinking,
          config.thinkingLevel,
          systemInstruction,
          config.customPrompt
        );

        console.log(`✅ [BATCH ${i + 1}] API returned ${result.chapters.length} chapters`);

        // Save translated chapters to DB
        for (let j = 0; j < result.chapters.length; j++) {
          const translatedChapter = result.chapters[j];
          const originalChapter = batch[j];

          // Calculate per-chapter tokens (evenly distributed)
          const perChapterTokens = {
            input: Math.floor(result.stats.inputTokens / batch.length),
            output: Math.floor(result.stats.outputTokens / batch.length),
            total: Math.floor(result.stats.totalTokens / batch.length),
            thinking: Math.floor((result.stats.thinkingTokens || 0) / batch.length)
          };

          await db.chapters.update(originalChapter.id!, {
            content_translated: translatedChapter.content_translated,
            title_translated: translatedChapter.title_translated || originalChapter.title,
            status: 'translated',
            lastTranslatedAt: new Date(),
            stats: { tokens: perChapterTokens }
          });

          queue.updateStatus(originalChapter.id!, 'done');
          progress.updateChapterProgress(originalChapter.id!, {
            status: 'done',
            tokens: perChapterTokens
          });
        }

        console.log(`✅ [BATCH ${i + 1}] Saved ${result.chapters.length} chapters`);

      } catch (error) {
        console.error(`❌ [BATCH ${i + 1}] API failed:`, error);
        console.log(`⚠️ [BATCH ${i + 1}] Falling back to single-chapter mode`);
        // TODO: Implement fallback to single-chapter mode
      }
    }
  }, [queue, progress]);

  return { translateBatches };
}
