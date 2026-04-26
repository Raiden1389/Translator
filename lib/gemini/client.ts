import { db } from "../db";
import { AI_MODELS, migrateModelId } from "../ai-models";
import { safeParseGeminiResponse, GeminiResponse } from "../schemas/gemini-response.schema";

/**
 * Record API usage metadata to IndexedDB
 */
export async function recordUsage(modelId: string, usage: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number }) {
    try {
        if (!usage) return;
        const normalizedModelId = migrateModelId(modelId.trim());
        const modelInfo = AI_MODELS.find(m => m.value === normalizedModelId) || AI_MODELS[0];
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

    // Safety settings: BLOCK_NONE for novel translation
    // Matches working config from ai-fiction-game (BLOCK_NONE proven, OFF/CIVIC_INTEGRITY may cause rejection)
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

            if (!accessToken || !activeAccount) {
                const reason = !activeAccount ? "Chưa chọn tài khoản active" : "Token hết hạn và không thể refresh";
                if (onLog) onLog(`⚠️ OAuth fallback: ${reason}`);
                
                // If user STRICTLY prefers OAuth, throw here instead of falling back to 0 keys
                if (preferOAuth && keys.length === 0) {
                    throw new Error(`OAuth Error: ${reason}. Vui lòng đăng nhập lại trong Settings.`);
                }
            }

            if (accessToken && activeAccount) {
                // Line 148: Keep as diagnostic log, but the main status will be in line 176
                if (onLog) onLog(`🔑 Auth: OAuth (${activeAccount.email})`);

                // Get rate limiter for active account
                const rateLimiter = await getRateLimiter(activeAccount.id);

                // Estimate tokens
                const estimatedTokens = rateLimiter.estimateTokens(params.prompt + (params.systemInstruction || ""));
                if (onLog) onLog(`📊 Token ước tính: ~${estimatedTokens.toLocaleString()}`);

                // Check if we can make request — auto-wait for short windows (RPM/TPM)
                const MAX_RATE_RETRIES = 3;
                let rateLimitRetries = 0;
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    const quotaCheck = await rateLimiter.canMakeRequest(estimatedTokens);
                    if (quotaCheck.allowed) break;

                    const waitMs = quotaCheck.waitTime ?? 60000;
                    const isShortWait = waitMs <= 70_000; // <= 70s → RPM/TPM window

                    if (!isShortWait || rateLimitRetries >= MAX_RATE_RETRIES) {
                        // Daily/hourly limit or exhausted retries → give up
                        const waitMinutes = Math.ceil(waitMs / 60000);
                        throw new Error(`⏸️ Rate limit: ${quotaCheck.reason}. Vui lòng đợi ${waitMinutes} phút.`);
                    }

                    // RPM window: sleep and retry
                    rateLimitRetries++;
                    const waitSec = Math.ceil(waitMs / 1000) + 2; // +2s buffer
                    if (onLog) onLog(`⏸️ RPM limit — tự đợi ${waitSec}s rồi tiếp (${rateLimitRetries}/${MAX_RATE_RETRIES})...`);
                    await new Promise(resolve => setTimeout(resolve, waitMs + 2000));
                }

                // Get metrics for display
                const metrics = await rateLimiter.getMetrics();
                if (onLog) onLog(`📈 Hôm nay: ${metrics.requestsToday} req | ${(metrics.tokensToday / 1000).toFixed(1)}K tokens`);

                // Apply delay (human-like pattern)
                const delay = rateLimiter.getDelay();
                if (delay > 0) {
                    if (onLog) onLog(`⏳ Delay ${(delay / 1000).toFixed(1)}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                if (onLog) onLog(`🚀 Gọi OAuth: ${activeAccount.email} (${params.model.trim()})`);

                let rawResponse: unknown;
                const requestStart = Date.now();

                try {
                    if (isTauri) {
                        let responseText: string;
                        try {
                            responseText = await invoke<string>("native_gemini_oauth_request", {
                                payload,
                                model: params.model.trim(),
                                accessToken
                            });
                        } catch (rustErr) {
                            // Rust returns Err("HTTP_ERROR:<status>:<body>") for non-2xx responses
                            const errStr = String(rustErr);
                            const httpErrMatch = errStr.match(/^HTTP_ERROR:(\d+):([\s\S]*)$/);
                            if (httpErrMatch) {
                                const statusCode = parseInt(httpErrMatch[1], 10);
                                const errBody = httpErrMatch[2];
                                if (statusCode === 429) {
                                    await rateLimiter.recordError(true);
                                    if (onLog) onLog(`🚨 429 Rate Limited! (${activeAccount.email}) — Google đang throttle, cần đợi.`);
                                    throw new Error("⚠️ Google đã throttle account này. Vui lòng đợi hoặc switch sang account khác.");
                                }
                                if (statusCode === 401) {
                                    if (onLog) onLog(`🔐 401 Unauthorized — Token hết hạn, cần refresh.`);
                                    throw new Error("⚠️ OAuth token hết hạn (401). Vui lòng vào Settings → Refresh token.");
                                }
                                // Generic HTTP error
                                let apiMsg = errStr;
                                try { apiMsg = JSON.parse(errBody)?.error?.message || errBody; } catch { /* keep raw */ }
                                if (onLog) onLog(`❌ HTTP ${statusCode}: ${apiMsg.slice(0, 80)}`);
                                throw new Error(`Gemini API Error ${statusCode}: ${apiMsg}`);
                            }
                            // Non-HTTP error (network, etc.) — rethrow as-is
                            throw rustErr;
                        }
                        rawResponse = JSON.parse(responseText);
                    } else {
                        const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model.trim()}:generateContent`;
                        const res = await fetch(url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${accessToken}`,
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
                            },
                            body: payload
                        });

                        if (!res.ok) {
                            const errData = await res.json().catch(() => ({}));

                            // Check if it's a rate limit error
                            if (res.status === 429) {
                                await rateLimiter.recordError(true);
                                if (onLog) onLog("🚨 429 Throttled!");
                                throw new Error("⚠️ Google đã throttle account này. Vui lòng đợi hoặc switch sang account khác.");
                            }

                            throw new Error(errData.error?.message || res.statusText);
                        }

                        rawResponse = await res.json();
                    }

                    const elapsed = ((Date.now() - requestStart) / 1000).toFixed(1);
                    if (onLog) onLog(`✅ Phản hồi trong ${elapsed}s`);

                    // Record successful request
                    await rateLimiter.recordRequest(estimatedTokens);

                    // Debug: Log raw response structure before validation
                    const rawObj = rawResponse as Record<string, unknown>;
                    const rawCandidates = rawObj?.candidates;
                    const rawPromptFeedback = rawObj?.promptFeedback;
                    if (!Array.isArray(rawCandidates) || !rawCandidates.length || rawPromptFeedback) {
                        console.error(`\n${'='.repeat(60)}`);
                        console.error(`🔍 [RAW API RESPONSE - PRE-VALIDATION]`);
                        console.error(`Candidates: ${Array.isArray(rawCandidates) ? rawCandidates.length : 'N/A'}`);
                        console.error(`PromptFeedback:`, JSON.stringify(rawPromptFeedback, null, 2));
                        console.error(`Top-level keys: ${Object.keys(rawObj || {}).join(', ')}`);
                        console.error(`${'='.repeat(60)}\n`);
                    }

                    const validationResult = safeParseGeminiResponse(rawResponse);

                    if (!validationResult.success) {
                        console.error("[Gemini API] Response validation failed:", validationResult.error);
                        console.error("[Gemini API] Raw response (first 2000 chars):", JSON.stringify(rawResponse).slice(0, 2000));
                        throw new Error(`Invalid Gemini API response: ${validationResult.error}`);
                    }

                    const validated = validationResult.data;

                    if (validated.error) {
                        throw new Error(validated.error.message || "Gemini API Error");
                    }

                    return validated as T;

                } catch (requestError) {
                    const elapsed = ((Date.now() - requestStart) / 1000).toFixed(1);
                    if (onLog) onLog(`❌ Lỗi OAuth [${activeAccount.email}] sau ${elapsed}s: ${requestError instanceof Error ? requestError.message.slice(0, 80) : 'Unknown'}`);
                    // Record error
                    await rateLimiter.recordError(false);
                    throw requestError;
                }
            }
        } catch (oauthError) {
            // If user prefers OAuth but it failed, don't fallback silently
            const errMsg = oauthError instanceof Error ? oauthError.message : String(oauthError);
            if (preferOAuth && keys.length === 0) {
                // No keys and OAuth failed -> this is the end of the line
                throw oauthError;
            }
            
            console.warn("OAuth attempt failed, falling back to API key pool:", oauthError);
            if (onLog) onLog(`⚠️ OAuth failed (${errMsg.slice(0, 40)}...), thử dùng API Key pool...`);
            // Continue to API key rotation below
        }
    }

    for (let i = 0; i < keyQueue.length; i++) {
        const key = keyQueue[i];
        try {
            if (onLog) {
                if (!key) {
                    onLog(`🚀 Gọi API: System Key (env) [${params.model.trim()}]`);
                } else if (i === 0) {
                    onLog(`🚀 Gọi API: Primary Key [${params.model.trim()}]`);
                } else {
                    onLog(`🚀 Gọi API: Pool Key #${i} [${params.model.trim()}]`);
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

            // Debug: Log raw response structure before validation (only when suspicious)
            const rawCandidates = (rawResponse as Record<string, unknown>)?.candidates;
            const rawPromptFeedback = (rawResponse as Record<string, unknown>)?.promptFeedback;
            if (!Array.isArray(rawCandidates) || !rawCandidates.length || rawPromptFeedback) {
                console.error(`\n${'='.repeat(60)}`);
                console.error(`🔍 [RAW API RESPONSE - API KEY PATH]`);
                console.error(`Candidates: ${Array.isArray(rawCandidates) ? rawCandidates.length : 'N/A'}`);
                console.error(`PromptFeedback:`, JSON.stringify(rawPromptFeedback, null, 2));
                console.error(`Top-level keys: ${Object.keys((rawResponse as Record<string, unknown>) || {}).join(', ')}`);
                console.error(`${'='.repeat(60)}\n`);
            }

            // ✅ Validate response with Zod
            const validationResult = safeParseGeminiResponse(rawResponse);

            if (!validationResult.success) {
                console.error("[Gemini API] Response validation failed:", validationResult.error);
                console.error("[Gemini API] Raw response (first 2000 chars):", JSON.stringify(rawResponse).slice(0, 2000));
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
