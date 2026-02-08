import { useState, useEffect, useRef } from "react";
import {
  MAX_FAKE_PERCENT,
  PROGRESS_STEP_BUFFER,
  MIN_CREEP_STEP,
  CREEP_SLOWDOWN_FACTOR,
  REFRESH_INTERVAL_MS,
  MIN_SAMPLES_FOR_ETA,
  EMA_ALPHA
} from "./constants";

interface UseProgressCalculationProps {
  isTranslating: boolean;
  current: number;
  total: number;
  elapsedSeconds: number;
}

export function useProgressCalculation({
  isTranslating,
  current,
  total,
  elapsedSeconds
}: UseProgressCalculationProps) {
  const [displayPercent, setDisplayPercent] = useState(0);
  const [eta, setEta] = useState("Calculating...");

  // EMA memory for smooth ETA
  const avgTimeRef = useRef<number | null>(null);
  const lastProcessedRef = useRef(0);

  const basePercent = total > 0 ? Math.round((current / total) * 100) : 0;
  const nextStepLimit = total > 0 ? Math.round(((current + 1) / total) * 100) : 100;

  // Calculate speed (chapters/min)
  const speed = elapsedSeconds > 0 && current > 0
    ? (current / (elapsedSeconds / 60))
    : 0;

  // 1. Progress Synced & Reset Logic
  useEffect(() => {
    if (!isTranslating) {
      if (current >= total && total > 0) {
        requestAnimationFrame(() => setDisplayPercent(100));
      }
      return;
    }

    if (current === 0) {
      requestAnimationFrame(() => {
        setDisplayPercent(0);
        setEta("Calculating...");
        avgTimeRef.current = null;
        lastProcessedRef.current = 0;
      });
      return;
    }

    requestAnimationFrame(() => setDisplayPercent(prev => Math.max(prev, basePercent)));

    if (current > lastProcessedRef.current) {
      const timePerChapterAtThisPoint = elapsedSeconds / current;
      if (avgTimeRef.current === null) {
        avgTimeRef.current = timePerChapterAtThisPoint;
      } else {
        avgTimeRef.current = (EMA_ALPHA * timePerChapterAtThisPoint) + (1 - EMA_ALPHA) * avgTimeRef.current;
      }
      lastProcessedRef.current = current;
    }

    if (current >= MIN_SAMPLES_FOR_ETA && avgTimeRef.current) {
      const remainingChapters = total - current;
      const etaSeconds = Math.round(avgTimeRef.current * remainingChapters);

      if (etaSeconds <= 3) {
        requestAnimationFrame(() => setEta("Finishing..."));
      } else {
        const m = Math.floor(etaSeconds / 60);
        const s = etaSeconds % 60;
        requestAnimationFrame(() => setEta(`ETA: ${m > 0 ? `${m}m ` : ""}${s}s`));
      }
    }
  }, [basePercent, isTranslating, current, total, elapsedSeconds]);

  // 2. Clamped Progress Creep
  useEffect(() => {
    if (!isTranslating) return;

    const creepInterval = setInterval(() => {
      setDisplayPercent(prev => {
        const limit = Math.min(nextStepLimit - PROGRESS_STEP_BUFFER, MAX_FAKE_PERCENT);
        if (prev < limit) {
          const gap = limit - prev;
          const step = Math.max(MIN_CREEP_STEP, gap / CREEP_SLOWDOWN_FACTOR);
          return prev + step;
        }
        return prev;
      });
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(creepInterval);
  }, [isTranslating, nextStepLimit]);

  return { displayPercent, eta, speed };
}
