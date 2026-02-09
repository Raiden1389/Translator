"use client";

import React, { useState } from "react";
import type { TranslationProgressOverlayProps } from "./TranslationProgressOverlay/types";
import { OverlayHeader } from "./TranslationProgressOverlay/OverlayHeader";
import { NotificationBanner } from "./TranslationProgressOverlay/NotificationBanner";
import { ProgressBar } from "./TranslationProgressOverlay/ProgressBar";
import { StatsPanel } from "./TranslationProgressOverlay/StatsPanel";
import { ControlButtons } from "./TranslationProgressOverlay/ControlButtons";
import { LogsList } from "./TranslationProgressOverlay/LogsList";
import { useNotifications } from "./TranslationProgressOverlay/useNotifications";
import { useProgressCalculation } from "./TranslationProgressOverlay/useProgressCalculation";
import { useTimer } from "./TranslationProgressOverlay/useTimer";
import { useVisibility } from "./TranslationProgressOverlay/useVisibility";
import { useScrollTracking } from "./TranslationProgressOverlay/useScrollTracking";

export function TranslationProgressOverlay({ isTranslating, progress }: TranslationProgressOverlayProps) {
  const {
    current,
    total,
    currentTitle,
    logs = [],
    totalTokens = 0,
    totalCost = 0,
    chunksProcessed = 0,
    notifications = [],
    totalTermsUsed = 0,
    totalCharactersUsed = 0,
    currentTermsUsed = 0,
    currentCharactersUsed = 0,
    currentChunk = 0,
    totalChunks = 0,
    chapterStats = [],
    batchMode = false,
    batchSize = 3,
  } = progress;

  const [showStats, setShowStats] = useState(false);

  // Custom hooks
  const latestNotification = useNotifications(notifications);
  const elapsedSeconds = useTimer(isTranslating);
  const { displayPercent, eta, speed } = useProgressCalculation({
    isTranslating,
    current,
    total,
    elapsedSeconds
  });
  const { isVisible, isPinned, setIsPinned, handleClose } = useVisibility({
    isTranslating,
    total,
    totalTermsUsed,
    totalCharactersUsed
  });
  const { logContainerRef, handleScroll } = useScrollTracking(logs.length, currentTitle);

  if (!isVisible) return null;

  const isFinished = !isTranslating && current >= total && total > 0;

  return (
    <div className="fixed bottom-6 right-6 z-9999 animate-in slide-in-from-bottom-10 fade-in duration-500 pointer-events-auto group">
      <div className="bg-card border border-border p-6 rounded-3xl w-[420px] shadow-2xl space-y-6 relative overflow-hidden ring-1 ring-white/10 glass">
        <ControlButtons
          isPinned={isPinned}
          isFinished={isFinished}
          onPin={() => setIsPinned(!isPinned)}
          onClose={handleClose}
        />

        <OverlayHeader
          isTranslating={isTranslating}
          elapsedSeconds={elapsedSeconds}
          eta={eta}
          chunksProcessed={chunksProcessed}
          displayPercent={displayPercent}
          batchMode={batchMode}
          batchSize={batchSize}
        />

        <div className="space-y-3 relative">
          <NotificationBanner notification={latestNotification} />

          <div className="flex justify-between items-end px-1">
            <p className="text-foreground font-semibold text-[11px] truncate max-w-[70%] opacity-80">
              {currentTitle}
            </p>
            <div className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest tabular-nums">
              {totalChunks > 0 ? (
                <span title="Chunk progress">{currentChunk} / {totalChunks} chunks</span>
              ) : (
                <span>{current} / {total}</span>
              )}
            </div>
          </div>

          <ProgressBar displayPercent={displayPercent} />

          {/* Stats row */}
          <div className="flex justify-between text-[9px] text-muted-foreground/60 px-1 font-mono">
            <span>💰 ${totalCost.toFixed(4)}</span>
            <span>🔥 {totalTokens.toLocaleString()}t</span>
            <span>⚡ {speed.toFixed(1)} ch/min</span>
            <button
              onClick={() => setShowStats(!showStats)}
              className="text-[9px] text-muted-foreground hover:text-foreground transition-colors underline"
            >
              {showStats ? "Hide" : "Stats"}
            </button>
          </div>
        </div>

        <StatsPanel
          showStats={showStats}
          totalCost={totalCost}
          totalTokens={totalTokens}
          speed={speed}
          totalTermsUsed={totalTermsUsed}
          totalCharactersUsed={totalCharactersUsed}
          currentTermsUsed={currentTermsUsed}
          currentCharactersUsed={currentCharactersUsed}
          chapterStats={chapterStats}
        />

        <LogsList
          logs={logs}
          logContainerRef={logContainerRef}
          onScroll={handleScroll}
        />
      </div>
    </div>
  );
}
