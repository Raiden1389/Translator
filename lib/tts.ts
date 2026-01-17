import { invoke } from "@tauri-apps/api/core";
import { db } from "./db";

export const VIETNAMESE_VOICES = [
    { name: "Hoài My (Nữ)", value: "vi-VN-HoaiMyNeural" },
    { name: "Nam Minh (Nam)", value: "vi-VN-NamMinhNeural" },
];

export async function speak(chapterId: number, text: string, voice: string = "vi-VN-HoaiMyNeural"): Promise<string> {
    // 1. Check Cache
    const cache = await db.ttsCache.where({ chapterId, voice }).first();
    if (cache) {
        console.log("TTS Cache Hit!", chapterId);
        const blob = new Blob([new Uint8Array(cache.blob)], { type: 'audio/mpeg' });
        return URL.createObjectURL(blob);
    }

    // 2. Fetch from Backend
    console.log("TTS Fetching...", chapterId);
    const audioData = await invoke<number[]>("edge_tts_speak", { text, voice });
    const uint8Array = new Uint8Array(audioData);

    // 3. Save to Cache (Async)
    // Convert Uint8Array to ArrayBuffer for Dexie storage
    db.ttsCache.add({
        chapterId,
        voice,
        blob: uint8Array.buffer,
        createdAt: new Date()
    }).catch(e => console.error("Failed to cache TTS:", e));

    const blob = new Blob([uint8Array], { type: 'audio/mpeg' });
    return URL.createObjectURL(blob);
}

export async function prefetchTTS(chapterId: number, text: string, voice: string) {
    const exists = await db.ttsCache.where({ chapterId, voice }).count();
    if (exists > 0) return; // Already cached

    // Generate in background
    speak(chapterId, text, voice).then(url => {
        console.log(`Prefetched TTS for chapter ${chapterId}`);
        // Clean up the URL object since we only wanted to populate cache
        URL.revokeObjectURL(url);
    }).catch(e => console.error("Prefetch failed:", e));
}
