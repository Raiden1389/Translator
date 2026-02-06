import { useState, useEffect, useRef } from "react";
import { REFRESH_INTERVAL_MS } from "./constants";

/**
 * Hook to manage elapsed time during translation
 * Resets only when starting new translation, keeps time when finished
 */
export function useProgressTimer(isTranslating: boolean) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const prevTranslatingRef = useRef(isTranslating);

  useEffect(() => {
    // Reset timer only when starting NEW translation (false → true transition)
    if (isTranslating && !prevTranslatingRef.current) {
      requestAnimationFrame(() => setElapsedSeconds(0));
    }
    prevTranslatingRef.current = isTranslating;

    if (!isTranslating) {
      // Keep elapsed time - don't reset
      return;
    }

    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isTranslating]);

  return { elapsedSeconds };
}
