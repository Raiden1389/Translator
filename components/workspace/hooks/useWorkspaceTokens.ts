import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { AI_MODELS, migrateModelId } from '@/lib/ai-models';

export interface WorkspaceTokenStats {
    input: number;
    output: number;
    total: number;
    cost: number;
    costBreakdown: {
        input: number;
        output: number;
    };
}

/**
 * Hook to get realtime token usage and cost for a workspace
 * Automatically updates when chapters are translated
 */
export function useWorkspaceTokens(workspaceId: string, modelId?: string): WorkspaceTokenStats {
    const stats = useLiveQuery(async () => {
        if (!workspaceId) {
            return { input: 0, output: 0, total: 0, cost: 0, costBreakdown: { input: 0, output: 0 } };
        }

        // Get all chapters for this workspace
        const chapters = await db.chapters
            .where('workspaceId')
            .equals(workspaceId)
            .toArray();

        let totalInput = 0;
        let totalOutput = 0;
        let inputCost = 0;
        let outputCost = 0;

        const selectedModel = modelId ? migrateModelId(modelId) : null;

        chapters.forEach(ch => {
            if (!ch.stats?.tokens) return;

            const chapterModel = selectedModel || migrateModelId(ch.translationModel || 'gemini-2.5-flash');
            const modelInfo = AI_MODELS.find(m => m.value === chapterModel) || AI_MODELS[0];
            const inputTokens = ch.stats.tokens.input || 0;
            const outputTokens = ch.stats.tokens.output || 0;
            const thinkingTokens = ch.stats.tokens.thinking || 0;

            totalInput += inputTokens;
            totalOutput += outputTokens;

            inputCost += (inputTokens * (modelInfo.inputPrice || 0)) / 1_000_000;
            outputCost += ((outputTokens + thinkingTokens) * (modelInfo.outputPrice || 0)) / 1_000_000;
        });

        const totalCost = inputCost + outputCost;

        return {
            input: totalInput,
            output: totalOutput,
            total: totalInput + totalOutput,
            cost: totalCost,
            costBreakdown: {
                input: inputCost,
                output: outputCost
            }
        };
    }, [workspaceId, modelId]);

    return stats || { input: 0, output: 0, total: 0, cost: 0, costBreakdown: { input: 0, output: 0 } };
}
