import { db } from "../db";
import { AI_MODELS } from "../ai-models";
import { safeParseGeminiResponse, GeminiResponse } from "../schemas/gemini-response.schema";

/**
 * Record API usage metadata to IndexedDB
 */
export async function recordUsage(modelId: string, usage: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number }) {
    try {
        if (!usage) return;
        const modelInfo = AI_MODELS.find(m => m.value === modelId.trim()) || AI_MODELS[0];
        const inputTokens = usage.promptTokenCount || 0;
        const outputTokens = usage.candidatesTokenCount || 0;
        const thinkingTokens = usage.thoughtsTokenCount || 0;  // Gemini 2.5 Flash thinking tokens

        // Cost calculation (per 1M tokens)
        // Note: Thinking tokens are billed as output tokens
        const cost = ((inputTokens * (modelInfo.inputPrice || 0)) / 1_000_000) +
            (((outputTokens + thinkingTokens) * (modelInfo.outputPrice || 0)) / 1_000_000);

        const existing = await db.apiUsage.get(modelInfo.value);
        if (existing) {
            await db.apiUsage.update(modelInfo.value, {
                inputTokens: (existing.inputTokens || 0) + inputTokens,
                outputTokens: (existing.outputTokens || 0) + outputTokens,
                thinkingTokens: (existing.thinkingTokens || 0) + thinkingTokens,
                totalCost: (existing.totalCost || 0) + cost,
                updatedAt: new Date()
            });
        } else {
            await db.apiUsage.add({
                model: modelInfo.value,
                inputTokens,
                outputTokens,
                thinkingTokens,
                totalCost: cost,
                updatedAt: new Date()
            });
        }
    } catch {
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
 * Execute a Gemini request using the NATIVE bridge (Key stays in Rust)
 * Now with Zod validation for runtime type safety
 */
export async function withKeyRotation<T = GeminiResponse>(
    params: {
        model: string,
        systemInstruction?: string,
        prompt: string,
        generationConfig?: {
            temperature?: number;
            topP?: number;
            maxOutputTokens?: number;
            responseMimeType?: string;
            thinkingConfig?: {
                thinkingBudget?: number;  // Gemini 2.5: -1 = dynamic, 0 = disabled
                thinking_level?: string;  // Gemini 3.0: "minimal" | "low" | "medium" | "high"
            };
        }
    },
    onLog?: (message: string) => void
): Promise<T> {
    const keys = await getAvailableKeys();

    const payloadObj: Record<string, unknown> = {
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

    // Safety settings: BLOCK_NONE for novel translation (horror, violence, etc.)
    payloadObj.safetySettings = [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ];

    const payload = JSON.stringify(payloadObj);
    let lastError: Error | null = null;

    // Build Key Queue: Primary settings keys first, then undefined (backend env) as extreme fallback
    const keyQueue = [...keys];
    if (keyQueue.length === 0) keyQueue.push(undefined as unknown as string);

    // Environment Check: Are we in Tauri?
    // @ts-expect-error - window internals check
    const isTauri = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;

    // Check OAuth preference
    let preferOAuth = false;
    try {
        const preferOAuthSetting = await db.settings.get("preferOAuthOverApiKey");
        preferOAuth = preferOAuthSetting?.value === true || preferOAuthSetting?.value === "true";
    } catch (error) {
        console.warn("Failed to check OAuth preference:", error);
    }

    // Try OAuth first if:
    // 1. No keys available, OR
    // 2. User prefers OAuth (toggle enabled)
    if (keys.length === 0 || preferOAuth) {
        try {
            const { getValidAccessToken, getActiveAccount } = await import("./oauth-client");
            const { getRateLimiter } = await import("./rate-limiter");

            const accessToken = await getValidAccessToken();
            const activeAccount = await getActiveAccount();

            if (accessToken && activeAccount) {
                // Get rate limiter for active account
                const rateLimiter = await getRateLimiter(activeAccount.id);

                // Estimate tokens
                const estimatedTokens = rateLimiter.estimateTokens(params.prompt + (params.systemInstruction || ""));

                // Check if we can make request
                const quotaCheck = await rateLimiter.canMakeRequest(estimatedTokens);

                if (!quotaCheck.allowed) {
                    const waitMinutes = quotaCheck.waitTime ? Math.ceil(quotaCheck.waitTime / 60000) : 0;
                    throw new Error(`⏸️ Rate limit: ${quotaCheck.reason}. Vui lòng đợi ${waitMinutes} phút.`);
                }

                // Apply delay (human-like pattern)
                const delay = rateLimiter.getDelay();
                if (delay > 0) {
                    if (onLog) onLog(`⏳ Đợi ${Math.ceil(delay / 1000)}s để tránh abuse detection...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                if (onLog) onLog("🔐 Đang dùng OAuth credentials...");

                let rawResponse: unknown;

                try {
                    if (isTauri) {
                        const responseText = await invoke<string>("native_gemini_oauth_request", {
                            payload,
                            model: params.model.trim(),
                            accessToken
                        });
                        rawResponse = JSON.parse(responseText);
                    } else {
                        const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model.trim()}:generateContent`;
                        const res = await fetch(url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${accessToken}`
                            },
                            body: payload
                        });

                        if (!res.ok) {
                            const errData = await res.json().catch(() => ({}));

                            // Check if it's a rate limit error
                            if (res.status === 429) {
                                await rateLimiter.recordError(true);
                                throw new Error("⚠️ Google đã throttle account này. Vui lòng đợi hoặc switch sang account khác.");
                            }

                            throw new Error(errData.error?.message || res.statusText);
                        }

                        rawResponse = await res.json();
                    }

                    // Record successful request
                    await rateLimiter.recordRequest(estimatedTokens);

                    const validationResult = safeParseGeminiResponse(rawResponse);

                    if (!validationResult.success) {
                        console.error("[Gemini API] Response validation failed:", validationResult.error);
                        throw new Error(`Invalid Gemini API response: ${validationResult.error}`);
                    }

                    const validated = validationResult.data;

                    if (validated.error) {
                        throw new Error(validated.error.message || "Gemini API Error");
                    }

                    return validated as T;

                } catch (requestError) {
                    // Record error
                    await rateLimiter.recordError(false);
                    throw requestError;
                }
            }
        } catch (oauthError) {
            // If user prefers OAuth but it failed, don't fallback silently
            if (preferOAuth && keys.length > 0) {
                console.warn("OAuth failed but user prefers OAuth. Falling back to API key:", oauthError);
                if (onLog) onLog("⚠️ OAuth thất bại, chuyển sang API key...");
            } else {
                console.warn("OAuth attempt failed, falling back to API key:", oauthError);
            }
            // Continue to API key rotation below
        }
    }

    for (let i = 0; i < keyQueue.length; i++) {
        const key = keyQueue[i];
        try {
            if (onLog) {
                if (!key) {
                    onLog("Thử Key hệ thống (.env)...");
                } else if (i === 0) {
                    onLog("Đang dùng API Key chính...");
                } else {
                    onLog(`Đang thử API Key phụ (${i})...`);
                }
            }

            let rawResponse: unknown;

            if (isTauri) {
                // TAURI NATIVE REQUEST
                const responseText = await invoke<string>("native_gemini_request", {
                    payload,
                    model: params.model.trim(),
                    apiKey: key
                });

                rawResponse = JSON.parse(responseText);
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

                rawResponse = await res.json();
            }

            // ✅ DEBUG: Log raw response BEFORE validation
            console.log("[DEBUG] Raw Gemini response:", JSON.stringify(rawResponse, null, 2));

            // ✅ Validate response with Zod
            const validationResult = safeParseGeminiResponse(rawResponse);

            if (!validationResult.success) {
                console.error("[Gemini API] Response validation failed:", validationResult.error);
                throw new Error(`Invalid Gemini API response: ${validationResult.error}`);
            }

            const validated = validationResult.data;

            // Check for API errors
            if (validated.error) {
                const msg = validated.error.message || "Gemini API Error";
                // Don't log error here if we have more keys to try
                if (i === keyQueue.length - 1) {
                    if (onLog) onLog(`Lỗi: ${msg}`);
                }
                throw new Error(msg);
            }

            return validated as T;

        } catch (error: unknown) {
            const errMatch = error instanceof Error ? error : new Error(String(error));
            lastError = errMatch;
            // Silent retry for intermediate keys, only log if it's the last attempt or critical
            if (i < keyQueue.length - 1) {
                console.warn(`Key rotation: Attempt ${i + 1} failed, trying next...`, errMatch.message);
            } else {
                if (onLog) onLog(`Thất bại: ${errMatch.message}`);
            }
            continue;
        }
    }
    throw lastError;
}

