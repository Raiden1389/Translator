// COPIED imports from ChapterList.tsx
import { useState } from "react";
import { db, type Chapter } from "@/lib/db";
import { clearChapterTranslation } from "@/lib/services/chapter.service";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { inspectChapter } from "@/lib/gemini";
import { sanitizeExistingTranslations } from "@/lib/utils/db-sanitizer";
import type { InspectionIssue } from "@/lib/types";

interface UseChapterActionsProps {
  workspaceId: string;
  selectedChapters: number[];
  filtered: Chapter[];
  setHistoryOpen: (open: boolean) => void;
}

export function useChapterActions({ workspaceId, selectedChapters, filtered, setHistoryOpen }: UseChapterActionsProps) {
  const [inspectingChapter, setInspectingChapter] = useState<{ id: number, title: string, issues: InspectionIssue[] } | null>(null);
  const [isInspectOpen, setIsInspectOpen] = useState(false);

  // COPIED from line 146-156
  const handleExport = async () => {
    const selectedIds = selectedChapters.length > 0 ? selectedChapters : filtered.map(c => c.id!);
    if (selectedIds.length === 0) return toast.error("Không có gì để xuất.");
    const data = await db.chapters.bulkGet(selectedIds);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workspace-export-${new Date().getTime()}.json`;
    a.click();
  };

  // COPIED from line 159-183
  const handleInspect = async (id: number) => {
    const chapter = await db.chapters.get(id);
    if (!chapter || !chapter.content_translated) {
      return toast.error("Chương này chưa dịch hoặc không tồn tại.");
    }

    toast.loading(`Đang rà soát chương: ${chapter.title}...`, {
      id: "inspecting-toast",
      icon: <Loader2 className="h-4 w-4 animate-spin text-primary" />
    });

    try {
      const issues = await inspectChapter(workspaceId, chapter.content_translated);
      await db.chapters.update(id, { inspectionResults: issues });

      setInspectingChapter({ id, title: chapter.title, issues });
      setIsInspectOpen(true);

      toast.success("Rà soát hoàn tất!", { id: "inspecting-toast" });
    } catch (error) {
      console.error("Inspect error:", error);
      toast.error("Lỗi khi rà soát AI.", { id: "inspecting-toast" });
    }
  };

  // COPIED from line 274-284
  const handleClearTranslation = async (id: number) => {
    if (!confirm("Xóa bản dịch của chương này để dịch lại? (Bản gốc Trung Quốc vẫn được giữ nguyên)")) return;

    try {
      await clearChapterTranslation(id);
      toast.success("Đã xóa bản dịch. Bạn có thể dịch lại chương này.");
    } catch (error) {
      console.error("Clear translation error:", error);
      toast.error("Lỗi khi xóa bản dịch.");
    }
  };

  // COPIED from line 286-300
  const handleBulkClearTranslation = async () => {
    if (selectedChapters.length === 0) return toast.error("Vui lòng chọn chương cần reset.");
    if (!confirm(`Xóa bản dịch của ${selectedChapters.length} chương đã chọn?`)) return;

    try {
      for (const id of selectedChapters) {
        await clearChapterTranslation(id);
      }
      toast.success(`Đã reset ${selectedChapters.length} chương!`);
    } catch (error) {
      console.error("Bulk clear error:", error);
      toast.error("Lỗi khi reset bản dịch.");
    }
  };

  // COPIED from line 302-313
  const handleBulkDelete = async () => {
    if (selectedChapters.length === 0) return;

    try {
      await db.chapters.bulkDelete(selectedChapters);
      toast.success(`Đã xóa ${selectedChapters.length} chương!`);
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error("Lỗi khi xóa chương.");
    }
  };

  // COPIED from line 315-336
  const handleSanitizeDatabase = async () => {
    toast.loading("🧹 Đang dọn dẹp HTML rác trong database...", { id: "sanitizing" });

    try {
      const cleanedCount = await sanitizeExistingTranslations(workspaceId);

      if (cleanedCount > 0) {
        toast.success(`✨ Đã làm sạch ${cleanedCount} chương!`, {
          id: "sanitizing",
          description: "HTML tags đã được loại bỏ khỏi bản dịch cũ"
        });
      } else {
        toast.info("✅ Database đã sạch sẽ!", {
          id: "sanitizing",
          description: "Không tìm thấy HTML rác nào"
        });
      }
    } catch (error) {
      console.error("Sanitize error:", error);
      toast.error("❌ Lỗi khi dọn dẹp database", { id: "sanitizing" });
    }
  };

  // NEW: Retranslate chapter (clear + translate)
  const handleRetranslate = async (id: number, translateFn?: (ids: number[]) => Promise<void>) => {
    const chapter = await db.chapters.get(id);
    if (!chapter) {
      return toast.error("Chương không tồn tại.");
    }

    if (!chapter.content_translated) {
      return toast.error("Chương này chưa dịch. Hãy dịch lần đầu trước.");
    }

    if (!translateFn) {
      return toast.error("Chức năng dịch chưa sẵn sàng.");
    }

    try {
      // Clear translation first
      await clearChapterTranslation(id);

      // Then trigger translation
      toast.success(`Đang dịch lại: ${chapter.title}...`);
      await translateFn([id]);
    } catch (error) {
      console.error("Retranslate error:", error);
      toast.error("Lỗi khi dịch lại chương.");
    }
  };

  return {
    handleExport,
    handleInspect,
    handleRetranslate,
    handleClearTranslation,
    handleBulkClearTranslation,
    handleBulkDelete,
    handleSanitizeDatabase,
    inspectingChapter,
    setInspectingChapter,
    isInspectOpen,
    setIsInspectOpen
  };
}
