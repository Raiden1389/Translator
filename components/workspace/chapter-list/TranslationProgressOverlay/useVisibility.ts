import { useState, useEffect, useRef, useCallback } from "react";

interface UseVisibilityProps {
  isTranslating: boolean;
  total: number;
  totalTermsUsed: number;
  totalCharactersUsed: number;
}

export function useVisibility({
  isTranslating,
  total,
  totalTermsUsed,
  totalCharactersUsed
}: UseVisibilityProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const lastTranslatingRef = useRef(false);

  const calculateReadTime = useCallback(() => {
    const baseTime = 10000;
    const perChapter = 1000;
    const hasStats = totalTermsUsed > 0 || totalCharactersUsed > 0;
    const statsBonus = hasStats ? 5000 : 0;
    const calculated = baseTime + (total * perChapter) + statsBonus;
    return Math.min(calculated, 25000);
  }, [total, totalTermsUsed, totalCharactersUsed]);

  useEffect(() => {
    if (isTranslating) {
      setTimeout(() => setIsVisible(true), 0);
      lastTranslatingRef.current = true;
    } else if (lastTranslatingRef.current && !isPinned) {
      const readTime = calculateReadTime();
      const timer = setTimeout(() => {
        setIsVisible(false);
        lastTranslatingRef.current = false;
      }, readTime);
      return () => clearTimeout(timer);
    }
  }, [isTranslating, isPinned, calculateReadTime]);

  const handleClose = () => {
    setIsVisible(false);
    lastTranslatingRef.current = false;
  };

  return { isVisible, isPinned, setIsPinned, handleClose };
}
