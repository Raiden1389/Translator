import React, { useState } from "react";
import type { ChapterStats } from "./types";

interface StatsPanelProps {
  showStats: boolean;
  totalCost: number;
  totalTokens: number;
  speed: number;
  totalTermsUsed: number;
  totalCharactersUsed: number;
  currentTermsUsed: number;
  currentCharactersUsed: number;
  chapterStats: ChapterStats[];
}

export function StatsPanel({
  showStats,
  totalCost,
  totalTokens,
  speed,
  totalTermsUsed,
  totalCharactersUsed,
  currentTermsUsed,
  currentCharactersUsed,
  chapterStats
}: StatsPanelProps) {
  const [showDictBreakdown, setShowDictBreakdown] = useState(false);

  if (!showStats) return null;

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

      {/* Dictionary Usage Section */}
      {(totalTermsUsed > 0 || totalCharactersUsed > 0) && (
        <>
          <div className="col-span-2 border-t border-border/40 pt-2 mt-1">
            <button
              onClick={() => setShowDictBreakdown(!showDictBreakdown)}
              className="w-full text-left hover:bg-muted/20 -mx-1 px-1 py-0.5 rounded transition-colors"
            >
              <div className="text-[9px] text-muted-foreground/80 uppercase tracking-wider mb-1.5 font-bold flex items-center justify-between">
                <span>📖 Dictionary Usage</span>
                <span className="text-[10px]">{showDictBreakdown ? '▼' : '▶'}</span>
              </div>
            </button>

            {(currentTermsUsed > 0 || currentCharactersUsed > 0) && (
              <div className="mb-2 p-2 bg-primary/5 rounded border border-primary/10">
                <div className="text-[8px] text-muted-foreground/60 mb-1">Current Chapter</div>
                <div className="flex gap-3 text-xs">
                  {currentTermsUsed > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="text-blue-500">📚</span>
                      <span className="font-bold tabular-nums">{currentTermsUsed}</span>
                      <span className="text-muted-foreground/60">terms</span>
                    </span>
                  )}
                  {currentCharactersUsed > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="text-purple-500">👤</span>
                      <span className="font-bold tabular-nums">{currentCharactersUsed}</span>
                      <span className="text-muted-foreground/60">chars</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 text-xs text-muted-foreground/80 mb-2">
              {totalTermsUsed > 0 && (
                <span className="flex items-center gap-1">
                  <span>📚</span>
                  <span className="font-bold tabular-nums">{totalTermsUsed}</span>
                  <span>total</span>
                </span>
              )}
              {totalCharactersUsed > 0 && (
                <span className="flex items-center gap-1">
                  <span>👤</span>
                  <span className="font-bold tabular-nums">{totalCharactersUsed}</span>
                  <span>total</span>
                </span>
              )}
            </div>

            {showDictBreakdown && chapterStats.length > 0 && (
              <div className="mt-2 space-y-1 max-h-[120px] overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 fade-in">
                {chapterStats.map((stat) => (
                  <div
                    key={stat.chapterId}
                    className="flex items-center justify-between p-1.5 bg-muted/10 rounded text-[10px] hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="bg-muted px-1 rounded text-muted-foreground shrink-0 tabular-nums font-mono">
                        CH {stat.order}
                      </span>
                      <span className="truncate text-foreground/70">{stat.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {stat.termsUsed > 0 && (
                        <span className="flex items-center gap-0.5 text-blue-500">
                          <span>📚</span>
                          <span className="font-bold tabular-nums">{stat.termsUsed}</span>
                        </span>
                      )}
                      {stat.charactersUsed > 0 && (
                        <span className="flex items-center gap-0.5 text-purple-500">
                          <span>👤</span>
                          <span className="font-bold tabular-nums">{stat.charactersUsed}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
