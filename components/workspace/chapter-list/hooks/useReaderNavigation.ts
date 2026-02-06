// COPIED imports from ChapterList.tsx
import { useState, useMemo } from "react";
import { db, type Chapter } from "@/lib/db";

interface UseReaderNavigationProps {
  workspaceId: string;
  filtered: Chapter[];
}

export function useReaderNavigation({ workspaceId, filtered }: UseReaderNavigationProps) {
  const [readingChapterId, setReadingChapterId] = useState<number | null>(null);

  const currentIndex = useMemo(() => {
    if (!readingChapterId) return -1;
    return filtered.findIndex(c => c.id === readingChapterId);
  }, [readingChapterId, filtered]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < filtered.length - 1;

  const handleRead = (id: number) => {
    setReadingChapterId(id);
    db.workspaces.update(workspaceId, { lastReadChapterId: id });
  };

  const handlePrev = () => {
    if (hasPrev) {
      const newId = filtered[currentIndex - 1].id!;
      setReadingChapterId(newId);
      db.workspaces.update(workspaceId, { lastReadChapterId: newId });
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const newId = filtered[currentIndex + 1].id!;
      setReadingChapterId(newId);
      db.workspaces.update(workspaceId, { lastReadChapterId: newId });
    }
  };

  const handleClose = () => {
    setReadingChapterId(null);
  };

  return {
    readingChapterId,
    handleRead,
    handlePrev,
    handleNext,
    handleClose,
    hasPrev,
    hasNext
  };
}
