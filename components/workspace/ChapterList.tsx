"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import Dexie from "dexie";
import { db, type Chapter } from "@/lib/db";
import { ChapterListHeader } from "./ChapterListHeader";
import { ChapterTable } from "./ChapterTable";
import { ChapterCardGrid } from "./ChapterCardGrid";
import { ReaderModal } from "./ReaderModal";
import { ImportProgressOverlay } from "./ImportProgressOverlay";
import { TranslateConfigDialog } from "./TranslateConfigDialog";
import { InspectionDialog } from "./InspectionDialog";
import { HistoryDialog } from "./HistoryDialog";
import { ReviewDialog } from "./ReviewDialog";
import { ScanConfigDialog } from "./ScanConfigDialog";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { type TranslationSettings } from "@/lib/types";
import { useChapterList } from "./hooks/useChapterList";
import { Button } from "@/components/ui/button";
import { Trash2, Eraser, Sparkles, X, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRaiden } from "@/components/theme/RaidenProvider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
    const { isRaidenMode } = useRaiden();
    const workspace = useLiveQuery(() => db.workspaces.get(workspaceId), [workspaceId]);
    const chapters = useLiveQuery(
        () => db.chapters.where("[workspaceId+order]").between([workspaceId, Dexie.minKey], [workspaceId, Dexie.maxKey]).toArray(),
        [workspaceId]
    );

    const { state, actions } = useChapterList(workspaceId, chapters);

    const {
        search, filterStatus, currentPage, itemsPerPage, viewMode,
        readingChapterId, translateDialogOpen, inspectingChapter, isInspectOpen,
        historyOpen, filtered, currentChapters, totalPages,
        selectedChapters, importing, importProgress, importStatus,
        fileInputRef
    } = state;

    const {
        setSearch, setFilterStatus, setCurrentPage, setItemsPerPage, setViewMode,
        setReadingChapterId, setTranslateDialogOpen, setIsInspectOpen, setHistoryOpen,
        setSelectedChapters, handleSelect, handleInspect,
        handleApplyCorrections, handleClearTranslationAction, handleBulkClearTranslation, handleExport,
        handleFileUpload,
        setIsReviewOpen, handleAIExtractChapter, handleConfirmSaveAI,
        isAIExtracting, pendingCharacters, pendingTerms, isReviewOpen
    } = actions;

    const [scanConfigOpen, setScanConfigOpen] = useState(false);
    const [tempScanText, setTempScanText] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    if (!chapters) return <div className="p-10 text-center text-white/50 animate-pulse">Loading workspace...</div>;

    const hasSelection = selectedChapters.length > 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative pb-20">
            <ImportProgressOverlay importing={importing} progress={importProgress} importStatus={importStatus} />

            <TranslateConfigDialog
                open={translateDialogOpen}
                onOpenChange={setTranslateDialogOpen}
                selectedCount={selectedChapters.length}
                onStart={(config: { customPrompt: string; autoExtract: boolean; fixPunctuation?: boolean; enableChunking: boolean; maxConcurrentChunks: number; chunkSize?: number }, settings: TranslationSettings) => {
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
                onExport={async () => {
                    setIsProcessing(true);
                    try {
                        await handleExport();
                    } finally {
                        setIsProcessing(false);
                    }
                }}
                fileInputRef={fileInputRef}
                onFileUpload={handleFileUpload}
                importing={importing}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
                lastReadChapterId={workspace?.lastReadChapterId}
                onReadContinue={(id: number) => setReadingChapterId(id)}
                onHistoryOpen={() => setHistoryOpen(true)}
                onScan={() => setScanConfigOpen(true)}
                onApplyCorrections={handleApplyCorrections}
                onClearCache={async () => {
                    if (!confirm("Dọn dẹp bộ nhớ đệm AI? (Buộc AI dịch mới hoàn toàn cho các yêu cầu sau)")) return;
                    setIsProcessing(true);
                    try {
                        await db.translationCache.clear();
                        toast.success("Đã dọn dẹp cache AI.");
                    } finally {
                        setIsProcessing(false);
                    }
                }}
                onImportJSON={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = (e: Event) => actions.handleImportJSON(e as unknown as React.ChangeEvent<HTMLInputElement>);
                    input.click();
                }}
                onRefresh={async () => {
                    setIsProcessing(true);
                    setSearch("");
                    setFilterStatus("all");
                    // Simulate a small delay for better UX feedback as requested in Suggestion #5
                    await new Promise(resolve => setTimeout(resolve, 600));
                    setIsProcessing(false);
                    toast.success("Đã làm mới dữ liệu và bộ lọc.");
                }}
                processing={isProcessing}
                onSelectRange={(start, end) => {
                    // Select chapters within the visual range (1-based index)
                    // If filtered is sorted by order, this selects Chapter X to Y.
                    const targetChapters = filtered.slice(start - 1, end);
                    const ids = targetChapters.map((c: Chapter) => c.id!).filter(Boolean);
                    setSelectedChapters(ids);
                    if (ids.length > 0) {
                        toast.success(`Đã chọn ${ids.length} chương`);
                    }
                }}
            />

            <ErrorBoundary name="ChapterListView">
                {viewMode === "grid" ? (
                    <ChapterCardGrid
                        chapters={currentChapters}
                        selectedChapters={selectedChapters}
                        onSelect={handleSelect}
                        onRead={(id: number) => {
                            setReadingChapterId(id);
                            db.workspaces.update(workspaceId, { lastReadChapterId: id });
                        }}
                        onInspect={handleInspect}
                        onClearTranslation={handleClearTranslationAction}
                        onImport={() => fileInputRef.current?.click()}
                        lastReadChapterId={workspace?.lastReadChapterId}
                    />
                ) : (
                    <ChapterTable
                        chapters={currentChapters}
                        selectedChapters={selectedChapters}
                        setSelectedChapters={setSelectedChapters}
                        onSelect={handleSelect}
                        onSelectPage={() => {
                            const pageIds = currentChapters.map(c => c.id!);
                            const newSet = new Set([...selectedChapters, ...pageIds]);
                            setSelectedChapters(Array.from(newSet));
                        }}
                        onSelectGlobal={() => setSelectedChapters(filtered.map(c => c.id!))}
                        onDeselectAll={() => setSelectedChapters([])}
                        onRead={(id: number) => {
                            setReadingChapterId(id);
                            db.workspaces.update(workspaceId, { lastReadChapterId: id });
                        }}
                        onInspect={handleInspect}
                        onClearTranslation={handleClearTranslationAction}
                        onApplyCorrections={handleApplyCorrections}
                        lastReadChapterId={workspace?.lastReadChapterId}
                    />
                )}
            </ErrorBoundary>

            {/* Sticky Selection Dock */}
            {hasSelection && (
                <div className="sticky bottom-0 left-0 right-0 z-40 animate-in slide-in-from-bottom-5 duration-300 -mx-8">
                    {/* Background Blur Overlay for the base */}
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-xl border-t border-border shadow-[0_-20px_40px_rgba(0,0,0,0.1)]" />

                    <div className="relative px-8 py-3 flex items-center justify-between gap-4 max-w-7xl mx-auto">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all",
                                    isRaidenMode ? "bg-purple-950/30 border-purple-500/20 text-purple-400" : "bg-blue-50 border-blue-100 text-blue-600"
                                )}>
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Đã chọn</span>
                                    <span className="text-sm font-black">{selectedChapters.length}</span>
                                    <span className="text-[10px] opacity-60">chương</span>
                                </div>

                                <div className="hidden md:flex flex-col">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Quy mô xử lý</span>
                                    <span className="text-[11px] font-black text-foreground/80">
                                        ~{(() => {
                                            const selectedData = (chapters || []).filter(c => selectedChapters.includes(c.id!));
                                            const words = selectedData.reduce((acc, c) => acc + (c.wordCountOriginal || 0), 0);
                                            return words.toLocaleString();
                                        })()} chữ • {(() => {
                                            const selectedData = (chapters || []).filter(c => selectedChapters.includes(c.id!));
                                            const words = selectedData.reduce((acc, c) => acc + (c.wordCountOriginal || 0), 0);
                                            // Tối ưu dự kiến dựa trên phản hồi thực tế (20-26s/chương) 
                                            // Giả định tốc độ trung bình ~5000-6000 chữ/phút
                                            const mins = Math.ceil(words / 5000);
                                            return mins <= 1 ? "tầm 1-2 phút xử lý" : `~${mins}-${mins + 1} phút xử lý`;
                                        })()}
                                    </span>
                                </div>
                            </div>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedChapters([])}
                                className="text-muted-foreground hover:text-foreground text-xs font-bold transition-colors"
                            >
                                <X className="mr-1.5 h-3.5 w-3.5" />
                                Hủy chọn
                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border/40 gap-1">
                                <Button
                                    size="sm"
                                    onClick={() => setTranslateDialogOpen(true)}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-9 px-6 rounded-lg shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 gap-2"
                                >
                                    <FileText className="h-4 w-4" />
                                    <span>{selectedChapters.length > 1 ? "Dịch hàng loạt" : "Dịch chương"}</span>
                                </Button>

                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        const targetChapters = filtered.filter((c: Chapter) => selectedChapters.includes(c.id!));
                                        const combinedText = targetChapters.map((c: Chapter) => c.content_original).join("\n\n---\n\n");
                                        setTempScanText(combinedText);
                                        setScanConfigOpen(true);
                                    }}
                                    disabled={isAIExtracting}
                                    className={cn(
                                        "font-bold h-9 px-4 rounded-lg gap-2 transition-colors",
                                        isRaidenMode ? "text-purple-400 hover:bg-purple-500/10" : "text-slate-600 hover:bg-slate-100"
                                    )}
                                >
                                    {isAIExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                    <span className="hidden sm:inline">Quét Thuật Ngữ</span>
                                </Button>
                            </div>

                            <div className="w-px h-6 bg-border/50 mx-1" />

                            <div className="flex items-center gap-1">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={handleBulkClearTranslation}
                                            className="h-9 w-9 text-amber-500 hover:text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
                                        >
                                            <Eraser className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Reset bản dịch ({selectedChapters.length} chương)</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => {
                                                if (confirm(`Xóa vĩnh viễn ${selectedChapters.length} chương đã chọn? Hành động này không thể hoàn tác.`)) {
                                                    db.chapters.bulkDelete(selectedChapters).then(() => setSelectedChapters([]));
                                                }
                                            }}
                                            className="h-9 w-9 text-rose-500 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Xóa vĩnh viễn (Không thể hoàn tác)</TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Dialogs */}
            {inspectingChapter && (
                <InspectionDialog
                    open={isInspectOpen}
                    onOpenChange={setIsInspectOpen}
                    chapterTitle={inspectingChapter.title}
                    issues={inspectingChapter.issues}
                    onNavigateToIssue={() => { }}
                />
            )}

            {readingChapterId && (
                <ReaderModal
                    chapterId={readingChapterId}
                    isOpen={!!readingChapterId}
                    onClose={() => setReadingChapterId(null)}
                    hasPrev={(() => {
                        const idx = filtered.findIndex((c: Chapter) => c.id === readingChapterId);
                        if (idx !== -1) return idx > 0;
                        const globalIdx = (chapters || []).findIndex((c: Chapter) => c.id === readingChapterId);
                        return globalIdx > 0;
                    })()}
                    hasNext={(() => {
                        const idx = filtered.findIndex((c: Chapter) => c.id === readingChapterId);
                        if (idx !== -1) return idx < filtered.length - 1;
                        const globalIdx = (chapters || []).findIndex((c: Chapter) => c.id === readingChapterId);
                        return globalIdx !== -1 && globalIdx < (chapters?.length || 0) - 1;
                    })()}
                    onPrev={() => {
                        let list = filtered;
                        let idx = list.findIndex((c: Chapter) => c.id === readingChapterId);
                        if (idx === -1) {
                            list = chapters || [];
                            idx = list.findIndex((c: Chapter) => c.id === readingChapterId);
                        }

                        if (idx > 0) {
                            const newId = list[idx - 1].id!;
                            setReadingChapterId(newId);
                            db.workspaces.update(workspaceId, { lastReadChapterId: newId });
                        } else {
                            toast.info("Đã ở chương đầu tiên");
                        }
                    }}
                    onNext={() => {
                        let list = filtered;
                        let idx = list.findIndex((c: Chapter) => c.id === readingChapterId);
                        if (idx === -1) {
                            list = chapters || [];
                            idx = list.findIndex((c: Chapter) => c.id === readingChapterId);
                        }

                        if (idx < list.length - 1 && idx !== -1) {
                            const newId = list[idx + 1].id!;
                            setReadingChapterId(newId);
                            db.workspaces.update(workspaceId, { lastReadChapterId: newId });
                        } else {
                            toast.info("Đã ở chương cuối cùng");
                        }
                    }}
                />
            )}

            <HistoryDialog workspaceId={workspaceId} open={historyOpen} onOpenChange={setHistoryOpen} />


            <ScanConfigDialog
                open={scanConfigOpen}
                onOpenChange={setScanConfigOpen}
                onStart={(types: string[]) => {
                    handleAIExtractChapter(tempScanText, types);
                    setTempScanText("");
                }}
            />

            <ReviewDialog
                open={isReviewOpen}
                onOpenChange={setIsReviewOpen}
                characters={pendingCharacters}
                terms={pendingTerms}
                onSave={handleConfirmSaveAI}
            />
        </div>
    );
}
