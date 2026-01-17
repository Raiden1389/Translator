import { useState, useEffect } from "react";

export interface ReaderConfig {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    textAlign: string;
    textColor: string;
    ttsPitch: number;
    ttsRate: number;
    ttsVoice: string;
}

const DEFAULT_CONFIG: ReaderConfig = {
    fontFamily: "'Bookerly', serif",
    fontSize: 18,
    lineHeight: 1.8,
    textAlign: "justify",
    textColor: "#e2e8f0",
    ttsPitch: 0,
    ttsRate: 0,
    ttsVoice: "vi-VN-HoaiMyNeural", // Default Vietnamese voice
};

/**
 * Custom hook for managing reader configuration
 * Handles loading/saving settings from/to localStorage
 */
export function useReaderConfig() {
    const [readerConfig, setReaderConfig] = useState<ReaderConfig>(DEFAULT_CONFIG);
    const [configLoaded, setConfigLoaded] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Load settings from localStorage on mount
    useEffect(() => {
        const savedConfig = localStorage.getItem("readerConfig");
        if (savedConfig) {
            try {
                setReaderConfig(JSON.parse(savedConfig));
            } catch (e) {
                console.error("Failed to parse reader config", e);
            }
        }
        setConfigLoaded(true);
    }, []);

    // Save settings to localStorage whenever they change (but only after initial load)
    useEffect(() => {
        if (configLoaded) {
            localStorage.setItem("readerConfig", JSON.stringify(readerConfig));
        }
    }, [readerConfig, configLoaded]);

    /**
     * Update a specific config property
     */
    const updateConfig = <K extends keyof ReaderConfig>(key: K, value: ReaderConfig[K]) => {
        setReaderConfig(prev => ({ ...prev, [key]: value }));
    };

    return {
        readerConfig,
        setReaderConfig,
        updateConfig,
        showSettings,
        setShowSettings,
        configLoaded,
    };
}
