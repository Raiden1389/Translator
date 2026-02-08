"use client";

import { useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import Dexie from "dexie";
import { db } from "@/lib/db";
import { toast } from "sonner";
import {
    parseRangeString,
    runChapterInspection,
    applyBulkCorrections
} from "@/lib/services/chapter-list.service";
import { clearChapterTranslation, bulkClearChapterTranslations } from "@/lib/services/chapter.service";
import { exportToJSON } from "@/lib/services/backup.service";
import { useChapterSelection } from "./useChapterSelection";
import { useChapterImport } from "./useChapterImport";
import { useAIExtraction } from "@/components/workspace/editor/hooks/useAIExtraction";
import { fixAllTitles } from "@/lib/gemini/titleFixer";
import { useChapterListUI } from "./useChapterListUI";
import { useChapterListDialogs } from "./useChapterListDialogs";
import { ChapterListState, ChapterListActions } from "./useChapterList.types";
import { type Chapter } from "@/lib/db";

export function useChapterList(workspaceId: string): { state: ChapterListState; actions: ChapterListActions } {
    const router = useRouter();
    const searchParams = useSearchParams();

    // 1. DATA QUERIES
    const workspace = useLiveQuery(() => db.workspaces.get(workspaceId), [workspaceId]);
    const chapters = useLiveQuery(
        () => db.chapters.where("[workspaceId+order]").between([workspaceId, Dexie.minKey], [workspaceId, Dexie.maxKey]).toArray(),
        [workspaceId]
    );

    // 2. STATE HOOKS
    const ui = useChapterListUI(workspaceId);
    const dialogs = useChapterListDialogs();

    const {
        search, setSearch,
        filterStatus, setFilterStatus,
        currentPage, setCurrentPage,
        itemsPerPage, setItemsPerPage,
        viewMode, setViewMode
    } = ui;

    // 3. COMPUTED DATA
    const filtered = useMemo(() => {
        if (!chapters) return [];
        return (chapters as Chapter[]).filter(c => {
            const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = filterStatus === "all" || c.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [chapters, search, filterStatus]);

    // 4. FEATURE HOOKS
    const {
        selectedChapters,
        setSelectedChapters,
        handleSelect
    } = useChapterSelection(filtered.map(c => c.id!));

    const dictEntries = useLiveQuery(() => db.dictionary.where("workspaceId").equals(workspaceId).toArray(), [workspaceId]);

    const {
        isAIExtracting,
        pendingCharacters,
        pendingTerms,
        isReviewOpen,
        setIsReviewOpen,
        handleAIExtractChapter,
        handleConfirmSaveAI
    } = useAIExtraction(workspaceId, dictEntries || []);
    // 5. EFFECTS
    useEffect(() => {
        const openReader = searchParams.get("openReader");
        if (openReader === "true" && workspace?.lastReadChapterId) {
            dialogs.setReadingChapterId(workspace.lastReadChapterId);
            const params = new URLSearchParams(searchParams.toString());
            params.delete("openReader");
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    }, [searchParams, workspace?.lastReadChapterId, router, dialogs]); // Fixed: properly include dependencies

    useEffect(() => {
        setCurrentPage(1);
    }, [search, filterStatus, setCurrentPage]);

    // 6. PAGINATION
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const currentChapters = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filtered.slice(start, start + itemsPerPage);
    }, [filtered, currentPage, itemsPerPage]);

    // 7. ACTIONS
    const handleRead = async (id: number): Promise<void> => {
        dialogs.setReadingChapterId(id);
        await db.workspaces.update(workspaceId, { lastReadChapterId: id });
    };

    const handleSelectRange = (rangeStr: string) => {
        const selectedOrders = parseRangeString(rangeStr);
        const newSelectedIds = filtered
            .filter(c => selectedOrders.has(c.order))
            .map(c => c.id as number);

        if (newSelectedIds.length > 0) {
            setSelectedChapters(newSelectedIds);
            toast.success(`Đã chọn ${newSelectedIds.length} chương`);
        } else if (rangeStr.trim()) {
            toast.error(`Không tìm thấy chương nào trong khoảng "${rangeStr}"`);
        }
    };

    const handleFixTitles = async () => {
        if (dialogs.isFixingTitles) return;
        dialogs.setIsFixingTitles(true);
        const toastId = "fix-titles-toast";
        toast.loading("Đang quét và sửa tiêu đề Hán tự...", { id: toastId });

        try {
            const stats = await fixAllTitles(workspaceId, (current, total, title) => {
                toast.loading(`Sửa tiêu đề (${current}/${total}): ${title}`, { id: toastId });
            });
            if (stats.fixed > 0) toast.success(`Đã sửa xong ${stats.fixed} tiêu đề!`, { id: toastId, duration: 5000 });
            else toast.info("Không tìm thấy tiêu đề nào cần sửa.", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Lỗi hệ thống khi sửa tiêu đề.", { id: toastId });
        } finally {
            dialogs.setIsFixingTitles(false);
        }
    };

    const handleInspectAction = async (id: number): Promise<void> => {
        toast.loading(`Đang rà soát chương...`, { id: "inspecting-toast" });
        try {
            const { issues, title } = await runChapterInspection(workspaceId, id);
            dialogs.setInspectingChapter({ id, title, issues });
            dialogs.setIsInspectOpen(true);
            toast.success("Rà soát hoàn tất!", { id: "inspecting-toast" });
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Lỗi khi rà soát AI.";
            toast.error(msg, { id: "inspecting-toast" });
        }
    };

    const handleApplyCorrectionsAction = async (): Promise<void> => {
        let targets = selectedChapters;
        if (targets.length === 0) {
            const hasTranslated = (chapters || []).some(c => c.status === 'translated');
            if (!hasTranslated) {
                toast.info("Không có chương nào đã dịch để cải chính.");
                return;
            }
            if (!confirm("Áp dụng cải chính cho TẤT CẢ chương đã dịch?")) return;
            targets = (chapters || []).filter(c => c.status === 'translated' || !!c.content_translated).map(c => c.id!);
        }
        if (targets.length === 0) return;

        dialogs.setIsProcessing(true);
        toast.loading(`Đang áp dụng cải chính...`, { id: "applying-corrections" });
        try {
            const { updatedCount } = await applyBulkCorrections(workspaceId, targets);
            if (updatedCount > 0) {
                toast.success(`Đã cập nhật ${updatedCount} chương!`, {
                    id: "applying-corrections",
                    action: { label: "Lịch sử / Undo", onClick: () => dialogs.setHistoryOpen(true) }
                });
            } else toast.info("Không có thay đổi nào.", { id: "applying-corrections" });
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Lỗi khi áp dụng cải chính.";
            toast.error(msg, { id: "applying-corrections" });
        } finally {
            dialogs.setIsProcessing(false);
        }
    };

    const handleClearTranslationAction = async (id: number): Promise<void> => {
        if (!confirm("Xóa bản dịch của chương này?")) return;
        try {
            await clearChapterTranslation(id);
            toast.success("Đã xóa bản dịch.");
        } catch { toast.error("Lỗi khi xóa bản dịch."); }
    };

    const handleBulkClearTranslationAction = async (): Promise<void> => {
        if (selectedChapters.length === 0) return;
        if (!confirm(`Xóa bản dịch của ${selectedChapters.length} chương?`)) return;
        try {
            await bulkClearChapterTranslations(selectedChapters);
            toast.success(`Đã xóa bản dịch của ${selectedChapters.length} chương.`);
        } catch { toast.error("Lỗi khi xóa bản dịch hàng loạt."); }
    };

    const handleBulkDeleteAction = async (): Promise<void> => {
        if (selectedChapters.length === 0) return;
        await db.chapters.bulkDelete(selectedChapters);
        setSelectedChapters([]);
        dialogs.setBulkDeleteConfirmOpen(false);
        toast.success(`Đã xóa ${selectedChapters.length} chương.`);
    };

    const handleExportAction = async (): Promise<void> => {
        dialogs.setIsProcessing(true);
        try {
            await exportToJSON(workspaceId, selectedChapters);
            toast.success("Đã xuất file thành công!");
        } catch (err) {
            console.error(err);
            toast.error("Lỗi khi xuất file.");
        } finally {
            dialogs.setIsProcessing(false);
        }
    };

    const {
        importing,
        progress: importProgress,
        importStatus,
        fileInputRef,
        handleFileUpload,
        handleImportJSON
    } = useChapterImport(workspaceId, chapters?.length || 0);

    return {
        state: {
            workspace, chapters,
            search, filterStatus, currentPage, itemsPerPage, viewMode,
            ...dialogs,
            filtered, currentChapters, totalPages, selectedChapters,
            importing, importProgress, importStatus, fileInputRef,
            isAIExtracting, pendingCharacters, pendingTerms, isReviewOpen
        },
        actions: {
            setSearch, setFilterStatus, setCurrentPage, setItemsPerPage, setViewMode,
            setReadingChapterId: dialogs.setReadingChapterId,
            setTranslateDialogOpen: dialogs.setTranslateDialogOpen,
            setIsInspectOpen: dialogs.setIsInspectOpen,
            setHistoryOpen: dialogs.setHistoryOpen,
            setScanConfigOpen: dialogs.setScanConfigOpen,
            setTempScanText: dialogs.setTempScanText,
            setClearCacheConfirmOpen: dialogs.setClearCacheConfirmOpen,
            setBulkDeleteConfirmOpen: dialogs.setBulkDeleteConfirmOpen,
            setIsReviewOpen,

            setSelectedChapters, handleSelect, handleSelectRange, handleRead,
            handleInspect: handleInspectAction,
            handleApplyCorrections: handleApplyCorrectionsAction,
            handleClearTranslationAction,
            handleBulkClearTranslation: handleBulkClearTranslationAction,
            handleExport: handleExportAction,
            handleFileUpload, handleImportJSON,
            handleAIExtractChapter,
            handleConfirmSaveAI,

            handleFixTitles,
            handleBulkDelete: handleBulkDeleteAction
        }
    };
}
