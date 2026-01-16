"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Square, SkipForward, SkipBack, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { toast } from "sonner";

interface TTSPlayerProps {
    text: string;
    chapterTitle: string;
    workspaceTitle?: string;
    coverImage?: string;
    onNext?: () => void;
    onPrevious?: () => void;
    hasNext?: boolean;
    hasPrevious?: boolean;
    className?: string;
}

export function TTSPlayer({
    text,
    chapterTitle,
    workspaceTitle = "Truyện dịch",
    coverImage,
    onNext,
    onPrevious,
    hasNext = false,
    hasPrevious = false,
    className
}: TTSPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [selectedVoice, setSelectedVoice] = useState("vi-VN-HoaiMyNeural");
    const [showSettings, setShowSettings] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const handlePlay = async () => {
        if (isPaused && audioRef.current) {
            audioRef.current.play();
            setIsPaused(false);
            setIsPlaying(true);
            return;
        }

        setIsLoading(true);

        try {
            // Generate speech using Edge TTS
            const { generateSpeech } = await import("@/lib/edgeTTS");

            // Calculate rate based on speed (0.5x = -50%, 2x = +100%)
            const ratePercent = Math.round((speed - 1) * 100);
            const rate = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

            const audioBlob = await generateSpeech({
                text,
                voice: selectedVoice,
                rate
            });

            // Create audio element
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            audio.onended = () => {
                setIsPlaying(false);
                setIsPaused(false);
                URL.revokeObjectURL(audioUrl);

                // Auto-play next chapter if available
                if (hasNext && onNext) {
                    setTimeout(() => onNext(), 1000);
                }
            };

            audio.onerror = (e) => {
                console.error("Audio playback error:", e);
                setIsPlaying(false);
                setIsPaused(false);
                setIsLoading(false);
                URL.revokeObjectURL(audioUrl);
            };

            audioRef.current = audio;
            await audio.play();
            setIsPlaying(true);
            setIsPaused(false);
        } catch (error) {
            console.error("TTS Error:", error);
            toast.error("Lỗi khi tạo giọng đọc. Vui lòng thử lại!");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePause = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPaused(true);
            setIsPlaying(false);
        }
    };

    const handleStop = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
            setIsPaused(false);
        }
    };

    const handleSpeedChange = (value: number[]) => {
        const newSpeed = value[0];
        setSpeed(newSpeed);

        // If currently playing, need to regenerate with new speed
        if (isPlaying) {
            handleStop();
            // Auto-play will trigger with new speed
            setTimeout(() => handlePlay(), 100);
        }
    };

    return (
        <div className={cn("bg-gradient-to-br from-[#1e1e2e] to-[#2b2b40] border border-white/10 rounded-2xl p-6 space-y-6 shadow-2xl", className)}>
            {/* Cover Art & Info */}
            <div className="flex flex-col items-center space-y-4">
                {/* Album Art */}
                <div className="relative w-48 h-48 rounded-xl overflow-hidden shadow-2xl border-2 border-white/10">
                    {coverImage ? (
                        <Image
                            src={coverImage}
                            alt={chapterTitle}
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                            <span className="text-6xl font-bold text-white/20">📖</span>
                        </div>
                    )}

                    {/* Playing Animation Overlay */}
                    {isPlaying && (
                        <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center">
                            <div className="flex gap-1">
                                {[...Array(4)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="w-1 bg-white rounded-full animate-pulse"
                                        style={{
                                            height: '20px',
                                            animationDelay: `${i * 0.15}s`,
                                            animationDuration: '0.6s'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Track Info */}
                <div className="text-center space-y-1 max-w-md">
                    <h3 className="text-xl font-bold text-white truncate">
                        {chapterTitle}
                    </h3>
                    <p className="text-sm text-white/50">
                        {workspaceTitle}
                    </p>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="space-y-3 p-4 bg-black/20 rounded-xl border border-white/5 backdrop-blur-sm">
                    <div className="space-y-2">
                        <label className="text-xs text-white/50 uppercase font-bold">Giọng đọc</label>
                        <select
                            className="w-full bg-[#2b2b40] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            value={selectedVoice}
                            onChange={(e) => setSelectedVoice(e.target.value)}
                        >
                            <option value="vi-VN-HoaiMyNeural">Hoài My (Nữ) - Giọng quốc dân</option>
                            <option value="vi-VN-NamMinhNeural">Nam Minh (Nam)</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs text-white/50 uppercase font-bold">Tốc độ</label>
                            <span className="text-xs text-white/70 font-mono">{speed.toFixed(1)}x</span>
                        </div>
                        <Slider
                            value={[speed]}
                            onValueChange={handleSpeedChange}
                            min={0.5}
                            max={2}
                            step={0.1}
                            className="w-full"
                        />
                        <div className="flex justify-between text-[10px] text-white/30">
                            <span>0.5x</span>
                            <span>1.0x</span>
                            <span>2.0x</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="space-y-4">
                {/* Main Controls */}
                <div className="flex items-center justify-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12 rounded-full hover:bg-white/10 disabled:opacity-30"
                        onClick={onPrevious}
                        disabled={!hasPrevious}
                    >
                        <SkipBack className="h-6 w-6 text-white" />
                    </Button>

                    {!isPlaying && !isPaused && (
                        <Button
                            onClick={handlePlay}
                            disabled={isLoading}
                            className="h-16 w-16 rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="h-7 w-7 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Play className="h-7 w-7 ml-1" />
                            )}
                        </Button>
                    )}

                    {isPlaying && (
                        <Button
                            onClick={handlePause}
                            className="h-16 w-16 rounded-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg hover:scale-105 transition-transform"
                        >
                            <Pause className="h-7 w-7" />
                        </Button>
                    )}

                    {isPaused && (
                        <Button
                            onClick={handlePlay}
                            className="h-16 w-16 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:scale-105 transition-transform"
                        >
                            <Play className="h-7 w-7 ml-1" />
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12 rounded-full hover:bg-white/10 disabled:opacity-30"
                        onClick={onNext}
                        disabled={!hasNext}
                    >
                        <SkipForward className="h-6 w-6 text-white" />
                    </Button>
                </div>

                {/* Secondary Controls */}
                <div className="flex items-center justify-center gap-2">
                    {(isPlaying || isPaused) && (
                        <Button
                            onClick={handleStop}
                            variant="ghost"
                            size="sm"
                            className="text-white/70 hover:text-white hover:bg-white/10"
                        >
                            <Square className="h-4 w-4 mr-2" />
                            Dừng
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn("text-white/70 hover:text-white hover:bg-white/10", showSettings && "bg-white/10 text-white")}
                        onClick={() => setShowSettings(!showSettings)}
                    >
                        <Settings2 className="h-4 w-4 mr-2" />
                        Cài đặt
                    </Button>
                </div>
            </div>

            {/* Status Indicator */}
            {isPlaying && (
                <div className="text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
                        <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                        <span className="text-sm text-primary font-medium">Đang phát...</span>
                    </div>
                </div>
            )}
        </div>
    );
}
