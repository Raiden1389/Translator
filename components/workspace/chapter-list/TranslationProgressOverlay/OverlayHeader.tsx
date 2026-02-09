import React from "react";
import { RefreshCw } from "lucide-react";
import { formatTime } from "./utils";

interface OverlayHeaderProps {
  isTranslating: boolean;
  elapsedSeconds: number;
  eta: string;
  chunksProcessed: number;
  displayPercent: number;
  batchMode?: boolean; // NEW: Batch translation mode
  batchSize?: number; // NEW: Chapters per batch
}

export function OverlayHeader({
  isTranslating,
  elapsedSeconds,
  eta,
  chunksProcessed,
  displayPercent,
  batchMode = false,
  batchSize = 3
}: OverlayHeaderProps) {
  return (
    <div className="flex items-center justify-between relative pr-20">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
          {isTranslating ? (
            <RefreshCw className="h-5 w-5 animate-spin" />
          ) : (
            <div className="h-5 w-5 flex items-center justify-center font-bold text-emerald-500">✓</div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground leading-none">Max Ping Processing</h3>
            {batchMode && (
              <span className="text-[10px] bg-green-500/20 text-green-600 px-2 py-0.5 rounded-full font-bold border border-green-500/30 flex items-center gap-1">
                ⚡ BATCH MODE ({batchSize} chương/lần)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-primary font-mono text-[11px] font-bold">{formatTime(elapsedSeconds)}</span>
            <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/30" />
            <span className="text-muted-foreground/60 text-[10px] font-medium tracking-tight whitespace-nowrap">
              {eta}
            </span>
            {chunksProcessed > 0 && (
              <span className="text-[9px] bg-blue-500/20 px-1.5 py-0.5 rounded font-bold">📦 {chunksProcessed}</span>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-2xl font-black text-foreground font-mono tabular-nums leading-none">
          {Math.floor(displayPercent)}%
        </div>
      </div>
    </div>
  );
}
