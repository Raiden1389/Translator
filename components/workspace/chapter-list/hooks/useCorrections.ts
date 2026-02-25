// Chapter List — Corrections & Title Fix hook
// Thin UI adapter: delegates to corrections.service.ts
import { db } from "@/lib/db";
import { toast } from "sonner";
import { loadGlobalRules, applyCorrectionsText } from "@/lib/services/corrections.service";

interface UseCorrectionsProps {
  workspaceId: string;
  selectedChapters: number[];
  setHistoryOpen: (open: boolean) => void;
}

export function useCorrections({ workspaceId, selectedChapters, setHistoryOpen }: UseCorrectionsProps) {

  const handleApplyCorrections = async () => {
    if (selectedChapters.length === 0) return toast.error("Vui lòng chọn chương cần sửa.");

    const rules = await loadGlobalRules();
    if (rules.length === 0) return toast.error("Chưa có dữ liệu Cải chính (Corrections).");

    toast.loading(`Đang áp dụng ${rules.length} quy tắc cho ${selectedChapters.length} chương...`, { id: "applying-corrections" });

    try {
      const chaptersToFix = await db.chapters.where("id").anyOf(selectedChapters).toArray();
      let updatedCount = 0;

      // Snapshot for undo
      const snapshot = chaptersToFix.map(c => ({
        chapterId: c.id,
        before: { title: c.title_translated || "", content: c.content_translated || "" }
      }));

      await db.transaction('rw', db.chapters, db.history, async () => {
        let anyChange = false;

        for (const chapter of chaptersToFix) {
          if (!chapter.content_translated) continue;

          const newContent = applyCorrectionsText(chapter.content_translated, rules);
          const newTitle = chapter.title_translated
            ? applyCorrectionsText(chapter.title_translated, rules)
            : "";

          if (newContent !== chapter.content_translated || newTitle !== (chapter.title_translated || "")) {
            await db.chapters.update(chapter.id!, {
              content_translated: newContent,
              title_translated: newTitle || chapter.title_translated,
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
            snapshot
          });
        }
      });

      if (updatedCount > 0) {
        toast.success(`🔥 Luyện Văn: ${updatedCount} chương đã cập nhật`, {
          id: "applying-corrections",
          action: {
            label: "Undo",
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
