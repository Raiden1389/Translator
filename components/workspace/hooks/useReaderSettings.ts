"use client";

import { useState, useEffect, useRef } from "react";
import { ReaderConfig } from "../ReaderHeader";
import { VIETNAMESE_VOICES } from "@/lib/tts";

const DEFAULT_CONFIG: ReaderConfig = {
    fontFamily: "'Bookerly', serif",
    fontSize: 18,
    lineHeight: 1.8,
    textAlign: "justify",
    textColor: "#262626",
    backgroundColor: "#ffffff",
    maxWidth: 800,
    ttsPitch: 0,
    ttsRate: 0,
    ttsVoice: VIETNAMESE_VOICES[0].value,
};

export function useReaderSettings() {
    const [config, setConfig] = useState<ReaderConfig>(DEFAULT_CONFIG);
    const isFirstRender = useRef(true);

    // 1. Chỉ lấy data từ localStorage sau khi component đã mount (tránh lỗi Hydration)
    useEffect(() => {
        const saved = localStorage.getItem("readerConfig");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Giữ lại logic fix màu của mày
                if (parsed.textColor && (parsed.textColor === "hsl(var(--foreground))" || parsed.textColor.startsWith("#f") || parsed.textColor.startsWith("#e"))) {
                    parsed.textColor = "#262626";
                }
                setTimeout(() => {
                    setConfig(prev => {
                        const next = { ...prev, ...parsed };
                        if (JSON.stringify(prev) === JSON.stringify(next)) {
                            return prev;
                        }
                        return next;
                    });
                }, 0);
            } catch (e) {
                console.error("Failed to parse reader settings", e);
            }
        }
    }, []);

    // 2. Chỉ lưu vào localStorage từ lần render thứ 2 trở đi (khi config thực sự thay đổi)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        localStorage.setItem("readerConfig", JSON.stringify(config));
    }, [config]);

    return { readerConfig: config, setReaderConfig: setConfig };
}
