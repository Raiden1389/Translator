import { useState, useRef, useEffect, useMemo } from "react";
import { splitIntoParagraphs } from "../utils/readerFormatting";
import { prefetchTTS } from "@/lib/tts";

/**
 * Custom hook for managing TTS (Text-to-Speech) playback
 */
export function useReaderTTS(
    chapterId: number,
    contentTranslated: string | undefined,
    ttsVoice: string,
    ttsPitch: number,
    ttsRate: number
) {
    const [isTTSPlaying, setIsTTSPlaying] = useState(false);
    const [isTTSLoading, setIsTTSLoading] = useState(false);
    const [activeTTSIndex, setActiveTTSIndex] = useState<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const ttsSegments = useMemo(() => {
        const text = (contentTranslated || "").normalize('NFC');
        return splitIntoParagraphs(text);
    }, [contentTranslated]);

    // Warm up TTS cache for the first 3 segments
    useEffect(() => {
        if (chapterId && ttsSegments.length > 0) {
            const pitchStr = `${ttsPitch >= 0 ? '+' : ''}${ttsPitch}Hz`;
            const rateStr = `${ttsRate >= 0 ? '+' : ''}${ttsRate}%`;

            ttsSegments.slice(0, 3).forEach(seg => {
                prefetchTTS(chapterId, seg, ttsVoice, pitchStr, rateStr);
            });
        }
    }, [chapterId, ttsSegments, ttsVoice, ttsPitch, ttsRate]);

    // Auto-scroll to highlighted TTS paragraph
    useEffect(() => {
        if (activeTTSIndex !== null) {
            const element = document.getElementById(`tts-para-${activeTTSIndex}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [activeTTSIndex]);

    // Cleanup TTS on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const handleTTSStop = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setIsTTSPlaying(false);
        setActiveTTSIndex(null);
    };

    const handleTTSPlay = async (index: number) => {
        if (isTTSLoading) return;

        const segment = ttsSegments[index];
        if (!segment) return;

        setIsTTSLoading(true);
        setActiveTTSIndex(index);

        try {
            const pitchStr = `${ttsPitch >= 0 ? '+' : ''}${ttsPitch}Hz`;
            const rateStr = `${ttsRate >= 0 ? '+' : ''}${ttsRate}%`;

            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chapterId,
                    text: segment,
                    voice: ttsVoice,
                    pitch: pitchStr,
                    rate: rateStr
                })
            });

            if (!response.ok) throw new Error('TTS request failed');

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            if (audioRef.current) {
                audioRef.current.pause();
            }

            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onended = () => {
                if (index < ttsSegments.length - 1) {
                    handleTTSPlay(index + 1);
                } else {
                    handleTTSStop();
                }
            };

            audio.onerror = () => {
                console.error('Audio playback error');
                handleTTSStop();
            };

            await audio.play();
            setIsTTSPlaying(true);
        } catch (error) {
            console.error('TTS error:', error);
            handleTTSStop();
        } finally {
            setIsTTSLoading(false);
        }
    };

    const handleTTSToggle = () => {
        if (isTTSPlaying) {
            handleTTSStop();
        } else {
            handleTTSPlay(0);
        }
    };

    return {
        isTTSPlaying,
        isTTSLoading,
        activeTTSIndex,
        ttsSegments,
        handleTTSPlay,
        handleTTSStop,
        handleTTSToggle,
    };
}
