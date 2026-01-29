"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface FloatingProgressPillProps {
    progress: number;
    isVisible?: boolean;
    className?: string;
}

/**
 * FloatingProgressPill - High contrast progress indicator
 * Constraints:
 * - Pointer-events-none on wrapper to prevent blocking text selection
 * - Single source of truth (props)
 * - Premium Glassmorphism aesthetic
 */
export const FloatingProgressPill = React.memo(({
    progress,
    isVisible = true,
    className
}: FloatingProgressPillProps) => {
    if (!isVisible) return null;

    const roundedProgress = Math.round(progress);

    return (
        <div className={cn(
            "fixed bottom-10 right-10 z-[210] pointer-events-none select-none",
            "animate-in fade-in slide-in-from-right-8 duration-500",
            className
        )}>
            <div className={cn(
                "px-5 py-3 rounded-[24px] flex items-center gap-4 transition-all duration-300",
                "bg-background/90 backdrop-blur-xl border border-primary/20",
                "shadow-[0_20px_50px_rgba(0,0,0,0.2)] border-l-4 border-l-primary",
                roundedProgress > 0 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}>
                {/* Text Progress */}
                <div className="flex flex-col items-start leading-none gap-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                        Tiến độ
                    </span>
                    <span className="text-2xl font-black tabular-nums tracking-tighter text-primary">
                        {roundedProgress}<span className="text-xs ml-0.5 opacity-60">%</span>
                    </span>
                </div>

                {/* Vertical Visual Indicator */}
                <div className="w-1.5 h-12 bg-muted/30 rounded-full overflow-hidden flex flex-col justify-end">
                    <div
                        className="w-full bg-primary transition-all duration-500 ease-out shadow-[0_0_10px_rgba(var(--primary),0.8)]"
                        style={{ height: `${roundedProgress}%` }}
                    />
                </div>
            </div>
        </div>
    );
});

FloatingProgressPill.displayName = "FloatingProgressPill";
