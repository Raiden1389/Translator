import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";

export const VIETNAMESE_VOICES = [
    { name: "HoaiMy (Nữ)", value: "vi-VN-HoaiMyNeural" },
    { name: "NamMinh (Nam)", value: "vi-VN-NamMinhNeural" },
];

export async function speak(text: string, voice: string = "vi-VN-HoaiMyNeural"): Promise<string> {
    const filePath = await invoke<string>("edge_tts_speak", { text, voice });
    return convertFileSrc(filePath);
}
