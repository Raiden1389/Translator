"use client";

import React from "react";
import { Chapter } from "@/lib/db";
import { TranslationSettings } from "@/lib/types";
import { InspectionDialog } from "./InspectionDialog";
import { ReaderModal } from "./ReaderModal";
import { HistoryDialog } from "./HistoryDialog";
import { ScanConfigDialog } from "./ScanConfigDialog";
import { ReviewDialog } from "./ReviewDialog";
import { TranslateConfigDialog } from "./TranslateConfigDialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eraser, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { ChapterListState, ChapterListActions, BatchTranslateHandlerProps } from "./hooks/useChapterList.types";

interface ChapterListDialogsProps {
    workspaceId: string;
    state: ChapterListState;
    actions: ChapterListActions;
    onTranslate: (props: BatchTranslateHandlerProps) => void;
    onTabChange?: (tab: string) => void;
}

export function ChapterListDialogs({
    workspaceId,
    state,
    actions,
    onTranslate,
    onTabChange
}: ChapterListDialogsProps) {
    const {
        filtered, chapters,
        translateDialogOpen, inspectingChapter, isInspectOpen,
        historyOpen, readingChapterId, scanConfigOpen, tempScanText,
        isReviewOpen, pendingCharacters, pendingTerms,
        clearCacheConfirmOpen, bulkDeleteConfirmOpen,
        selectedChapters
    } = state;

    const {
        setTranslateDialogOpen, setIsInspectOpen, setHistoryOpen,
        setReadingChapterId, setScanConfigOpen, setTempScanText,
        setIsReviewOpen, handleConfirmSaveAI, handleAIExtractChapter,
        setClearCacheConfirmOpen, setBulkDeleteConfirmOpen,
        handleBulkDelete, handleRead
    } = actions;

    return (
        <>
            {/* 1. Translation Config */}
            <TranslateConfigDialog
                open={translateDialogOpen}
                onOpenChange={setTranslateDialogOpen}
                selectedCount={selectedChapters.length}
                onStart={(config, settings: TranslationSettings) => {
                    setTranslateDialogOpen(false);
                    onTranslate({
                        workspaceId,
                        chapters: filtered as Chapter[],
                        selectedChapters,
                        currentSettings: settings,
                        translateConfig: {
                            ...config,
                            fixPunctuation: config.fixPunctuation,
                            enableChunking: config.enableChunking,
                            enableTurbo: config.enableTurbo,
                            maxConcurrentChunks: config.maxConcurrentChunks || 3,
                            chunkSize: config.chunkSize || 800
                        }
                    });
                }}
            />

            {/* 2. Inspection Results */}
            {inspectingChapter && (
                <InspectionDialog
                    open={isInspectOpen}
                    onOpenChange={setIsInspectOpen}
                    chapterTitle={inspectingChapter.title}
                    issues={inspectingChapter.issues}
                    onNavigateToIssue={() => { }}
                />
            )}

            {/* 3. Main Reader Modal */}
            {readingChapterId && (
                <ReaderModal
                    chapterId={readingChapterId}
                    isOpen={!!readingChapterId}
                    onClose={() => setReadingChapterId(null)}
                    onJumpToHub={() => onTabChange?.("intelligence")}
                    hasPrev={(() => {
                        const idx = filtered.findIndex(c => c.id === readingChapterId);
                        if (idx !== -1) return idx > 0;
                        const globalIdx = (chapters || []).findIndex(c => c.id === readingChapterId);
                        return globalIdx > 0;
                    })()}
                    hasNext={(() => {
                        const idx = filtered.findIndex(c => c.id === readingChapterId);
                        if (idx !== -1) return idx < filtered.length - 1;
                        const globalIdx = (chapters || []).findIndex(c => c.id === readingChapterId);
                        return globalIdx !== -1 && globalIdx < (chapters?.length || 0) - 1;
                    })()}
                    onPrev={() => {
                        let list = filtered as Chapter[];
                        let idx = list.findIndex(c => c.id === readingChapterId);
                        if (idx === -1) {
                            list = (chapters || []) as Chapter[];
                            idx = list.findIndex(c => c.id === readingChapterId);
                        }
                        if (idx > 0) handleRead(list[idx - 1].id!);
                        else toast.info("Đã ở chương đầu tiên");
                    }}
                    onNext={() => {
                        let list = filtered as Chapter[];
                        let idx = list.findIndex(c => c.id === readingChapterId);
                        if (idx === -1) {
                            list = (chapters || []) as Chapter[];
                            idx = list.findIndex(c => c.id === readingChapterId);
                        }
                        if (idx < list.length - 1 && idx !== -1) handleRead(list[idx + 1].id!);
                        else toast.info("Đã ở chương cuối cùng");
                    }}
                />
            )}

            {/* 4. History / Undo */}
            <HistoryDialog workspaceId={workspaceId} open={historyOpen} onOpenChange={setHistoryOpen} />

            {/* 5. AI Scan Config */}
            <ScanConfigDialog
                open={scanConfigOpen}
                onOpenChange={setScanConfigOpen}
                onStart={(types: string[]) => {
                    handleAIExtractChapter(tempScanText, types);
                    setTempScanText("");
                }}
            />

            {/* 6. AI Review Results */}
            <ReviewDialog
                open={isReviewOpen}
                onOpenChange={setIsReviewOpen}
                characters={pendingCharacters}
                terms={pendingTerms}
                onSave={handleConfirmSaveAI}
            />

            {/* 7. Clear Cache Confirmation */}
            <AlertDialog open={clearCacheConfirmOpen} onOpenChange={setClearCacheConfirmOpen}>
                <AlertDialogContent className="max-w-[400px] rounded-3xl border-blue-100 shadow-2xl">
                    <AlertDialogHeader className="items-center text-center">
                        <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mb-2">
                            <Eraser className="h-8 w-8 text-blue-500" />
                        </div>
                        <AlertDialogTitle className="text-xl font-bold text-slate-900">Dọn dẹp Cache AI?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500">
                            Việc này sẽ buộc AI dịch mới hoàn toàn cho các yêu cầu sau. Hữu ích khi bạn thay đổi prompt hoặc muốn kết quả khác đi.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-center gap-2 pt-4">
                        <AlertDialogCancel className="rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50 px-8">Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => toast.success("Cache đã được tối ưu hóa tự động.")}
                            className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white border-0 px-8 shadow-lg shadow-blue-200"
                        >
                            Xác nhận Dọn
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* 8. Bulk Delete Confirmation */}
            <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
                <AlertDialogContent className="max-w-[400px] rounded-3xl border-rose-100 shadow-2xl">
                    <AlertDialogHeader className="items-center text-center">
                        <div className="h-16 w-16 rounded-full bg-rose-50 flex items-center justify-center mb-2">
                            <AlertTriangle className="h-8 w-8 text-rose-500 animate-bounce" />
                        </div>
                        <AlertDialogTitle className="text-xl font-bold text-slate-900">Xóa vĩnh viễn {selectedChapters.length} chương?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500">
                            Bạn không thể hoàn tác hành động này. Mọi dữ liệu bản gốc và bản dịch của các chương đã chọn sẽ biến mất.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-center gap-2 pt-4">
                        <AlertDialogCancel className="rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50 px-8">Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkDelete}
                            className="rounded-2xl bg-rose-500 hover:bg-rose-600 text-white border-0 px-8 shadow-lg shadow-rose-200"
                        >
                            Xác nhận Xóa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
