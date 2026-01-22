"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { speak, prefetchTTS } from "@/lib/tts";
import { ReaderConfig } from "../ReaderHeader";
import { splitIntoParagraphs } from "../utils/readerFormatting";

export function useReaderTTS(chapterId: number, content: string, readerConfig: ReaderConfig) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const segments = useMemo(() => {
        const text = (content || "").normalize('NFC');
        return splitIntoParagraphs(text);
    }, [content]);

    // Prefetch effect
    useEffect(() => {
        if (chapterId && segments.length > 0) {
            const pitchStr = `${readerConfig.ttsPitch >= 0 ? '+' : ''}${readerConfig.ttsPitch}Hz`;
            const rateStr = `${readerConfig.ttsRate >= 0 ? '+' : ''}${readerConfig.ttsRate}%`;

            segments.slice(0, 3).forEach(seg => {
                prefetchTTS(chapterId, seg, readerConfig.ttsVoice, pitchStr, rateStr);
            });
        }
    }, [chapterId, segments, readerConfig.ttsVoice, readerConfig.ttsPitch, readerConfig.ttsRate]);

    // Scroll effect
    useEffect(() => {
        if (activeIndex !== null) {
            const element = document.getElementById(`tts-para-${activeIndex}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [activeIndex]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const stop = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setIsPlaying(false);
        setActiveIndex(null);
    };

    const playSegment = async (index: number) => {
        if (index >= segments.length) {
            stop();
            return;
        }

        try {
            setIsLoading(true);
            const text = segments[index];
            const pitchStr = `${readerConfig.ttsPitch >= 0 ? '+' : ''}${readerConfig.ttsPitch}Hz`;
            const rateStr = `${readerConfig.ttsRate >= 0 ? '+' : ''}${readerConfig.ttsRate}%`;

            const audioUrl = await speak(chapterId, text, readerConfig.ttsVoice, pitchStr, rateStr);
            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onended = () => {
                const nextIndex = index + 1;
                setActiveIndex(nextIndex);
                playSegment(nextIndex);
            };

            audio.onerror = (e) => {
                console.error("Audio Error:", e);
                setIsPlaying(false);
                toast.error("Lỗi khi phát âm thanh!");
            };

            await audio.play();
            setIsPlaying(true);
            setIsLoading(false);

        } catch (error) {
            console.error("TTS Error:", error);
            toast.error("Lỗi tạo giọng đọc");
            setIsLoading(false);
            setIsPlaying(false);
        }
    };

    const togglePlay = () => {
        if (isPlaying && audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
            return;
        }

        if (activeIndex === null) {
            setActiveIndex(0);
            playSegment(0);
        } else {
            if (audioRef.current) {
                audioRef.current.play();
                setIsPlaying(true);
            } else {
                playSegment(activeIndex);
            }
        }
    };

    return {
        isTTSPlaying: isPlaying,
        isTTSLoading: isLoading,
        activeTTSIndex: activeIndex,
        toggleTTS: togglePlay,
        stopTTS: stop
    };
}
