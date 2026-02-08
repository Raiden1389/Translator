import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { AI_MODELS } from '@/lib/ai-models';

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

        // Sum up tokens from all chapters
        chapters.forEach(ch => {
            if (ch.stats?.tokens) {
                totalInput += ch.stats.tokens.input || 0;
                totalOutput += ch.stats.tokens.output || 0;
            }
        });

        // Get model pricing
        const model = modelId || (await db.settings.get('aiModel'))?.value as string || 'gemini-2.0-flash-exp';
        const modelInfo = AI_MODELS.find(m => m.value === model) || AI_MODELS[0];

        // Calculate cost (price per 1M tokens)
        const inputCost = (totalInput * (modelInfo.inputPrice || 0)) / 1_000_000;
        const outputCost = (totalOutput * (modelInfo.outputPrice || 0)) / 1_000_000;
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
