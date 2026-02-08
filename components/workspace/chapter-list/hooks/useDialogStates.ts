// COPIED imports from ChapterList.tsx
import { useState } from "react";

export function useDialogStates() {
  const [translateDialogOpen, setTranslateDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  return {
    translateDialogOpen,
    setTranslateDialogOpen,
    historyOpen,
    setHistoryOpen
  };
}
