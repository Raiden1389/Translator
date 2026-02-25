// COPIED imports from ChapterList.tsx
import { useState } from "react";
import { toast } from "sonner";
import { db, type Chapter } from "@/lib/db";
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

    // Mark all scanned chapters with glossaryExtractedAt so the icon shows
    const scannedIds = selectedChapterData.map(c => c.id!).filter(Boolean);
    if (scannedIds.length > 0) {
      await db.chapters.where('id').anyOf(scannedIds).modify({ glossaryExtractedAt: new Date() });
    }
  };

  return {
    scanConfigOpen,
    setScanConfigOpen,
    handleScan,
    handleStartScan
  };
}

