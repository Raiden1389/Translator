"use client";

import { useEffect } from "react";

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
        const handleKeyDown = (e: KeyboardEvent) => {
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
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, onPrev, onNext, hasPrev, hasNext, scrollViewportRef]);
}
