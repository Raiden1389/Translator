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

export function useReaderNavigation({
    chapterId,
    hasNext,
    onNext,
    stopTTS,
    isDisabled
}: UseReaderNavigationProps) {
    const scrollViewportRef = useRef<HTMLDivElement>(null);
    const lastChapterIdRef = useRef<number | null>(null);
    const lastScrollTopRef = useRef<number>(0);

    const [isReadyToNext, setIsReadyToNext] = useState(false);
    const [readyTimestamp, setReadyTimestamp] = useState(0);
    const [isAutoNavigating, setIsAutoNavigating] = useState(false);

    // UX States
    const [isHeaderVisible, setIsHeaderVisible] = useState(true);

    // 1. Persistence & Auto-scroll Offset
    useEffect(() => {
        if (chapterId !== lastChapterIdRef.current) {
            const savedPos = localStorage.getItem(`reader_pos_${chapterId}`);
            if (scrollViewportRef.current) {
                if (savedPos && Number(savedPos) > 100) {
                    scrollViewportRef.current.scrollTo(0, Math.max(0, Number(savedPos) - 150));
                } else {
                    scrollViewportRef.current.scrollTo(0, 0);
                }
            }
            stopTTS();

            setTimeout(() => {
                setIsAutoNavigating(false);
                setIsReadyToNext(false);
                setIsHeaderVisible(true);
            }, 0);

            lastChapterIdRef.current = chapterId;
        }
    }, [chapterId, stopTTS]);


    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const { scrollTop, scrollHeight, clientHeight } = target;

        // Auto-hide Header Logic
        const diff = scrollTop - lastScrollTopRef.current;
        if (Math.abs(diff) > 40) { // Increased Threshold
            if (diff > 0 && isHeaderVisible && scrollTop > 200) {
                setIsHeaderVisible(false);
            } else if (diff < -50 && !isHeaderVisible) { // Higher threshold for scrolling up
                setIsHeaderVisible(true);
            }
            lastScrollTopRef.current = scrollTop;
        }

        // Save Position
        if (scrollTop > 0) {
            localStorage.setItem(`reader_pos_${chapterId}`, scrollTop.toString());
        }

        if (isDisabled) {
            if (isReadyToNext) setIsReadyToNext(false);
            return;
        }

        const distanceToBottom = scrollHeight - scrollTop - clientHeight;

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
            if (isReadyToNext) setIsReadyToNext(false);
        }
    }, [chapterId, hasNext, isAutoNavigating, onNext, isReadyToNext, isDisabled, isHeaderVisible]);

    const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
        if (isDisabled) return;

        if (e.deltaY > 0 && isReadyToNext && !isAutoNavigating && hasNext && onNext) {
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
        isHeaderVisible,
        handleScroll,
        handleWheel,
        resetNavigationState
    };
}
