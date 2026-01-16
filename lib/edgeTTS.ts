/**
 * Edge TTS Client for Tauri
 * Generates Vietnamese speech using Microsoft Edge TTS (Hoài My voice)
 */

import { invoke } from "@tauri-apps/api/core";

export interface TTSOptions {
    text: string;
    voice?: string;
    rate?: string;
}

const DEFAULT_VOICE = "vi-VN-HoaiMyNeural";
const DEFAULT_RATE = "+0%";

/**
 * Check if running in Tauri environment
 */
function isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * Generate speech audio using Edge TTS via Tauri command
 * Returns audio blob that can be played in browser
 */
export async function generateSpeech(options: TTSOptions): Promise<Blob> {
    const { text, voice = DEFAULT_VOICE, rate = DEFAULT_RATE } = options;

    if (!isTauri()) {
        throw new Error("TTS chỉ hoạt động trong Tauri app. Vui lòng chạy 'npm run tauri dev'");
    }

    try {
        // Call Tauri command
        const audioData = await invoke<number[]>("generate_speech", {
            text,
            voice,
            rate
        });

        // Convert number array to Uint8Array
        const uint8Array = new Uint8Array(audioData);

        // Create blob from audio data
        return new Blob([uint8Array], { type: "audio/mpeg" });
    } catch (error) {
        console.error("Edge TTS generation failed:", error);
        throw error;
    }
}

/**
 * Available Vietnamese voices
 */
export const VIETNAMESE_VOICES = [
    { name: "vi-VN-HoaiMyNeural", label: "Hoài My (Nữ)", gender: "Female" },
    { name: "vi-VN-NamMinhNeural", label: "Nam Minh (Nam)", gender: "Male" }
] as const;
