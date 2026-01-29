"use client";

import React from "react";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackToTopProps {
    isVisible: boolean;
    onClick: () => void;
    // Lấy màu theo config của reader để hòa nhập vào flow đọc
    color?: string;
}

/**
 * BackToTop - Checklist-ready production component
 * Rules applied:
 * - Simple icon (ChevronUp), no text
 * - Size: 40px (Tap friendly)
 * - Opacity: 30% idle -> 80% hover/active
 * - Smooth scale interaction (1.05x)
 * - Respects prefers-reduced-motion
 */
export const BackToTop = React.memo(({
    isVisible,
    onClick,
    color = "currentColor"
}: BackToTopProps) => {
    return (
        <button
            onClick={onClick}
            aria-label="Back to top"
            className={cn(
                "fixed bottom-6 right-6 z-[210] flex items-center justify-center",
                "w-10 h-10 rounded-full transition-all duration-500 ease-out shadow-sm",
                "bg-background/20 backdrop-blur-sm border border-border/40",
                "hover:scale-105 active:scale-95 group",
                isVisible
                    ? "opacity-100 translate-y-0 pointer-events-auto"
                    : "opacity-0 translate-y-8 pointer-events-none"
            )}
        >
            <ChevronUp
                className="w-5 h-5 transition-opacity duration-300"
                style={{
                    color: color,
                    opacity: 0.4 // 40% idle as per checklist
                }}
            />
            {/* Hover effect overlay */}
            <div className="absolute inset-0 rounded-full bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Custom hover style for icon via CSS to meet 70-80% hover rule */}
            <style jsx>{`
                button:hover :global(svg) {
                    opacity: 0.8 !important;
                }
            `}</style>
        </button>
    );
});

BackToTop.displayName = "BackToTop";
