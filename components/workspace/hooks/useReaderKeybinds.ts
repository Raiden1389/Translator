"use client";

import { useEffect } from "react";
import { shortcutContext } from "@/lib/shortcuts/contextStack";

interface ReaderKeybindsProps {
    onClose: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    hasPrev?: boolean;
    hasNext?: boolean;
    scrollViewportRef: React.RefObject<HTMLDivElement | null>;
}

export function useReaderKeybinds({
    onClose, onNext, onPrev, hasPrev, hasNext, scrollViewportRef
}: ReaderKeybindsProps) {
    useEffect(() => {
        // Push 'reader' context when reader opens
        shortcutContext.push('reader');

        const handleKeyDown = (e: KeyboardEvent) => {
            // Only handle shortcuts if reader context is active
            if (shortcutContext.getCurrent() !== 'reader') {
                return;
            }

            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowLeft' && hasPrev) {
                onPrev?.();
            } else if (e.key === 'ArrowRight' && hasNext) {
                onNext?.();
            } else if (e.key === 'ArrowUp') {
                if (scrollViewportRef.current) {
                    scrollViewportRef.current.scrollBy({ top: -150, behavior: 'smooth' });
                }
            } else if (e.key === 'ArrowDown') {
                if (scrollViewportRef.current) {
                    scrollViewportRef.current.scrollBy({ top: 150, behavior: 'smooth' });
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            // Pop 'reader' context when reader closes
            shortcutContext.pop();
        };
    }, [onClose, onPrev, onNext, hasPrev, hasNext, scrollViewportRef]);
}

