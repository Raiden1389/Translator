import React from "react";

interface ProgressStatsProps {
  totalCost: number;
  totalTokens: number;
  speed: number;
}

/**
 * Expandable stats panel showing cost, tokens, and speed
 */
export function ProgressStats({ totalCost, totalTokens, speed }: ProgressStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 p-3 bg-muted/20 rounded-lg animate-in fade-in slide-in-from-top-2">
      <div className="space-y-1">
        <div className="text-[9px] text-muted-foreground">Total Cost</div>
        <div className="text-sm font-bold">${totalCost.toFixed(4)}</div>
      </div>
      <div className="space-y-1">
        <div className="text-[9px] text-muted-foreground">Tokens Used</div>
        <div className="text-sm font-bold">{totalTokens.toLocaleString()}</div>
      </div>
      <div className="space-y-1">
        <div className="text-[9px] text-muted-foreground">Avg Speed</div>
        <div className="text-sm font-bold">{speed.toFixed(1)} ch/min</div>
      </div>
    </div>
  );
}
