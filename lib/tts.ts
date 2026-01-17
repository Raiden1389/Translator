import { invoke } from "@tauri-apps/api/core";
import { db } from "./db";

export const VIETNAMESE_VOICES = [
    { name: "Hoài My (Nữ)", value: "vi-VN-HoaiMyNeural" },
    { name: "Nam Minh (Nam)", value: "vi-VN-NamMinhNeural" },
];

export function getTextHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash.toString();
}

export async function speak(
    chapterId: number,
    text: string,
    voice: string = "vi-VN-HoaiMyNeural",
    pitch: string = "+0Hz",
    rate: string = "+0%"
): Promise<string> {
    // Validation / Fallback
    if (!pitch || pitch === 'undefined' || pitch === 'undefinedHz') pitch = "+0Hz";
    if (!rate || rate === 'undefined' || rate === 'undefined%') rate = "+0%";

    const textHash = getTextHash(text);

    // Safety check: ensure all query parameters are defined and valid for compound index
    if (chapterId === undefined || !voice || !textHash || pitch === undefined || rate === undefined) {
        console.warn("TTS Query aborted: missing keys", { chapterId, voice, textHash, pitch, rate });
    } else {
        // 1. Check Cache using explicit compound index for performance and stability
        try {
            const cache = await db.ttsCache
                .where('[chapterId+voice+textHash+pitch+rate]')
                .equals([chapterId, voice, textHash, pitch, rate])
                .first();

            if (cache) {
                console.log("TTS Cache Hit!", chapterId, textHash, pitch, rate);
                const blob = new Blob([new Uint8Array(cache.blob)], { type: 'audio/mpeg' });
                return URL.createObjectURL(blob);
            }
        } catch (err) {
            console.error("TTS Cache Query Error:", err);
            // Fallback: search without compound index if it fails
            const fallback = await db.ttsCache.where({ chapterId, textHash, voice }).first();
            if (fallback) {
                const blob = new Blob([new Uint8Array(fallback.blob)], { type: 'audio/mpeg' });
                return URL.createObjectURL(blob);
            }
        }
    }

    // 2. Fetch from Backend
    console.log("TTS Fetching...", chapterId, textHash, pitch, rate);
    const audioData = await invoke<number[]>("edge_tts_speak", { text, voice, pitch, rate });
    const uint8Array = new Uint8Array(audioData);

    // 3. Save to Cache (Async)
    db.ttsCache.add({
        chapterId,
        voice,
        textHash,
        pitch,
        rate,
        blob: uint8Array.buffer,
        createdAt: new Date()
    }).catch(e => console.error("Failed to cache TTS:", e));

    const blob = new Blob([uint8Array], { type: 'audio/mpeg' });
    return URL.createObjectURL(blob);
}

export async function prefetchTTS(chapterId: number, text: string, voice: string, pitch: string = "+0Hz", rate: string = "+0%") {
    const textHash = getTextHash(text);

    if (chapterId === undefined || !voice || !textHash || pitch === undefined || rate === undefined) return;

    try {
        const count = await db.ttsCache
            .where('[chapterId+voice+textHash+pitch+rate]')
            .equals([chapterId, voice, textHash, pitch, rate])
            .count();
        if (count > 0) return; // Already cached
    } catch (e) {
        // Fallback or ignore
    }

    // Generate in background
    speak(chapterId, text, voice, pitch, rate).then(url => {
        console.log(`Prefetched TTS for chapter ${chapterId} segment ${textHash} (${pitch}, ${rate})`);
        URL.revokeObjectURL(url);
    }).catch(e => console.error("Prefetch failed:", e));
}
