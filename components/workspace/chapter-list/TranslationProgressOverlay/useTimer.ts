import { useState, useEffect, useRef } from "react";
import { REFRESH_INTERVAL_MS } from "./constants";

export function useTimer(isTranslating: boolean) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const prevTranslatingRef = useRef(isTranslating);

  useEffect(() => {
    if (isTranslating && !prevTranslatingRef.current) {
      requestAnimationFrame(() => setElapsedSeconds(0));
    }
    prevTranslatingRef.current = isTranslating;

    if (!isTranslating) return;

    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isTranslating]);

  return elapsedSeconds;
}
