// COPIED imports from ChapterList.tsx
import { useState } from "react";
import { toast } from "sonner";
import type { Chapter } from "@/lib/db";
import type { EntityType } from "../../ScanConfigDialog";

interface UseScanConfigProps {
  selectedChapters: number[];
  chapters: Chapter[] | undefined;
  handleAIExtractChapter: (text: string, types: string[]) => Promise<void>;
}

export function useScanConfig({ selectedChapters, chapters, handleAIExtractChapter }: UseScanConfigProps) {
  const [scanConfigOpen, setScanConfigOpen] = useState(false);

  const handleScan = () => setScanConfigOpen(true);

  const handleStartScan = async (selectedTypes: EntityType[]) => {
    setScanConfigOpen(false);
    if (selectedChapters.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 chương để quét!");
      return;
    }
    const selectedChapterData = chapters?.filter(c => selectedChapters.includes(c.id!)) || [];
    const combinedText = selectedChapterData.map(c => c.content_original).join("\n\n");
    await handleAIExtractChapter(combinedText, selectedTypes as string[]);
  };

  return {
    scanConfigOpen,
    setScanConfigOpen,
    handleScan,
    handleStartScan
  };
}
