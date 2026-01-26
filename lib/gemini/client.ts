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
    if (primaryKey?.value) keys.push(primaryKey.value as string);
    if (poolKeys?.value) {
        const pool = (poolKeys.value as string).split(/[\n,;]+/).map((k: string) => k.trim()).filter((k: string) => k.length > 10);
        keys.push(...pool);
    }
    return Array.from(new Set(keys)).filter(k => !!k);
};

import { invoke } from "@tauri-apps/api/core";

/**
 * Execute a function with key rotation fallback using the NATIVE bridge
 */
/**
 * Execute a Gemini request using the NATIVE bridge (Key stays in Rust)
 */
export async function withKeyRotation<T>(
    params: {
        model: string,
        systemInstruction?: string,
        prompt: string,
        generationConfig?: any
    },
    onLog?: (message: string) => void
): Promise<T> {
    const keys = await getAvailableKeys();

    const payloadObj: any = {
        contents: [{ parts: [{ text: params.prompt }] }],
    };

    if (params.systemInstruction) {
        payloadObj.systemInstruction = { parts: [{ text: params.systemInstruction }] };
    }

    if (params.generationConfig) {
        payloadObj.generationConfig = params.generationConfig;
    } else {
        payloadObj.generationConfig = {
            temperature: 0.2,
            topP: 0.95,
            maxOutputTokens: 4096,
            responseMimeType: "text/plain",
        };
    }

    const payload = JSON.stringify(payloadObj);
    let lastError: any = null;

    // Try primary first (undefined means the backend will use its .env GEMINI_API_KEY)
    const keyQueue = [undefined, ...keys];

    // Environment Check: Are we in Tauri?
    // @ts-ignore
    const isTauri = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;

    for (const key of keyQueue) {
        try {
            if (onLog) onLog(`Trying ${key ? 'Pool Key' : 'Primary/Env Key'}...`);

            if (isTauri) {
                // TAURI NATIVE REQUEST
                const responseText = await invoke<string>("native_gemini_request", {
                    payload,
                    model: params.model.trim(),
                    apiKey: key
                });

                const parsed = JSON.parse(responseText);
                if (parsed.error) {
                    const msg = parsed.error.message || "Gemini API Error (Native)";
                    if (onLog) onLog(`Error: ${msg}`);
                    throw new Error(msg);
                }
                return parsed as T;
            } else {
                // BROWSER DIRECT REQUEST (FALLBACK)
                if (!key) {
                    throw new Error("Missing API Key for browser request. (Env keys not leakable to client)");
                }

                const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model.trim()}:generateContent?key=${key}`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: payload
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.error?.message || res.statusText);
                }

                const data = await res.json();
                return data as T;
            }

        } catch (error: any) {
            lastError = error;
            if (onLog) onLog(`Failed: ${error.message}`);
            continue;
        }
    }
    throw lastError;
}
