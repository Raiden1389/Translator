"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";

interface UseReaderNavigationProps {
    chapterId: number;
    hasNext: boolean;
    onNext?: () => void;
    stopTTS: () => void;
    isDisabled?: boolean; // Block navigation when dialogs are open or cooldown is active
}

/**
 * Hook for managing chapter navigation, scrolling, and "double scroll to next" logic.
 */
export function useReaderNavigation({
    chapterId,
    hasNext,
    onNext,
    stopTTS,
    isDisabled
}: UseReaderNavigationProps) {
    const scrollViewportRef = useRef<HTMLDivElement>(null);
    const lastChapterIdRef = useRef<number | null>(null);

    const [isReadyToNext, setIsReadyToNext] = useState(false);
    const [readyTimestamp, setReadyTimestamp] = useState(0);
    const [isAutoNavigating, setIsAutoNavigating] = useState(false);

    // Reset Scroll on Chapter Change - PROTECT SCROLL POSITION
    useEffect(() => {
        // Only scroll to top when chapter ID REALLY changes
        if (chapterId !== lastChapterIdRef.current) {
            if (scrollViewportRef.current) {
                scrollViewportRef.current.scrollTo(0, 0);
            }
            stopTTS();

            // Fixed: Avoid calling setState synchronously within effect body
            const timer = setTimeout(() => {
                setIsAutoNavigating(false);
                setIsReadyToNext(false);
            }, 0);

            lastChapterIdRef.current = chapterId;
            return () => clearTimeout(timer);
        }
    }, [chapterId, stopTTS]);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        if (isDisabled) {
            if (isReadyToNext) setIsReadyToNext(false);
            return;
        }

        const target = e.currentTarget;
        const { scrollTop, scrollHeight, clientHeight } = target;
        const distanceToBottom = scrollHeight - scrollTop - clientHeight;

        // "Double Scroll" Logic - Show Notification
        if (distanceToBottom < 10) {
            if (hasNext && !isAutoNavigating && onNext && !isReadyToNext) {
                setIsReadyToNext(true);
                setReadyTimestamp(Date.now());
                toast("Cuộn thêm lần nữa để chuyển chương", {
                    position: "bottom-center",
                    duration: 1500,
                    className: "bg-primary text-primary-foreground font-bold"
                });
            }
        } else if (distanceToBottom > 100) {
            // Reset if user scrolls up significantly
            if (isReadyToNext) setIsReadyToNext(false);
        }
    }, [hasNext, isAutoNavigating, onNext, isReadyToNext, isDisabled]);

    const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
        if (isDisabled) return;

        // "Double Scroll" Logic - Actual Navigation
        if (e.deltaY > 0 && isReadyToNext && !isAutoNavigating && hasNext && onNext) {
            // Prevent accidental trigger (need ~500ms gap)
            if (Date.now() - readyTimestamp < 500) return;

            const target = e.currentTarget;
            const { scrollTop, scrollHeight, clientHeight } = target;
            const distanceToBottom = scrollHeight - scrollTop - clientHeight;

            if (distanceToBottom < 20) {
                setIsAutoNavigating(true);
                onNext();
            }
        }
    }, [hasNext, isAutoNavigating, onNext, isReadyToNext, readyTimestamp, isDisabled]);

    const resetNavigationState = useCallback(() => {
        setIsReadyToNext(false);
        setIsAutoNavigating(false);
    }, []);

    return {
        scrollViewportRef,
        isReadyToNext,
        setIsReadyToNext,
        isAutoNavigating,
        handleScroll,
        handleWheel,
        resetNavigationState
    };
}
