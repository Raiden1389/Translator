import { invoke } from "@tauri-apps/api/core";
import { getErrorMessage } from "@/lib/types";

export interface KeyStatus {
    key: string;
    status: 'valid' | 'invalid' | 'checking';
    ms?: number;
    error?: string;
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
