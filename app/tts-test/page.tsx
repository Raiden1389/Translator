"use client";

import { useState } from "react";
import { speak, VIETNAMESE_VOICES } from "@/lib/tts";
import { toast } from "sonner";

export default function TestTTS() {
    const [text, setText] = useState("Xin chào, đây là test giọng đọc tiếng Việt.");
    const [voice, setVoice] = useState(VIETNAMESE_VOICES[0].value);
    const [loading, setLoading] = useState(false);

    const handleSpeak = async () => {
        try {
            setLoading(true);
            const url = await speak(0, text, voice);
            const audio = new Audio(url);
            await audio.play();
            toast.success("Đang phát audio!");
        } catch (error) {
            toast.error(`Lỗi: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black p-8">
            <div className="max-w-xl mx-auto bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                <h1 className="text-2xl font-bold text-white mb-4">Edge TTS Test</h1>

                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white mb-4"
                    rows={3}
                />

                <select
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                    className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white mb-4"
                >
                    {VIETNAMESE_VOICES.map((v) => (
                        <option key={v.value} value={v.value} className="bg-gray-900">
                            {v.name}
                        </option>
                    ))}
                </select>

                <button
                    onClick={handleSpeak}
                    disabled={loading || !text}
                    className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-bold py-3 rounded-lg disabled:opacity-50"
                >
                    {loading ? "Đang tạo..." : "🔊 Phát"}
                </button>
            </div>
        </div>
    );
}
