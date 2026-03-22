"use client";

import React, { useState } from "react";
import { Loader2, Search, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNameAudit } from "./hooks/useNameAudit";
import { NameClusterCard } from "./NameClusterCard";
import { ChapterConvertModal } from "./ChapterConvertModal";

interface NameAuditModuleProps {
    workspaceId: string;
}

type FilterMode = "all" | "inconsistent" | "confirmed";

export function NameAuditModule({ workspaceId }: NameAuditModuleProps) {
    const {
        report,
        isScanning,
        scanProgress,
        confirmedFixes,
        visibleClusters,
        confirmedCount,
        similarityThreshold,
        startScan,
        recluster,
        selectCanonical,
        dismissCluster,
        fromChapter,
        toChapter,
        setFromChapter,
        setToChapter,
        isApplying,
        applyProgress,
        fixResult,
        applyAllFixes,
    } = useNameAudit(workspaceId);

    const [filterMode, setFilterMode] = useState<FilterMode>("all");
    const [convertChapterId, setConvertChapterId] = useState<number | null>(null);

    // Filter clusters based on mode
    const filteredClusters = visibleClusters.filter(c => {
        if (filterMode === "inconsistent") return c.isInconsistent;
        if (filterMode === "confirmed") return confirmedFixes.has(c.id);
        return true;
    });

    const inconsistentTotal = visibleClusters.filter(c => c.isInconsistent).length;

    return (
        <div className="space-y-6">
            {/* ── Scan Controls ── */}
            <div className="flex flex-wrap items-end gap-4">
                {/* Chapter range */}
                <div className="flex items-end gap-2">
                    <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                            Từ chương
                        </label>
                        <input
                            type="number"
                            min={1}
                            placeholder="1"
                            value={fromChapter ?? ""}
                            onChange={e => setFromChapter(e.target.value ? Number(e.target.value) : undefined)}
                            className="w-20 h-9 px-2 text-sm border border-border/40 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                            disabled={isScanning}
                        />
                    </div>
                    <span className="text-muted-foreground text-sm pb-2">→</span>
                    <div>
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                            Đến chương
                        </label>
                        <input
                            type="number"
                            min={1}
                            placeholder="Tất cả"
                            value={toChapter ?? ""}
                            onChange={e => setToChapter(e.target.value ? Number(e.target.value) : undefined)}
                            className="w-20 h-9 px-2 text-sm border border-border/40 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                            disabled={isScanning}
                        />
                    </div>
                </div>

                {/* Scan button */}
                <button
                    onClick={startScan}
                    disabled={isScanning}
                    className={cn(
                        "h-9 px-4 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center gap-2",
                        isScanning
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98]"
                    )}
                >
                    {isScanning ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Đang quét {scanProgress.current}/{scanProgress.total}...
                        </>
                    ) : (
                        <>
                            <Search className="w-4 h-4" />
                            {report ? "Scan lại" : "Scan Now"}
                        </>
                    )}
                </button>

                {/* Threshold slider */}
                {report && (
                    <div className="ml-auto flex items-center gap-2">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Ngưỡng: {Math.round(similarityThreshold * 100)}%
                        </label>
                        <input
                            type="range"
                            min={50}
                            max={95}
                            step={5}
                            value={similarityThreshold * 100}
                            onChange={e => recluster(Number(e.target.value) / 100)}
                            className="w-24 accent-primary"
                        />
                    </div>
                )}
            </div>

            {/* ── Scanning Progress ── */}
            {isScanning && scanProgress.total > 0 && (
                <div className="space-y-1">
                    <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                        {scanProgress.current} / {scanProgress.total} chương
                    </p>
                </div>
            )}

            {/* ── Report Summary ── */}
            {report && !isScanning && (
                <>
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                        {/* Stats */}
                        <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">
                                <strong className="text-foreground">{report.totalChaptersScanned}</strong> chương
                            </span>
                            <span className="text-muted-foreground">
                                <strong className="text-foreground">{report.totalNamesFound}</strong> tên
                            </span>
                            <span className="text-muted-foreground">
                                <strong className="text-foreground">{visibleClusters.length}</strong> nhóm
                            </span>
                            <span className="text-muted-foreground">
                                {report.scanDurationMs}ms
                            </span>
                        </div>

                        {/* Inconsistency badge */}
                        {inconsistentTotal > 0 && (
                            <div className="flex items-center gap-1.5 text-amber-600 font-semibold">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {inconsistentTotal} không nhất quán
                            </div>
                        )}
                        {confirmedCount > 0 && (
                            <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {confirmedCount} đã chọn
                            </div>
                        )}

                        {/* Filter tabs */}
                        <div className="ml-auto flex bg-muted/30 rounded-lg p-0.5 text-[10px] font-semibold">
                            {([
                                { key: "all", label: "Tất cả", count: visibleClusters.length },
                                { key: "inconsistent", label: "⚠️ Không nhất quán", count: inconsistentTotal },
                                { key: "confirmed", label: "✅ Đã chọn", count: confirmedCount },
                            ] as { key: FilterMode; label: string; count: number }[]).map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setFilterMode(tab.key)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md transition-all duration-150",
                                        filterMode === tab.key
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {tab.label} ({tab.count})
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Cluster List ── */}
                    <div className="space-y-2">
                        {filteredClusters.length === 0 ? (
                            <div className="text-center text-sm text-muted-foreground py-12">
                                {filterMode === "all"
                                    ? "Không tìm thấy tên nhân vật nào."
                                    : filterMode === "inconsistent"
                                        ? "Tất cả tên đã nhất quán! 🎉"
                                        : "Chưa chọn tên chuẩn nào."
                                }
                            </div>
                        ) : (
                            filteredClusters.map(cluster => (
                                <NameClusterCard
                                    key={cluster.id}
                                    cluster={cluster}
                                    selectedCanonical={confirmedFixes.get(cluster.id)}
                                    onSelectCanonical={selectCanonical}
                                    onDismiss={dismissCluster}
                                    onConvertChapter={setConvertChapterId}
                                />
                            ))
                        )}
                    </div>

                    {/* ── Apply All button (Phase 4) ── */}
                    {confirmedCount > 0 && (
                        <div className="flex items-center gap-4 pt-4 border-t border-border/30">
                            {/* Apply progress */}
                            {isApplying && (
                                <div className="flex-1 space-y-1">
                                    <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                            style={{ width: applyProgress.total > 0 ? `${(applyProgress.current / applyProgress.total) * 100}%` : '0%' }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        {applyProgress.current}/{applyProgress.total}
                                        {applyProgress.label && <span className="ml-1 text-foreground">{applyProgress.label}</span>}
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={applyAllFixes}
                                disabled={isApplying}
                                className={cn(
                                    "h-9 px-6 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all duration-150 ml-auto",
                                    isApplying
                                        ? "bg-emerald-600/50 text-white/70 cursor-not-allowed"
                                        : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]"
                                )}
                            >
                                {isApplying ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Đang fix...</>
                                ) : (
                                    <><CheckCircle2 className="w-4 h-4" /> Apply {confirmedCount} fix + nạp Cải chính</>
                                )}
                            </button>
                        </div>
                    )}

                    {/* ── Fix Result Banner ── */}
                    {fixResult && !isApplying && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            <div className="text-sm">
                                <strong className="text-emerald-700">
                                    {fixResult.rulesCreated} Correction rules
                                </strong>
                                {' '}đã tạo vào Luyện Văn,{' '}
                                <strong className="text-emerald-700">
                                    {fixResult.chaptersFixed} chương
                                </strong>
                                {' '}đã cập nhật.
                                <span className="text-muted-foreground ml-1">({fixResult.durationMs}ms)</span>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ── Idle State ── */}
            {!report && !isScanning && (
                <div className="text-center py-16 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto">
                        <Search className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Quét chương đã dịch để phát hiện tên nhân vật không nhất quán.
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                        Chọn range chương hoặc để trống để quét tất cả.
                    </p>
                </div>
            )}

            {/* ── Chapter Convert Modal ── */}
            {convertChapterId !== null && (
                <ChapterConvertModal
                    chapterId={convertChapterId}
                    onClose={() => setConvertChapterId(null)}
                />
            )}
        </div>
    );
}
