/**
 * Batch Translation API Call
 * 
 * Calls Gemini API with batch prompt and parses response
 */

import { withKeyRotation, recordUsage } from "./client";
import { withAdaptiveTokens } from "./adaptive-tokens";
import { extractResponseText } from "./contentProcessor";
import { parseBatchResponse } from "./batch/parser";
import { buildThinkingConfig } from "./thinking-config";
import type { Chapter } from "@/lib/db";
import type { GeminiResponse } from "../schemas/gemini-response.schema";

export interface BatchTranslationResult {
  chapters: Chapter[];
  stats: {
    totalTokens: number;
    totalCost: number;
    inputTokens: number;
    outputTokens: number;
    thinkingTokens: number;
  };
}

export async function translateBatch(
  batchPrompt: string,
  originalChapters: Chapter[],
  aiModel: string,
  workspaceId: string,
  onLog: (msg: string) => void,
  enableChunking: boolean = false,
  maxCharsPerChunk: number = 8000,
  maxConcurrentChunks: number = 5,
  enableThinking?: boolean,
  thinkingLevel?: "minimal" | "low" | "medium" | "high",
  systemInstruction?: string,
  customPrompt?: string // NEW: Pass customPrompt through
): Promise<BatchTranslationResult> {

  // 🎯 BATCH MODE PRESET: Auto-adjust chunking for batch translation
  // Single mode: 5 chunks x 800 chars (fine-grained)
  // Batch mode: 5 chunks x 2500 chars (optimized for multiple chapters)
  const BATCH_CHUNK_SIZE = 2500;
  const batchModeChunkSize = enableChunking ? BATCH_CHUNK_SIZE : maxCharsPerChunk;

  console.log(`[BATCH API] Chunking: ${enableChunking ? 'ENABLED' : 'DISABLED'} | Chunk size: ${batchModeChunkSize} chars (UI setting: ${maxCharsPerChunk})`);

  onLog(`🤖 Calling Gemini API for batch of ${originalChapters.length} chapters...`);

  // Check if we should use chunking based on prompt size
  const shouldChunk = enableChunking && batchPrompt.length > batchModeChunkSize;

  if (shouldChunk) {
    onLog(`📦 Batch prompt too large (${batchPrompt.length} chars), using chunking mode...`);
    onLog(`📦 Batch preset: ${maxConcurrentChunks} chunks x ${BATCH_CHUNK_SIZE} chars/chunk`);

    // Split chapters into smaller batches based on character count
    const chunks: Chapter[][] = [];
    let currentChunk: Chapter[] = [];
    let currentChunkSize = 0;

    // Estimate base prompt overhead (instructions, formatting, etc.)
    const baseOverhead = 1000; // Rough estimate for system instructions

    for (const chapter of originalChapters) {
      const chapterSize = (chapter.content_original?.length || 0) + (chapter.title?.length || 0) + 100; // +100 for JSON formatting

      // If adding this chapter would exceed limit, start new chunk
      if (currentChunkSize + chapterSize + baseOverhead > batchModeChunkSize && currentChunk.length > 0) {
        chunks.push([...currentChunk]);
        currentChunk = [];
        currentChunkSize = 0;
      }

      currentChunk.push(chapter);
      currentChunkSize += chapterSize;
    }

    // Add last chunk
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    onLog(`📦 Split into ${chunks.length} chunks based on character count`);

    // Process each chunk
    // Process chunks concurrently
    onLog(`📦 Processing ${chunks.length} chunks concurrently...`);

    const chunkPromises = chunks.map(async (chunk, i) => {
      onLog(`📦 Starting chunk ${i + 1}/${chunks.length} (${chunk.length} chapters)...`);

      // Rebuild batch prompt for this chunk
      const { buildBatchPrompt } = await import('./batch');
      const { systemInstruction: chunkSI, userPrompt } = await buildBatchPrompt(chunk, {
        customPrompt: customPrompt || '', // FIX: Use original customPrompt
        workspaceId,
      });

      onLog(`📦 Chunk ${i + 1} prompt size: ${userPrompt.length} chars`);

      // Call API for this chunk
      return await translateBatchSingle(userPrompt, chunk, aiModel, onLog, enableThinking, thinkingLevel, chunkSI);
    });

    // Wait for all chunks to complete
    const chunkResults = await Promise.all(chunkPromises);

    // Merge results - collect all chapters first
    const allTranslatedChapters: Chapter[] = [];
    const totalStats = {
      totalTokens: 0,
      totalCost: 0,
      inputTokens: 0,
      outputTokens: 0,
      thinkingTokens: 0
    };

    for (const chunkResult of chunkResults) {
      allTranslatedChapters.push(...chunkResult.chapters);
      totalStats.totalTokens += chunkResult.stats.totalTokens;
      totalStats.inputTokens += chunkResult.stats.inputTokens;
      totalStats.outputTokens += chunkResult.stats.outputTokens;
      totalStats.thinkingTokens += chunkResult.stats.thinkingTokens;
    }

    // CRITICAL: Sort by original order to fix race condition
    // Chunks resolve in random order due to concurrent processing
    allTranslatedChapters.sort((a, b) => a.order - b.order);

    onLog(`✅ All chunks processed! Total: ${totalStats.totalTokens}t`);
    onLog(`📋 Merged ${allTranslatedChapters.length} chapters, sorted by order`);

    return {
      chapters: allTranslatedChapters,
      stats: totalStats
    };
  }

  // Single batch call (no chunking)
  // If systemInstruction not provided, build it (fallback)
  if (systemInstruction) {
    return await translateBatchSingle(batchPrompt, originalChapters, aiModel, onLog, enableThinking, thinkingLevel, systemInstruction);
  }

  const { systemInstruction: builtSystem, userPrompt } = await (async () => {
    const { buildBatchPrompt } = await import('./batch');
    return await buildBatchPrompt(originalChapters, {
      workspaceId,
      customPrompt: customPrompt // Ensure customPrompt is used
    });
  })();

  return await translateBatchSingle(userPrompt, originalChapters, aiModel, onLog, enableThinking, thinkingLevel, builtSystem);
}

async function translateBatchSingle(
  batchPrompt: string,
  originalChapters: Chapter[],
  aiModel: string,
  onLog: (msg: string) => void,
  enableThinking?: boolean,
  thinkingLevel?: "minimal" | "low" | "medium" | "high",
  systemInstruction: string = ""
): Promise<BatchTranslationResult> {
  // Call API with adaptive tokens
  const adaptiveResult = await withAdaptiveTokens(
    async (maxTokens: number) => {
      console.log(`📡 [BATCH API] Model: ${aiModel} | Prompt Size: ${batchPrompt.length} chars | maxTokens: ${maxTokens}`);

      return await withKeyRotation<GeminiResponse>(
        {
          model: aiModel.trim(),
          systemInstruction: systemInstruction, // Using the dedicated systemInstruction field!
          prompt: batchPrompt,
          generationConfig: {
            temperature: 0.1,
            topP: 0.95,
            maxOutputTokens: maxTokens,
            responseMimeType: "text/plain",
            thinkingConfig: buildThinkingConfig(aiModel, enableThinking, thinkingLevel)
          }
        },
        (msg: string) => onLog(msg)
      );
    },
    (result) => {
      const candidates = (result as GeminiResponse).candidates;
      return candidates?.[0]?.finishReason;
    },
    {
      inputLength: batchPrompt.length,
      baseBuffer: 2500, // Updated to match v3 adaptive tokens
      minTokens: 8192,  // Increased to handle thinking tokens (Gemini 2.5 Flash uses ~4000+ thinking tokens)
      maxTokens: 131072 // Gemini API max limit
    }
  );

  const rawResult = adaptiveResult.data;

  // Track usage
  if (rawResult.usageMetadata) {
    const metadata = rawResult.usageMetadata;
    const thinkingTokens = metadata.thoughtsTokenCount || 0;
    const inputTokens = metadata.promptTokenCount || 0;
    const outputTokens = metadata.candidatesTokenCount || 0;

    console.log(`🧠 [BATCH TOKENS] Input: ${inputTokens} | Output: ${outputTokens} | Thinking: ${thinkingTokens}`);

    recordUsage(aiModel, rawResult.usageMetadata);
  }

  // Extract response
  const rawText = extractResponseText(rawResult).trim();

  if (!rawText) {
    throw new Error(`❌ Batch API returned empty response!`);
  }

  // Parse batch response
  onLog(`📝 Parsing batch response...`);
  const parsed = parseBatchResponse(rawText, originalChapters);

  // Calculate stats
  const metadata = rawResult.usageMetadata || {};
  const stats = {
    totalTokens: (metadata.promptTokenCount || 0) + (metadata.candidatesTokenCount || 0) + (metadata.thoughtsTokenCount || 0),
    totalCost: 0, // TODO: Calculate cost
    inputTokens: metadata.promptTokenCount || 0,
    outputTokens: metadata.candidatesTokenCount || 0,
    thinkingTokens: metadata.thoughtsTokenCount || 0
  };

  onLog(`✅ Batch translation complete! [${stats.inputTokens}i + ${stats.outputTokens}o = ${stats.totalTokens}t]`);

  return {
    chapters: parsed.chapters,
    stats
  };
}
