import { invoke } from "@tauri-apps/api/core";
import { getErrorMessage } from "@/lib/types";
import { DEFAULT_VERTEX_LOCATION, type AIProvider, normalizeAIProvider } from "@/lib/ai-provider";
import { AI_MODELS } from "@/lib/ai-models";
import { GoogleGenAI } from "@google/genai";

export interface KeyStatus {
    key: string;
    status: 'valid' | 'invalid' | 'checking';
    ms?: number;
    error?: string;
}

function normalizeModelName(name: string): string {
    return name.split("/").pop() || name;
}

function getVertexFallbackModels(): { value: string, label: string }[] {
    return AI_MODELS
        .filter((m) => m.value !== "antigravity-bridge")
        .map((m) => ({ value: m.value, label: m.label }));
}

export async function checkGeminiKey(key: string, model: string = "gemini-1.5-flash"): Promise<KeyStatus> {
    const start = Date.now();
    try {
        // Use backend to test the key
        // We send a minimal payload to Rust
        const payload = JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: "hi" }] }]
        });

        const result = await invoke<string>("native_gemini_request", {
            payload,
            model,
            apiKey: key
        });

        // Basic check if response contains expected fields (Google API returns JSON as string)
        const parsed = JSON.parse(result);
        if (parsed.candidates || parsed.usageMetadata) {
            return { key, status: 'valid', ms: Date.now() - start };
        }

        return { key, status: 'invalid', error: "Invalid response format from API" };
    } catch (e: unknown) {
        let errorMsg = getErrorMessage(e);
        if (errorMsg.includes("429") || errorMsg.includes("Quota")) errorMsg = "Hết hạn mức (Quota)";
        if (errorMsg.includes("expired")) errorMsg = "Key hết hạn";
        if (errorMsg.includes("API_KEY_INVALID")) errorMsg = "Key không hợp lệ";

        return { key, status: 'invalid', error: errorMsg };
    }
}

export async function fetchGeminiModels(key: string): Promise<{ value: string, label: string }[]> {
    try {
        const result = await invoke<string>("native_list_models", { apiKey: key });
        const data = JSON.parse(result);
        if (data.models) {
            return data.models
                .map((m: { name: string }) => {
                    const id = m.name.replace("models/", "");
                    return { value: id, label: id };
                })
                .filter((m: { value: string }) => m.value.includes("gemini"));
        }
        throw new Error(data.error?.message || "Không thể lấy danh sách Model.");
    } catch (e) {
        throw e;
    }
}

export async function checkVertexKey(key: string, model: string = "gemini-2.5-flash"): Promise<KeyStatus> {
    const start = Date.now();
    try {
        const payload = JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: "hi" }] }]
        });

        const result = await invoke<string>("native_vertex_request", {
            payload,
            model,
            apiKey: key
        });

        const parsed = JSON.parse(result);
        if (parsed.candidates || parsed.usageMetadata) {
            return { key, status: 'valid', ms: Date.now() - start };
        }

        return { key, status: 'invalid', error: "Invalid response format from Vertex AI" };
    } catch (e: unknown) {
        let errorMsg = getErrorMessage(e);
        if (errorMsg.includes("403")) errorMsg = "403 Forbidden - kiểm tra Vertex key/quyền truy cập";
        if (errorMsg.includes("429") || errorMsg.includes("Quota")) errorMsg = "Hết hạn mức (Quota)";
        if (errorMsg.includes("expired")) errorMsg = "Key hết hạn";

        return { key, status: 'invalid', error: errorMsg };
    }
}

export async function fetchVertexModels(key: string): Promise<{ value: string, label: string }[]> {
    try {
        const ai = new GoogleGenAI({
            vertexai: true,
            apiKey: key,
            location: DEFAULT_VERTEX_LOCATION,
            apiVersion: "v1",
        });

        const pager = await ai.models.list();
        const models: { value: string, label: string }[] = [];

        for await (const model of pager) {
            const modelName = typeof model?.name === "string" ? model.name : "";
            const supportedMethods = Array.isArray(model?.supportedActions)
                ? model.supportedActions
                : [];
            const normalizedId = normalizeModelName(modelName);

            const canGenerate =
                normalizedId.includes("gemini") &&
                (
                    supportedMethods.length === 0 ||
                    supportedMethods.some((method) => String(method).toLowerCase().includes("generate"))
                );

            if (canGenerate) {
                models.push({
                    value: normalizedId,
                    label: (model as { displayName?: string }).displayName
                        ? `${(model as { displayName: string }).displayName} (${normalizedId})`
                        : normalizedId
                });
            }
        }

        if (models.length > 0) {
            const deduped = Array.from(new Map(models.map((m) => [m.value, m])).values());
            return deduped;
        }

        return getVertexFallbackModels();
    } catch (e: unknown) {
        const message = getErrorMessage(e);

        if (
            message.includes("403") ||
            message.includes("401") ||
            message.includes("API_KEY") ||
            message.includes("PERMISSION_DENIED")
        ) {
            throw new Error(`Vertex AI key không hợp lệ hoặc chưa đủ quyền: ${message}`);
        }

        // Some Vertex Express Mode accounts can generate content but not expose list-models cleanly.
        // Fallback to the app's curated Gemini model list instead of blocking the UI.
        return getVertexFallbackModels();
    }
}

export async function checkProviderKey(provider: AIProvider, key: string, model: string): Promise<KeyStatus> {
    return normalizeAIProvider(provider) === "vertex"
        ? checkVertexKey(key, model)
        : checkGeminiKey(key, model);
}
