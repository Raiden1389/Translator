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
import { clearChapterTranslation, bulkClearChapterTranslations } from "@/lib/services/chapter.service";
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

    const {
        importing,
        progress: importProgress,
        importStatus,
        fileInputRef,
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
        setCurrentPage(1);
    }, [search, filterStatus]);

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
        let targets = selectedChapters;

        if (targets.length === 0) {
            const hasTranslated = (chapters || []).some(c => c.status === 'translated');
            if (!hasTranslated) return toast.info("Không có chương nào đã dịch để cải chính.");

            if (!confirm("Chưa chọn chương nào. Áp dụng cải chính cho TẤT CẢ chương đã dịch trong bộ?")) return;

            targets = (chapters || [])
                .filter(c => c.status === 'translated' || !!c.content_translated)
                .map(c => c.id!);
        }

        if (targets.length === 0) return;

        toast.loading(`Đang áp dụng cải chính...`, { id: "applying-corrections" });
        try {
            const { updatedCount } = await applyBulkCorrections(workspaceId, targets);
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

    const handleBulkClearTranslation = async () => {
        if (selectedChapters.length === 0) return;
        if (!confirm(`Xóa bản dịch của ${selectedChapters.length} chương đã chọn?`)) return;
        try {
            await bulkClearChapterTranslations(selectedChapters);
            toast.success(`Đã xóa bản dịch của ${selectedChapters.length} chương.`);
        } catch {
            toast.error("Lỗi khi xóa bản dịch hàng loạt.");
        }
    };

    const handleExport = async () => {
        const selectedIds = selectedChapters.length > 0 ? selectedChapters : filtered.map(c => c.id!);
        if (selectedIds.length === 0) return toast.error("Không có gì để xuất.");

        const workspace = await db.workspaces.get(workspaceId);
        const chapters = await db.chapters.bulkGet(selectedIds);

        const exportData = {
            book: {
                title: workspace?.title || "Tác phẩm mới",
                author: workspace?.author || "Chưa rõ",
                cover: workspace?.cover || "",
                description: workspace?.description || "",
                genre: workspace?.genre || "Khác",
                language: workspace?.sourceLang || "Chinese (中文)"
            },
            chapters: chapters.filter(Boolean) // Remove any undefined entries
        };

        const fileName = `raiden-export-${workspace?.title || 'unnamed'}-${new Date().getTime()}.json`;
        const content = JSON.stringify(exportData, null, 2);

        // 1. Try Tauri Native Save Dialog if available
        if (typeof window !== 'undefined' && (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
            try {
                const { save } = await import("@tauri-apps/plugin-dialog");
                const { writeTextFile } = await import("@tauri-apps/plugin-fs");

                const path = await save({
                    defaultPath: fileName,
                    filters: [{ name: 'JSON', extensions: ['json'] }]
                });

                if (path) {
                    await writeTextFile(path, content);
                    toast.success("Đã xuất file thành công!");
                    return;
                }
                return; // Canceled
            } catch (err) {
                console.error("Tauri Export Error:", err);
            }
        }

        // 2. Fallback to standard Browser download
        const blob = new Blob([content], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    };

    return {
        state: {
            search, filterStatus, currentPage, itemsPerPage, viewMode,
            readingChapterId, translateDialogOpen, inspectingChapter, isInspectOpen,
            historyOpen, filtered, currentChapters, totalPages,
            selectedChapters, importing, importProgress, importStatus,
            fileInputRef
        },
        actions: {
            setSearch, setFilterStatus, setCurrentPage, setItemsPerPage, setViewMode,
            setReadingChapterId, setTranslateDialogOpen, setIsInspectOpen, setHistoryOpen,
            setSelectedChapters, handleSelect, handleSelectRange, handleInspect,
            handleApplyCorrections, handleClearTranslationAction, handleBulkClearTranslation, handleExport,
            handleFileUpload, handleImportJSON,
            setIsReviewOpen, handleAIExtractChapter, handleConfirmSaveAI,
            isAIExtracting, pendingCharacters, pendingTerms, isReviewOpen
        }
    };
}
