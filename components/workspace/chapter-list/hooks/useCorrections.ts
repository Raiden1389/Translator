// COPIED imports from ChapterList.tsx
import { db } from "@/lib/db";
import { toast } from "sonner";
import { applyCorrectionRule } from "@/lib/gemini/text/correction";

interface UseCorrectionsProps {
  workspaceId: string;
  selectedChapters: number[];
  setHistoryOpen: (open: boolean) => void;
}

export function useCorrections({ workspaceId, selectedChapters, setHistoryOpen }: UseCorrectionsProps) {
  // COPIED from line 185-272
  const handleApplyCorrections = async () => {
    if (selectedChapters.length === 0) return toast.error("Vui lòng chọn chương cần sửa.");

    const corrections = await db.corrections.where('workspaceId').equals(workspaceId).toArray();
    if (corrections.length === 0) return toast.error("Chưa có dữ liệu Cải chính (Corrections).");

    toast.loading(`Đang áp dụng cải chính cho ${selectedChapters.length} chương...`, { id: "applying-corrections" });

    try {
      const chaptersToFix = await db.chapters.where("id").anyOf(selectedChapters).toArray();
      let updatedCount = 0;

      const snapshotStr = JSON.stringify(chaptersToFix.map(c => ({
        chapterId: c.id,
        before: { title: c.title_translated || "", content: c.content_translated || "" }
      })));
      const snapshot = JSON.parse(snapshotStr);

      await db.transaction('rw', db.chapters, db.history, async () => {
        let anyChange = false;

        for (const chapter of chaptersToFix) {
          if (!chapter.content_translated) continue;

          let newContent = chapter.content_translated;
          let newTitle = chapter.title_translated || "";
          let hasChanges = false;

          for (const correction of corrections) {
            const originalContent = newContent;
            const originalTitle = newTitle;

            newContent = applyCorrectionRule(newContent, correction);
            if (newTitle) {
              newTitle = applyCorrectionRule(newTitle, correction);
            }

            if (newContent !== originalContent || newTitle !== originalTitle) {
              hasChanges = true;
            }
          }

          if (hasChanges) {
            await db.chapters.update(chapter.id!, {
              content_translated: newContent,
              title_translated: newTitle,
              updatedAt: new Date()
            });
            updatedCount++;
            anyChange = true;
          }
        }

        if (anyChange) {
          await db.history.where("workspaceId").equals(workspaceId).delete();
          await db.history.add({
            workspaceId,
            actionType: 'batch_correction',
            summary: `Áp dụng cải chính (${updatedCount} chương)`,
            timestamp: new Date(),
            affectedCount: updatedCount,
            snapshot: snapshot
          });
        }
      });

      if (updatedCount > 0) {
        toast.success(`Đã cập nhật ${updatedCount} chương!`, {
          id: "applying-corrections",
          action: {
            label: "Lịch sử / Undo",
            onClick: () => setHistoryOpen(true)
          }
        });
      } else {
        toast.info("Không có thay đổi nào cần áp dụng.", { id: "applying-corrections" });
      }

    } catch (error: unknown) {
      console.error("Apply corrections error:", error);
      toast.error("Lỗi khi áp dụng cải chính: " + (error instanceof Error ? error.message : String(error)), { id: "applying-corrections" });
    }
  };

  // COPIED from line 338-361
  const handleFixTitleCase = async () => {
    toast.loading("🔧 Đang sửa Title Case...", { id: "fixing-titles" });

    try {
      const { fixAllCapsTitles } = await import("@/lib/utils/title-case-fixer");
      const fixedCount = await fixAllCapsTitles(workspaceId);

      if (fixedCount > 0) {
        toast.success(`✨ Đã sửa ${fixedCount} tiêu đề!`, {
          id: "fixing-titles",
          description: "ALL CAPS → Title Case"
        });
      } else {
        toast.info("✅ Tất cả tiêu đề đã đúng format!", {
          id: "fixing-titles",
          description: "Không tìm thấy title nào cần sửa"
        });
      }
    } catch (error) {
      console.error("Fix title error:", error);
      toast.error("❌ Lỗi khi sửa tiêu đề", { id: "fixing-titles" });
    }
  };

  return {
    handleApplyCorrections,
    handleFixTitleCase
  };
}
