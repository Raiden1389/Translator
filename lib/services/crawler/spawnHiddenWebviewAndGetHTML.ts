import { invoke } from "@tauri-apps/api/core";

/**
 * High-reliability Webview Extractor (V2 - Native Rust Driven)
 * Optimized for Tauri v2 with localStorage-based data transfer.
 */
export async function spawnHiddenWebviewAndExtract(
    url: string,
    options?: {
        extractionScript?: string;
        waitAfterLoadMs?: number;
        width?: number;
        height?: number;
        timeoutMs?: number;
        maxRetries?: number;
    }
): Promise<string> {
    const maxRetries = options?.maxRetries ?? 1;
    let attempt = 0;

    while (attempt <= maxRetries) {
        try {
            console.log(`[Crawler] Attempt ${attempt + 1}: ${url}`);

            // Direct call to Rust to handle window creation, IPC, and extraction
            const payload = await invoke<string>("native_crawl_v2", {
                url,
                extractionScript: options?.extractionScript,
                timeoutMs: options?.timeoutMs ?? 30000
            });

            if (payload.startsWith("ERROR:")) {
                throw new Error(payload);
            }

            console.log(`[Crawler] Success! Data size: ${payload.length}`);
            return payload;

        } catch (error) {
            console.error(`[Crawler] Error in attempt ${attempt + 1}:`, error);

            attempt++;
            if (attempt > maxRetries) throw error;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    throw new Error("Crawl failed after retries.");
}
