"use client";

import { useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Dexie from "dexie";
import { db, Chapter } from "@/lib/db";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ChapterListHeader } from "./ChapterListHeader";
import { ChapterTable } from "./ChapterTable";
import { ChapterCardGrid } from "./ChapterCardGrid";
import { ReaderModal } from "./ReaderModal";
import { ImportProgressOverlay } from "./ImportProgressOverlay";
import { TranslateConfigDialog } from "./TranslateConfigDialog";
import { InspectionDialog } from "./InspectionDialog";
import { HistoryDialog } from "./HistoryDialog";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useChapterSelection } from "./hooks/useChapterSelection";
import { useChapterImport } from "./hooks/useChapterImport";
import { usePersistedState } from "@/lib/hooks/usePersistedState";
import { TermType } from "@/lib/services/name-hunter/types";
import { NameHunterDialog } from "../name-hunter/NameHunterDialog";

import { inspectChapter } from "@/lib/gemini";
import { applyCorrectionRule } from "@/lib/gemini/helpers";
import { TranslationSettings, InspectionIssue } from "@/lib/types"; // Consolidated InspectionIssue

interface BatchTranslateHandlerProps {
    workspaceId: string;
    chapters: Chapter[];
    selectedChapters: number[];
    currentSettings: TranslationSettings;
    translateConfig: {
        customPrompt: string;
        autoExtract: boolean;
        fixPunctuation?: boolean;
        maxConcurrency?: number;
        enableChunking: boolean;
        maxConcurrentChunks: number;
        chunkSize?: number;
    };
}

interface ChapterListProps {
    workspaceId: string;
    onTranslate: (props: BatchTranslateHandlerProps) => void;
}

export function ChapterList({ workspaceId, onTranslate }: ChapterListProps) {
    const workspace = useLiveQuery(() => db.workspaces.get(workspaceId), [workspaceId]);
    const chapters = useLiveQuery(
        () => db.chapters.where("[workspaceId+order]").between([workspaceId, Dexie.minKey], [workspaceId, Dexie.maxKey]).toArray(),
        [workspaceId]
    );

    const [search, setSearch] = useState("");
    const [readingChapterId, setReadingChapterId] = useState<number | null>(null);
    const [filterStatus, setFilterStatus] = usePersistedState<"all" | "draft" | "translated">(`workspace-${workspaceId}-filter`, "all");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = usePersistedState(`workspace-${workspaceId}-perPage`, 50);
    const [viewMode, setViewMode] = usePersistedState<"grid" | "table">(`workspace-${workspaceId}-viewMode`, "grid");
    const [translateDialogOpen, setTranslateDialogOpen] = useState(false);
    // Removed local reviewData state
    const [inspectingChapter, setInspectingChapter] = useState<{ id: number, title: string, issues: InspectionIssue[] } | null>(null);
    const [isInspectOpen, setIsInspectOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [nameHunterOpen, setNameHunterOpen] = useState(false);

    // Filtered Content
    const filtered = useMemo(() => {
        if (!chapters) return [];
        return chapters.filter(c => {
            const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = filterStatus === "all" || c.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [chapters, search, filterStatus]);

    // Hooks
    const {
        selectedChapters,
        setSelectedChapters,
        toggleSingleSelection
    } = useChapterSelection(filtered.map(c => c.id!));

    const {
        importing,
        progress: importProgress,
        importStatus,
        fileInputRef,
        importInputRef,
        handleFileUpload,
        handleImportJSON
    } = useChapterImport(workspaceId, chapters?.length || 0);

    // Removed local useBatchTranslate

    // Pagination
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const currentChapters = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filtered.slice(start, start + itemsPerPage);
    }, [filtered, currentPage, itemsPerPage]);

    useEffect(() => { setCurrentPage(1); }, [search, filterStatus]);

    // Handlers
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

    const handleSelectRange = (rangeStr: string) => {
        if (!rangeStr.trim()) return;

        const parts = rangeStr.split(',').map(p => p.trim());
        const selectedOrders = new Set<number>();

        parts.forEach(part => {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(num => parseInt(num.trim()));
                if (!isNaN(start) && !isNaN(end)) {
                    const min = Math.min(start, end);
                    const max = Math.max(start, end);
                    for (let i = min; i <= max; i++) {
                        selectedOrders.add(i);
                    }
                }
            } else {
                const num = parseInt(part);
                if (!isNaN(num)) {
                    selectedOrders.add(num);
                }
            }
        });

        const newSelectedIds = filtered
            .filter(c => selectedOrders.has(c.order))
            .map(c => c.id!);

        if (newSelectedIds.length > 0) {
            setSelectedChapters(newSelectedIds);
            toast.success(`Đã chọn ${newSelectedIds.length} chương`);
        } else {
            toast.error(`Không tìm thấy chương nào trong khoảng "${rangeStr}"`);
        }
    };


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
            // Save results to DB
            await db.chapters.update(id, { inspectionResults: issues });

            setInspectingChapter({ id, title: chapter.title, issues });
            setIsInspectOpen(true);

            toast.success("Rà soát hoàn tất!", { id: "inspecting-toast" });
        } catch (error) {
            console.error("Inspect error:", error);
            toast.error("Lỗi khi rà soát AI.", { id: "inspecting-toast" });
        }
    };

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
            const snapshot = JSON.parse(snapshotStr); // Deep copy just in case

            await db.transaction('rw', db.chapters, db.history, async () => {
                let anyChange = false;

                for (const correction of corrections) {
                    for (const chapter of chaptersToFix) {
                        if (!chapter.content_translated) continue;

                        let newContent = chapter.content_translated;
                        let newTitle = chapter.title_translated || "";
                        let hasChanges = false;

                        // Apply all corrections (Batch)
                        const originalContent = newContent;
                        const originalTitle = newTitle;

                        newContent = applyCorrectionRule(newContent, correction);
                        if (newTitle) {
                            newTitle = applyCorrectionRule(newTitle, correction);
                        }

                        if (newContent !== originalContent || newTitle !== originalTitle) {
                            hasChanges = true;
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
                }

                if (anyChange) {
                    // ROTATION STRATEGY: Delete ALL previous history for this workspace before adding new one.
                    // This ensures we only keep the LATEST snapshot (Single Undo).
                    await db.history.where("workspaceId").equals(workspaceId).delete();

                    // Save New History
                    await db.history.add({
                        workspaceId,
                        actionType: 'batch_correction',
                        summary: `Áp dụng cải chính (${updatedCount} chương)`,
                        timestamp: new Date(),
                        affectedCount: updatedCount,
                        snapshot: snapshot // Store PREVIOUS state
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
            console.error("AI Refining error:", error);
            toast.error("Lỗi khi áp dụng cải chính: " + (error as Error).message, { id: "applying-corrections" });
        }
    };

    const handleClearTranslation = async (id: number) => {
        if (!confirm("Xóa bản dịch của chương này để dịch lại? (Bản gốc Trung Quốc vẫn được giữ nguyên)")) return;

        try {
            // Assuming clearChapterTranslation is defined elsewhere or imported
            // For now, directly update the chapter
            await db.chapters.update(id, {
                content_translated: undefined,
                title_translated: undefined,
                status: 'draft',
                lastTranslatedAt: undefined,
                inspectionResults: undefined,
                updatedAt: new Date()
            });
            toast.success("Đã xóa bản dịch. Bạn có thể dịch lại chương này.");
        } catch (error) {
            console.error("Clear translation error:", error);
            toast.error("Lỗi khi xóa bản dịch.");
        }
    };

    if (!chapters) return <div className="p-10 text-center text-white/50 animate-pulse">Loading workspace...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative pb-10">
            {/* TranslationProgressOverlay for imports */}
            <ImportProgressOverlay importing={importing} progress={importProgress} importStatus={importStatus} />

            <TranslateConfigDialog
                open={translateDialogOpen}
                onOpenChange={setTranslateDialogOpen}
                selectedCount={selectedChapters.length}
                onStart={(config, settings) => {
                    setTranslateDialogOpen(false);
                    onTranslate({
                        workspaceId,
                        chapters: filtered,
                        selectedChapters,
                        currentSettings: settings,
                        translateConfig: {
                            ...config,
                            fixPunctuation: config.fixPunctuation,
                            enableChunking: config.enableChunking,
                            maxConcurrentChunks: config.maxConcurrentChunks || 3,
                            chunkSize: config.chunkSize || 800
                        }
                    });
                }}
            />

            <ChapterListHeader
                totalChapters={chapters.length}
                searchTerm={search}
                setSearchTerm={setSearch}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
                selectedChapters={selectedChapters}
                setSelectedChapters={setSelectedChapters}
                onExport={handleExport}
                onImport={() => importInputRef.current?.click()}
                onTranslate={() => setTranslateDialogOpen(true)}
                importInputRef={importInputRef}
                fileInputRef={fileInputRef}
                onFileUpload={handleFileUpload}
                onImportJSON={handleImportJSON}
                importing={importing}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onSelectRange={handleSelectRange}
                onScan={() => setNameHunterOpen(true)}
                workspaceId={workspaceId}
                lastReadChapterId={workspace?.lastReadChapterId}
                onReadContinue={(id) => setReadingChapterId(id)}
            />

            <ErrorBoundary name="ChapterListView">
                {viewMode === "grid" ? (
                    <ChapterCardGrid
                        chapters={currentChapters}
                        selectedChapters={selectedChapters}
                        toggleSelect={toggleSingleSelection}
                        onRead={(id) => {
                            setReadingChapterId(id);
                            db.workspaces.update(workspaceId, { lastReadChapterId: id });
                        }}
                        onInspect={handleInspect}
                        onClearTranslation={handleClearTranslation}
                        onImport={() => fileInputRef.current?.click()}
                    />
                ) : (
                    <ChapterTable
                        chapters={currentChapters}
                        selectedChapters={selectedChapters}
                        setSelectedChapters={setSelectedChapters}
                        toggleSelect={toggleSingleSelection}

                        onSelectPage={() => {
                            // Union current page IDs with existing selection
                            const pageIds = currentChapters.map(c => c.id!);
                            const newSet = new Set([...selectedChapters, ...pageIds]);
                            setSelectedChapters(Array.from(newSet));
                        }}
                        onSelectGlobal={() => setSelectedChapters(filtered.map(c => c.id!))}
                        onDeselectAll={() => setSelectedChapters([])}

                        onRead={(id) => {
                            setReadingChapterId(id);
                            db.workspaces.update(workspaceId, { lastReadChapterId: id });
                        }}
                        onInspect={handleInspect}
                        onClearTranslation={handleClearTranslation}
                        onApplyCorrections={handleApplyCorrections}
                    />
                )}
            </ErrorBoundary>

            {/* Dialogs */}
            {inspectingChapter && (
                <InspectionDialog
                    open={isInspectOpen}
                    onOpenChange={setIsInspectOpen}
                    chapterTitle={inspectingChapter.title}
                    issues={inspectingChapter.issues}
                    onNavigateToIssue={(original: string) => {
                        console.log("Navigate to:", original);
                    }}
                />
            )}

            {readingChapterId && (
                <ReaderModal
                    chapterId={readingChapterId}
                    isOpen={!!readingChapterId}
                    onClose={() => setReadingChapterId(null)}
                    workspaceChapters={filtered}
                    hasPrev={filtered.findIndex(c => c.id === readingChapterId) > 0}
                    hasNext={filtered.findIndex(c => c.id === readingChapterId) < filtered.length - 1}
                    onPrev={() => {
                        const idx = filtered.findIndex(c => c.id === readingChapterId);
                        if (idx > 0) {
                            const newId = filtered[idx - 1].id!;
                            setReadingChapterId(newId);
                            db.workspaces.update(workspaceId, { lastReadChapterId: newId });
                        }
                    }}
                    onNext={() => {
                        const idx = filtered.findIndex(c => c.id === readingChapterId);
                        if (idx < filtered.length - 1) {
                            const newId = filtered[idx + 1].id!;
                            setReadingChapterId(newId);
                            db.workspaces.update(workspaceId, { lastReadChapterId: newId });
                        }
                    }}
                />
            )}

            <HistoryDialog
                workspaceId={workspaceId}
                open={historyOpen}
                onOpenChange={setHistoryOpen}
            />

            <NameHunterDialog
                isOpen={nameHunterOpen}
                onOpenChange={setNameHunterOpen}
                textToScan=""
                workspaceId={workspaceId}
                totalChapters={chapters.length}
                selectedCount={selectedChapters.length}
                onScanRequest={async (config) => {
                    let targetChapters: Chapter[] = [];

                    if (config.scope === 'range' && config.range) {
                        // Parse Range "1-10, 15"
                        const parts = config.range.split(',').map(p => p.trim());
                        const orders = new Set<number>();
                        parts.forEach(part => {
                            if (part.includes('-')) {
                                const [start, end] = part.split('-').map(n => parseInt(n));
                                if (!isNaN(start) && !isNaN(end)) {
                                    for (let i = Math.min(start, end); i <= Math.max(start, end); i++) orders.add(i);
                                }
                            } else {
                                const n = parseInt(part);
                                if (!isNaN(n)) orders.add(n);
                            }
                        });
                        targetChapters = await db.chapters.where('[workspaceId+order]')
                            .anyOf([...orders].map(o => [workspaceId, o]))
                            .toArray();
                    } else if (config.scope === 'selected_chapters') {
                        targetChapters = await db.chapters.where('id').anyOf(selectedChapters).toArray();
                    } else {
                        // All (Warning: Heavy) - maybe limit?
                        targetChapters = await db.chapters.where('workspaceId').equals(workspaceId).toArray();
                    }

                    // Extract content
                    const texts = targetChapters
                        .map(c => c.content_original)
                        .filter(t => t && t.trim().length > 0);

                    if (texts.length === 0) {
                        toast.error("Không tìm thấy nội dung trong các chương đã chọn.");
                        return [];
                    }

                    toast.info(`Đang nạp ${texts.length} chương vào Name Hunter...`);
                    return texts;
                }}
                onAddTerm={async (candidate) => {
                    try {
                        const existing = await db.dictionary
                            .where('[workspaceId+original]')
                            .equals([workspaceId, candidate.original])
                            .first();

                        if (existing) {
                            toast.warning(`"${candidate.original}" đã có trong từ điển.`);
                            return;
                        }

                        // Map TermType to Glossary types if needed, or just use as is
                        await db.dictionary.add({
                            workspaceId,
                            original: candidate.chinese || candidate.original,
                            translated: candidate.original,
                            type: (candidate.type === TermType.Person) ? 'name' :
                                (candidate.type === TermType.Location) ? 'location' : 'general',
                            description: candidate.metadata?.description || `Added via Name Hunter (Freq: ${candidate.count})`,
                            role: candidate.metadata?.role || 'mob',
                            gender: (candidate.metadata?.gender === 'Female' || candidate.metadata?.gender === 'female') ? 'female' : 'male',
                            createdAt: new Date()
                        });

                        toast.success(`Đã thêm "${candidate.original}" vào từ điển.`);
                    } catch (err) {
                        console.error("Add term error:", err);
                        toast.error("Không thể thêm vào từ điển.");
                    }
                }}
            />
        </div>
    );
}
