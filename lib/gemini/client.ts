import { GoogleGenAI } from "@google/genai";
import { db } from "../db";
import { AI_MODELS, DEFAULT_MODEL } from "../ai-models";

/**
 * Record API usage metadata to IndexedDB
 */
export async function recordUsage(modelId: string, usage: any) {
    try {
        if (!usage) return;
        const modelInfo = AI_MODELS.find(m => m.value === modelId.trim()) || AI_MODELS[0];
        const inputTokens = usage.promptTokenCount || 0;
        const outputTokens = usage.candidatesTokenCount || 0;

        // Simple cost calculation (per 1M tokens)
        const cost = ((inputTokens * (modelInfo.inputPrice || 0)) / 1_000_000) +
            ((outputTokens * (modelInfo.outputPrice || 0)) / 1_000_000);

        const existing = await db.apiUsage.get(modelInfo.value);
        if (existing) {
            await db.apiUsage.update(modelInfo.value, {
                inputTokens: (existing.inputTokens || 0) + inputTokens,
                outputTokens: (existing.outputTokens || 0) + outputTokens,
                totalCost: (existing.totalCost || 0) + cost,
                updatedAt: new Date()
            });
        } else {
            await db.apiUsage.add({
                model: modelInfo.value,
                inputTokens,
                outputTokens,
                totalCost: cost,
                updatedAt: new Date()
            });
        }
    } catch (err) {
        // Silently fail usage recording
    }
}

/**
 * Get all available API keys (primary + pool)
 */
export const getAvailableKeys = async (): Promise<string[]> => {
    const primaryKey = await db.settings.get("apiKeyPrimary");
    const poolKeys = await db.settings.get("apiKeyPool");
    const keys: string[] = [];
    if (primaryKey?.value) keys.push(primaryKey.value);
    if (poolKeys?.value) {
        const pool = poolKeys.value.split(/[\n,;]+/).map((k: string) => k.trim()).filter((k: string) => k.length > 10);
        keys.push(...pool);
    }
    return Array.from(new Set(keys)).filter(k => !!k);
};

/**
 * Execute a function with key rotation fallback
 */
export async function withKeyRotation<T>(fn: (ai: GoogleGenAI) => Promise<T>, onLog?: (message: string) => void): Promise<T> {
    const keys = await getAvailableKeys();
    if (keys.length === 0) throw new Error("Missing API Key.");
    let lastError: any = null;
    for (const key of keys) {
        try {
            // Standardizing on v1beta for feature support
            const ai = new GoogleGenAI({
                apiKey: key,
                apiVersion: 'v1beta'
            });

            return await fn(ai);
        } catch (error: any) {
            lastError = error;
            continue;
        }
    }
    throw lastError;
}
