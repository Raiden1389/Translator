"use client";

import { useState } from "react";
import { InspectionIssue } from "@/lib/types";

export function useChapterListDialogs() {
    const [readingChapterId, setReadingChapterId] = useState<number | null>(null);
    const [translateDialogOpen, setTranslateDialogOpen] = useState(false);
    const [inspectingChapter, setInspectingChapter] = useState<{ id: number, title: string, issues: InspectionIssue[] } | null>(null);
    const [isInspectOpen, setIsInspectOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [scanConfigOpen, setScanConfigOpen] = useState(false);
    const [tempScanText, setTempScanText] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [isFixingTitles, setIsFixingTitles] = useState(false);
    const [clearCacheConfirmOpen, setClearCacheConfirmOpen] = useState(false);
    const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

    return {
        readingChapterId, setReadingChapterId,
        translateDialogOpen, setTranslateDialogOpen,
        inspectingChapter, setInspectingChapter,
        isInspectOpen, setIsInspectOpen,
        historyOpen, setHistoryOpen,
        scanConfigOpen, setScanConfigOpen,
        tempScanText, setTempScanText,
        isProcessing, setIsProcessing,
        isFixingTitles, setIsFixingTitles,
        clearCacheConfirmOpen, setClearCacheConfirmOpen,
        bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen
    };
}
