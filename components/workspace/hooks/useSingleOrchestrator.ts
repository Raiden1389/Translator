/**
 * Single Chapter Orchestrator Hook
 * 
 * Handles single-chapter translation (with optional chunking).
 * Extracted from TranslationProvider.v2.tsx for separation of concerns.
 */

import { useCallback } from "react";
import { db, DictionaryEntry } from "@/lib/db";
import type { Chapter, CorrectionEntry } from "@/lib/db";
import {
  translateChapter,
  translateWithChunking,
  TranslationLog,
  TranslationResult,
} from "@/lib/gemini";
import { sanitizeTranslatedContent } from "@/lib/utils/text-sanitizer";
import { normalizeChapterTitle } from "@/lib/utils/chapter-title-normalizer";
import { prepareChapterPayload } from "@/lib/utils/prepare-chapter-payload";
import { applyCorrectionsToChapter } from "@/lib/services/corrections.service";
import { aiQueue } from "@/lib/services/ai-queue";
import type { UseTranslationQueueReturn } from "./useTranslationQueue";
import type { UseTranslationProgressReturn } from "./useTranslationProgress";

export interface SingleTranslateConfig {
  customPrompt: string;
  fixPunctuation?: boolean;
  enableChunking: boolean;
  maxConcurrentChunks: number;
  chunkSize?: number;
  enableThinking?: boolean;
  thinkingLevel?: "minimal" | "low" | "medium" | "high";
  model: string;
}

/**
 * Hook that orchestrates single-chapter translation (parallel via aiQueue).
 */
export function useSingleOrchestrator(
  queue: UseTranslationQueueReturn,
  progress: UseTranslationProgressReturn
) {
  const processAllChapters = useCallback(async (
    chaptersToTranslate: Chapter[],
    workspaceId: string,
    config: SingleTranslateConfig,
    glossary: readonly DictionaryEntry[],
    corrections: CorrectionEntry[]
  ): Promise<void> => {

    const processChapter = async (chapter: Chapter) => {
      const logId = `chap-${chapter.id}`;

      // Update queue and progress
      queue.updateStatus(chapter.id!, 'processing');
      progress.updateChapterProgress(chapter.id!, {
        chapterId: chapter.id!,
        order: chapter.order,
        title: chapter.title,
        translationModel: config.model,
        status: 'processing',
      });

      // Log handler with token/chunk parsing
      const onLog = (log: TranslationLog | string) => {
        const msg = typeof log === 'string' ? log : log.message;
        const type = typeof log === 'string' ? 'info' : (log.type || 'info');

        const tokenMatch = msg.match(/\[(\d+)i \+ (\d+)o = (\d+)t\]/);
        const tokens = tokenMatch ? {
          input: parseInt(tokenMatch[1]),
          output: parseInt(tokenMatch[2]),
          total: parseInt(tokenMatch[3])
        } : undefined;

        const chunksMatch = msg.match(/\((\d+) chunks\)/);
        const chunks = chunksMatch ? parseInt(chunksMatch[1]) : undefined;

        progress.addLog({ id: logId, message: msg, type, order: chapter.order, tokens, chunks });
        progress.updateChapterProgress(chapter.id!, { tokens, chunks });
      };

      try {
        // Build prompt
        let finalPrompt = config.customPrompt || "";
        if (config.fixPunctuation) {
          finalPrompt += "\n\n[QUAN TRỌNG] Văn bản gốc có thói quen ngắt dòng bằng dấu phẩy. Mày hãy tự động sửa lại hệ thống dấu câu sao cho đúng chuẩn văn học Việt Nam.";
        }

        // Prepare content (clean HTML + prepend title)
        const content_original = prepareChapterPayload(chapter);
        const startTime = Date.now();

        // Translate (chunking or standard)
        let result: TranslationResult;

        if (config.enableChunking) {
          result = await translateWithChunking(
            workspaceId,
            content_original,
            translateChapter,
            onLog,
            {
              enabled: config.enableChunking,
              maxCharsPerChunk: config.chunkSize || 8000,
              maxConcurrent: config.maxConcurrentChunks || 5,
              onProgress: (current, total) => {
                progress.updateChapterProgress(chapter.id!, {
                  status: 'processing',
                  chunks: total,
                  currentChunk: current,
                  totalChunks: total
                });
                onLog({
                  timestamp: new Date(),
                  message: `📦 Đang dịch chunk ${current}/${total}...`,
                  type: 'info'
                });
              },
              enableThinking: config.enableThinking,
              thinkingLevel: config.thinkingLevel,
            },
            finalPrompt,
            glossary as DictionaryEntry[]
          );
        } else {
          result = await new Promise((resolve, reject) => {
            translateChapter(
              workspaceId,
              content_original,
              onLog,
              (res) => resolve(res as TranslationResult),
              finalPrompt,
              glossary as DictionaryEntry[],
              config.enableThinking,
              config.thinkingLevel
            ).catch(reject);
          });
        }

        // Normalize title (single source of truth)
        const finalTitle = normalizeChapterTitle(
          result.translatedTitle || "",
          chapter.title || ""
        );

        // Sanitize content
        const cleanTranslatedText = sanitizeTranslatedContent(result.translatedText);
        const cleanTranslatedTitle = sanitizeTranslatedContent(finalTitle);

        // Save to DB
        await db.chapters.update(chapter.id!, {
          content_translated: cleanTranslatedText,
          title_translated: cleanTranslatedTitle,
          wordCountTranslated: cleanTranslatedText.trim().split(/\s+/).length,
          status: 'translated',
          lastTranslatedAt: new Date(),
          translationModel: config.model,
          translationDurationMs: Date.now() - startTime,
          stats: result.stats
        });

        // Calculate dictionary usage
        const chapterContent = chapter.content_original || "";
        const termsUsed = (glossary as DictionaryEntry[]).filter(term =>
          term.type !== 'character' && chapterContent.includes(term.original)
        ).length;
        const charactersUsed = (glossary as DictionaryEntry[]).filter(term =>
          term.type === 'character' && chapterContent.includes(term.original)
        ).length;

        // Auto-apply corrections (silent)
        await applyCorrectionsToChapter(chapter.id!, corrections);

        // Success
        onLog({
          message: `✅ Lưu thành công! (${((Date.now() - startTime) / 1000).toFixed(1)}s)`,
          type: 'success',
          timestamp: new Date()
        } as TranslationLog);

        queue.updateStatus(chapter.id!, 'done');
        progress.updateChapterProgress(chapter.id!, {
          status: 'done',
          translationModel: config.model,
          termsUsed,
          charactersUsed,
          tokens: result.stats?.tokens ? {
            input: result.stats.tokens.input,
            output: result.stats.tokens.output,
            total: result.stats.tokens.total
          } : undefined,
        });

      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        queue.updateStatus(chapter.id!, 'error', message);
        progress.updateChapterProgress(chapter.id!, { status: 'error', error: message });
        onLog({ message: `❌ Lỗi: ${message}`, type: 'error', timestamp: new Date() });
      }
    };

    // Queue all chapters via aiQueue (respects global concurrency)
    const promises = chaptersToTranslate.map(chapter =>
      aiQueue.enqueue('MEDIUM', () => processChapter(chapter))
    );

    await Promise.all(promises);
  }, [queue, progress]);

  return { processAllChapters };
}
