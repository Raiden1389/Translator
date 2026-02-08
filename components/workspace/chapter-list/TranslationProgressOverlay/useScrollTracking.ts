import { useRef, useEffect, useCallback } from "react";
import { SCROLL_THRESHOLD_PX } from "./constants";

export function useScrollTracking(logsLength: number, currentTitle: string) {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const handleScroll = useCallback(() => {
    if (!logContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD_PX;
    isAtBottomRef.current = isNearBottom;
  }, []);

  useEffect(() => {
    if (isAtBottomRef.current && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logsLength, currentTitle]);

  return { logContainerRef, handleScroll };
}
