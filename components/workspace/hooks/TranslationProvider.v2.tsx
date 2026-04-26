"use client";

import React, { createContext, useContext, useCallback } from "react";
import { TranslationSettings } from "@/lib/types";
import type { Chapter, CorrectionEntry, DictionaryEntry } from "@/lib/db";
import { buildSharedGlossary } from "@/lib/services/glossary.service";
import { loadGlobalRules } from "@/lib/services/corrections.service";
import { featureFlags } from "@/lib/featureFlags";
import { buildSystemInstruction } from "@/lib/gemini/constants";

// Hooks
import { useTranslationQueue } from "./useTranslationQueue";
import { useTranslationProgress } from "./useTranslationProgress";
import { useBatchOrchestrator } from "./useBatchOrchestrator";
import { useSingleOrchestrator } from "./useSingleOrchestrator";
import { useAntigravityOrchestrator } from "./useAntigravityOrchestrator";

interface BatchTranslateProps {
    workspaceId: string;
    chapters: Chapter[];
    selectedChapters: number[];
    currentSettings: TranslationSettings;
    translateConfig: {
        customPrompt: string;
        autoExtract: boolean;
        fixPunctuation?: boolean;
        maxConcurrency?: number;
        enableChunking: boolean;
        maxConcurrentChunks: number;
        chunkSize?: number;
        enableThinking?: boolean;
        thinkingLevel?: "minimal" | "low" | "medium" | "high";
        enableBatch?: boolean;
        batchSize?: number;
        maxCharsPerBatch?: number;
    };
    onComplete?: () => void;
}

interface TranslationContextType {
    // Queue state
    isTranslating: boolean;
    queue: ReturnType<typeof useTranslationQueue>;

    // Progress state
    progress: ReturnType<typeof useTranslationProgress>;

    // Antigravity Bridge state
    bridge: ReturnType<typeof useAntigravityOrchestrator>;

    // Backward compatibility
    batchProgress: {
        current: number;
        total: number;
        currentTitle: string;
        logs?: import("./useTranslationProgress").TranslationLogEntry[];
        totalTokens?: number;
        totalCost?: number;
        turboActive?: boolean;
        chunksProcessed?: number;
        currentChunk?: number;
        totalChunks?: number;
        cacheHits?: number;
        startTime?: number;
        notifications?: import("./useTranslationProgress").SystemNotification[];
        totalTermsUsed?: number;
        totalCharactersUsed?: number;
        currentTermsUsed?: number;
        currentCharactersUsed?: number;
        chapterStats?: Array<{
            chapterId: number;
            order: number;
            title: string;
            termsUsed: number;
            charactersUsed: number;
        }>;
        batchMode?: boolean;
        batchSize?: number;
    };

    // Actions
    startBatchTranslate: (props: BatchTranslateProps) => Promise<void>;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

/**
 * TranslationProvider V3 - Orchestrator-only pattern
 * 
 * This provider is a thin shell that:
 * 1. Initializes shared resources (glossary, corrections)
 * 2. Routes to batch or single orchestrator
 * 3. Provides context to consumers
 * 
 * All heavy logic lives in extracted modules:
 * - glossary.service.ts (glossary building)
 * - useBatchOrchestrator.ts (batch mode)
 * - useSingleOrchestrator.ts (single chapter mode)
 * - chapter-title-normalizer.ts (title normalization)
 * - prepare-chapter-payload.ts (content preparation)
 */
export function TranslationProvider({ children }: { children: React.ReactNode }) {
    const queue = useTranslationQueue();
    const progress = useTranslationProgress();
    const { translateBatches } = useBatchOrchestrator(queue, progress);
    const { processAllChapters } = useSingleOrchestrator(queue, progress);
    const bridge = useAntigravityOrchestrator();

    const startBatchTranslate = useCallback(async ({
        workspaceId,
        chapters,
        selectedChapters,
        currentSettings,
        translateConfig,
        onComplete
    }: BatchTranslateProps) => {
        if (queue.isProcessing) {
            progress.addNotification({ type: 'error', message: '❌ Một tiến trình dịch khác đang chạy' });
            return;
        }

        // 1. Filter chapters to translate
        const chaptersToTranslate = (chapters?.filter(c => selectedChapters.includes(c.id!)) || [])
            .filter(c => !c.content_translated || c.content_translated.trim() === '');

        if (chaptersToTranslate.length === 0) {
            progress.addNotification({ type: 'error', message: '⚠️ Tất cả chương đã được dịch hoặc không có chương nào hợp lệ' });
            return;
        }

        // 2. Initialize queue and progress
        queue.clearQueue();
        chaptersToTranslate.forEach(c => {
            queue.addToQueue(c.id!, c.order, c.title);
        });
        progress.startTracking(chaptersToTranslate.length);
        progress.addNotification({ message: '🚀 Đang khởi tạo hệ thống...', type: 'init' });

        // 3. Build shared resources (once for entire batch)
        const sharedGlossary = await buildSharedGlossary(workspaceId, chaptersToTranslate);
        const globalRules: CorrectionEntry[] = await loadGlobalRules();

        // 3.5 Route: Antigravity Bridge (file-based fallback)
        if (featureFlags.antigravityBridge && currentSettings.model === 'antigravity-bridge') {
            try {
                // Build full system prompt with ALL translation rules from constants.ts
                const glossaryText = (sharedGlossary as DictionaryEntry[]).map(g => `${g.original}=${g.translated}`).join(', ');
                const fullPrompt = buildSystemInstruction(
                    translateConfig.customPrompt || undefined,
                    glossaryText ? `[GLOSSARY]: ${glossaryText}` : undefined,
                );

                await bridge.exportForBridge(
                    workspaceId,
                    chaptersToTranslate,
                    sharedGlossary as DictionaryEntry[],
                    globalRules,
                    fullPrompt,
                    0.1,
                );
            } catch (err) {
                progress.addNotification({ type: 'error', message: `Bridge export failed: ${err instanceof Error ? err.message : String(err)}` });
            }
            progress.stopTracking();
            onComplete?.();
            return;
        }

        // 4. Route: batch mode or single mode
        if (translateConfig.enableBatch && translateConfig.batchSize && chaptersToTranslate.length > 1) {
            await translateBatches(
                chaptersToTranslate,
                workspaceId,
                {
                    customPrompt: translateConfig.customPrompt,
                    enableChunking: translateConfig.enableChunking,
                    maxConcurrentChunks: translateConfig.maxConcurrentChunks,
                    chunkSize: translateConfig.chunkSize,
                    enableThinking: translateConfig.enableThinking,
                    thinkingLevel: translateConfig.thinkingLevel,
                    enableBatch: translateConfig.enableBatch,
                    batchSize: translateConfig.batchSize,
                    maxCharsPerBatch: translateConfig.maxCharsPerBatch,
                },
                sharedGlossary,
                globalRules
            );
        } else {
            await processAllChapters(
                chaptersToTranslate,
                workspaceId,
                {
                    customPrompt: translateConfig.customPrompt,
                    fixPunctuation: translateConfig.fixPunctuation,
                    enableChunking: translateConfig.enableChunking,
                    maxConcurrentChunks: translateConfig.maxConcurrentChunks,
                    chunkSize: translateConfig.chunkSize,
                    enableThinking: translateConfig.enableThinking,
                    thinkingLevel: translateConfig.thinkingLevel,
                    model: currentSettings.model,
                },
                sharedGlossary,
                globalRules
            );
        }

        // 5. Cleanup
        progress.stopTracking();
        onComplete?.();

        // 6. Auto-push to cloud (background, delta — only new chapters)
        import("@/lib/sync/cloud-sync").then(({ hasToken, pushDelta }) => {
            if (!hasToken()) return;
            pushDelta(workspaceId).then(result => {
                if (result.sizeKB === 0) return; // already up to date
                import("sonner").then(({ toast }) => {
                    toast.success(`☁️ Đã sync ${result.delta ? "+" + (result.chapterCount) : result.chapterCount} chương lên cloud`);
                });
            }).catch(err => {
                console.warn("[CloudSync] Auto-push failed:", err);
            });
        }).catch(() => { /* cloud-sync module not available */ });
    }, [queue, progress, bridge, translateBatches, processAllChapters]);

    // Context value (backward compat mapping)
    const value: TranslationContextType = {
        isTranslating: queue.isProcessing,
        queue,
        progress,
        bridge,
        batchProgress: {
            current: progress.aggregateStats.completedChapters,
            total: progress.aggregateStats.totalChapters,
            currentTitle: '',
            batchMode: false,
            batchSize: 3,
            logs: progress.logs,
            totalTokens: progress.aggregateStats.totalTokens,
            totalCost: progress.aggregateStats.totalCost,
            chunksProcessed: progress.aggregateStats.totalChunks,
            startTime: progress.aggregateStats.startTime,
            notifications: progress.notifications,
            totalTermsUsed: progress.aggregateStats.totalTermsUsed,
            totalCharactersUsed: progress.aggregateStats.totalCharactersUsed,
            currentTermsUsed: progress.currentChapter?.termsUsed || 0,
            currentCharactersUsed: progress.currentChapter?.charactersUsed || 0,
            currentChunk: progress.currentChapter?.currentChunk || 0,
            totalChunks: progress.currentChapter?.totalChunks || 0,
            chapterStats: Array.from(progress.progress.values())
                .filter(ch => ch.status === 'done' && (ch.termsUsed || ch.charactersUsed))
                .map(ch => ({
                    chapterId: ch.chapterId,
                    order: ch.order,
                    title: ch.title,
                    termsUsed: ch.termsUsed || 0,
                    charactersUsed: ch.charactersUsed || 0,
                }))
                .sort((a, b) => a.order - b.order),
        },
        startBatchTranslate,
    };

    return (
        <TranslationContext.Provider value={value}>
            {children}
        </TranslationContext.Provider>
    );
}

export function useTranslation() {
    const context = useContext(TranslationContext);
    if (!context) {
        throw new Error("useTranslation must be used within TranslationProvider");
    }
    return context;
}
