"use client";

import { useState, useMemo, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Chapter } from "@/lib/db";
import { toast } from "sonner";
import {
    parseRangeString,
    runChapterInspection,
    applyBulkCorrections
} from "@/lib/services/chapter-list.service";
import { clearChapterTranslation } from "@/lib/services/chapter.service";
import { usePersistedState } from "@/lib/hooks/usePersistedState";
import { useChapterSelection } from "./useChapterSelection";
import { useChapterImport } from "./useChapterImport";
import { useAIExtraction } from "@/components/workspace/editor/hooks/useAIExtraction";
import { InspectionIssue } from "@/lib/types";

export function useChapterList(workspaceId: string, chapters: Chapter[] | undefined) {
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = usePersistedState<"all" | "draft" | "translated">(`workspace-${workspaceId}-filter`, "all");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = usePersistedState(`workspace-${workspaceId}-perPage`, 50);
    const [viewMode, setViewMode] = usePersistedState<"grid" | "table">(`workspace-${workspaceId}-viewMode`, "grid");

    const [readingChapterId, setReadingChapterId] = useState<number | null>(null);
    const [translateDialogOpen, setTranslateDialogOpen] = useState(false);
    const [inspectingChapter, setInspectingChapter] = useState<{ id: number, title: string, issues: InspectionIssue[] } | null>(null);
    const [isInspectOpen, setIsInspectOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);

    // Filter logic
    const filtered = useMemo(() => {
        if (!chapters) return [];
        return chapters.filter(c => {
            const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = filterStatus === "all" || c.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [chapters, search, filterStatus]);

    // Sub-hooks integration
    const {
        selectedChapters,
        setSelectedChapters,
        toggleSingleSelection
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

    const {
        importing,
        progress: importProgress,
        importStatus,
        fileInputRef,
        importInputRef,
        handleFileUpload,
        handleImportJSON
    } = useChapterImport(workspaceId, chapters?.length || 0);

    // Pagination logic
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const currentChapters = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filtered.slice(start, start + itemsPerPage);
    }, [filtered, currentPage, itemsPerPage]);

    // Reset page to 1 when filters change
    useEffect(() => {
        if (currentPage !== 1) {
            const timer = setTimeout(() => setCurrentPage(1), 0);
            return () => clearTimeout(timer);
        }
    }, [search, filterStatus, currentPage]);

    // Actions
    const handleSelectRange = (rangeStr: string) => {
        const selectedOrders = parseRangeString(rangeStr);
        const newSelectedIds = filtered
            .filter(c => selectedOrders.has(c.order))
            .map(c => c.id!);

        if (newSelectedIds.length > 0) {
            setSelectedChapters(newSelectedIds);
            toast.success(`Đã chọn ${newSelectedIds.length} chương`);
        } else if (rangeStr.trim()) {
            toast.error(`Không tìm thấy chương nào trong khoảng "${rangeStr}"`);
        }
    };

    const handleInspect = async (id: number) => {
        toast.loading(`Đang rà soát chương...`, { id: "inspecting-toast" });
        try {
            const { issues, title } = await runChapterInspection(workspaceId, id);
            setInspectingChapter({ id, title, issues });
            setIsInspectOpen(true);
            toast.success("Rà soát hoàn tất!", { id: "inspecting-toast" });
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Lỗi khi rà soát AI.";
            toast.error(msg, { id: "inspecting-toast" });
        }
    };

    const handleApplyCorrections = async () => {
        if (selectedChapters.length === 0) return toast.error("Vui lòng chọn chương cần sửa.");
        toast.loading(`Đang áp dụng cải chính...`, { id: "applying-corrections" });
        try {
            const { updatedCount } = await applyBulkCorrections(workspaceId, selectedChapters);
            if (updatedCount > 0) {
                toast.success(`Đã cập nhật ${updatedCount} chương!`, {
                    id: "applying-corrections",
                    action: { label: "Lịch sử / Undo", onClick: () => setHistoryOpen(true) }
                });
            } else {
                toast.info("Không có thay đổi nào cần áp dụng.", { id: "applying-corrections" });
            }
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Lỗi khi áp dụng cải chính.";
            toast.error(msg, { id: "applying-corrections" });
        }
    };

    const handleClearTranslationAction = async (id: number) => {
        if (!confirm("Xóa bản dịch của chương này?")) return;
        try {
            await clearChapterTranslation(id);
            toast.success("Đã xóa bản dịch.");
        } catch {
            toast.error("Lỗi khi xóa bản dịch.");
        }
    };

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

    return {
        state: {
            search, filterStatus, currentPage, itemsPerPage, viewMode,
            readingChapterId, translateDialogOpen, inspectingChapter, isInspectOpen,
            historyOpen, filtered, currentChapters, totalPages,
            selectedChapters, importing, importProgress, importStatus,
            fileInputRef, importInputRef
        },
        actions: {
            setSearch, setFilterStatus, setCurrentPage, setItemsPerPage, setViewMode,
            setReadingChapterId, setTranslateDialogOpen, setIsInspectOpen, setHistoryOpen,
            setSelectedChapters, toggleSingleSelection, handleSelectRange, handleInspect,
            handleApplyCorrections, handleClearTranslationAction, handleExport,
            handleFileUpload, handleImportJSON,
            setIsReviewOpen, handleAIExtractChapter, handleConfirmSaveAI,
            isAIExtracting, pendingCharacters, pendingTerms, isReviewOpen
        }
    };
}
