"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { convertChapterForReview } from "@/lib/services/name-audit.service";

interface ChapterConvertModalProps {
    chapterId: number;
    onClose: () => void;
}

type ViewMode = "vietphrase" | "hanviet" | "original";

export function ChapterConvertModal({ chapterId, onClose }: ChapterConvertModalProps) {
    const [data, setData] = useState<Awaited<ReturnType<typeof convertChapterForReview>> | "pending">("pending");
    const [viewMode, setViewMode] = useState<ViewMode>("vietphrase");

    useEffect(() => {
        let cancelled = false;
        convertChapterForReview(chapterId).then(result => {
            if (!cancelled) {
                setData(result);
            }
        });
        return () => { cancelled = true; };
    }, [chapterId]);

    const loading = data === "pending";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-background border border-border/40 rounded-2xl shadow-2xl w-[90vw] max-w-3xl max-h-[80vh] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 shrink-0">
                    <div>
                        <h3 className="font-bold text-sm text-foreground">
                            Chapter Convert
                        </h3>
                        {data && data !== "pending" && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Chương {data.chapterOrder} — {data.paragraphs.length} đoạn
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {/* View mode tabs */}
                        <div className="flex bg-muted/30 rounded-lg p-0.5 text-[10px] font-semibold">
                            {([
                                { key: "vietphrase", label: "VietPhrase" },
                                { key: "hanviet", label: "Hán Việt" },
                                { key: "original", label: "Gốc 🇨🇳" },
                            ] as { key: ViewMode; label: string }[]).map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setViewMode(tab.key)}
                                    className={`px-3 py-1.5 rounded-md transition-all duration-150 ${
                                        viewMode === tab.key
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                            <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-sm text-muted-foreground">Converting...</span>
                        </div>
                    ) : !data ? (
                        <p className="text-center text-sm text-muted-foreground py-16">
                            Không tìm thấy dữ liệu gốc cho chương này.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {data.paragraphs.map((para, idx) => (
                                <div key={idx} className="flex gap-3 text-sm leading-relaxed">
                                    <span className="shrink-0 text-[10px] font-mono text-muted-foreground/50 pt-1 w-6 text-right">
                                        {idx + 1}
                                    </span>
                                    <p className={
                                        viewMode === "original"
                                            ? "font-mono text-muted-foreground"
                                            : viewMode === "vietphrase"
                                                ? "text-foreground"
                                                : "text-foreground/80"
                                    }>
                                        {viewMode === "vietphrase" && para.vietPhrase}
                                        {viewMode === "hanviet" && para.hanViet}
                                        {viewMode === "original" && para.original}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
