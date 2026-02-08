import React from "react";

interface ProgressBarProps {
  displayPercent: number;
}

export function ProgressBar({ displayPercent }: ProgressBarProps) {
  return (
    <div className="relative h-2 bg-muted/50 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-primary transition-all duration-700 ease-in-out relative"
        style={{ width: `${displayPercent}%` }}
      >
        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/40 to-transparent animate-shimmer-fast w-full" />
      </div>
    </div>
  );
}
