"use client";

import React, { useState } from "react";
import {
    Loader2, Search, AlertTriangle, CheckCircle2,
    ScanSearch, Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { featureFlags } from "@/lib/featureFlags";
import { useTermAudit } from "@/hooks/useTermAudit";
import { TermClusterCard } from "./TermClusterCard";

interface TermAuditModuleProps {
    workspaceId: string;
}

type FilterMode = "all" | "inconsistent" | "review" | "confirmed";

export function TermAuditModule({ workspaceId }: TermAuditModuleProps) {
    // Feature gate
    if (!featureFlags.termAudit) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center">
                    <ScanSearch className="w-5 h-5 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground">
                    Term Audit đang trong giai đoạn phát triển.
                </p>
                <p className="text-xs text-muted-foreground/60">
                    Bật <code className="font-mono">featureFlags.termAudit</code> để dùng thử.
                </p>
            </div>
        );
    }

    return <TermAuditContent workspaceId={workspaceId} />;
}

// Separate component so hooks are only mounted when feature is ON
function TermAuditContent({ workspaceId }: TermAuditModuleProps) {
    const [fromChapter, setFromChapter] = useState<number | undefined>();
    const [toChapter, setToChapter] = useState<number | undefined>();

    const audit = useTermAudit({ workspaceId, fromChapter, toChapter });
    const [filterMode, setFilterMode] = useState<FilterMode>("all");
    const isScanning = audit.status === "scanning";
    const isApplying = audit.status === "applying";
    const report = audit.report;

    // Derived clusters for display
    const allClusters = report?.clusters ?? [];
    const filteredClusters = allClusters.filter(c => {
        if (filterMode === "inconsistent") return c.isInconsistent && c.clusterMode === "auto";
        if (filterMode === "review") return c.clusterMode === "review";
        if (filterMode === "confirmed") return audit.confirmedFixes.has(c.id);
        return true;
    });

    const inconsistentCount = allClusters.filter(c => c.isInconsistent && c.clusterMode === "auto").length;
    const reviewCount = allClusters.filter(c => c.clusterMode === "review").length;
    const confirmedCount = audit.confirmedFixes.size;


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
                            disabled={isScanning}
                            className="w-20 h-9 px-2 text-sm border border-border/40 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
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
                            disabled={isScanning}
                            className="w-20 h-9 px-2 text-sm border border-border/40 rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                    </div>
                </div>

                {/* Scan button */}
                <button
                    id="term-audit-scan-btn"
                    onClick={audit.scan}
                    disabled={isScanning || isApplying}
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
                            Đang quét...
                        </>
                    ) : (
                        <>
                            <Search className="w-4 h-4" />
                            {report ? "Scan lại" : "Scan Now"}
                        </>
                    )}
                </button>

                {/* Error state */}
                {audit.status === "error" && audit.error && (
                    <div className="flex items-center gap-2 text-xs text-red-500">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {audit.error}
                    </div>
                )}
            </div>

            {/* ── Apply progress bar ── */}
            {isApplying && audit.progress && (
                <div className="space-y-1">
                    <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{
                                width: audit.progress.total > 0
                                    ? `${(audit.progress.current / audit.progress.total) * 100}%`
                                    : "0%"
                            }}
                        />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                        {audit.progress.current}/{audit.progress.total}
                        {audit.progress.label && (
                            <span className="ml-1 text-foreground">{audit.progress.label}</span>
                        )}
                    </p>
                </div>
            )}

            {/* ── Report ── */}
            {report && !isScanning && (
                <>
                    {/* Summary bar */}
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                        <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">
                                <strong className="text-foreground">{report.totalChaptersScanned}</strong> chương
                            </span>
                            <span className="text-muted-foreground">
                                <strong className="text-foreground">{report.totalTermsFound}</strong> terms
                            </span>
                            <span className="text-muted-foreground">
                                <strong className="text-foreground">{allClusters.length}</strong> nhóm
                            </span>
                            <span className="text-muted-foreground/60">{report.scanDurationMs}ms</span>
                        </div>

                        {inconsistentCount > 0 && (
                            <div className="flex items-center gap-1.5 text-amber-600 font-semibold">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {inconsistentCount} không nhất quán
                            </div>
                        )}
                        {reviewCount > 0 && (
                            <div className="flex items-center gap-1.5 text-blue-500 font-semibold">
                                <Info className="w-3.5 h-3.5" />
                                {reviewCount} cần xem lại
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
                                { key: "all", label: "Tất cả", count: allClusters.length },
                                { key: "inconsistent", label: "⚠️ Không nhất quán", count: inconsistentCount },
                                { key: "review", label: "🔍 Xem lại", count: reviewCount },
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

                    {/* Cluster list */}
                    <div className="space-y-2">
                        {filteredClusters.length === 0 ? (
                            <div className="text-center text-sm text-muted-foreground py-12">
                                {filterMode === "all"
                                    ? "Không tìm thấy nhóm thuật ngữ nào."
                                    : filterMode === "inconsistent"
                                        ? "Tất cả thuật ngữ đã nhất quán! 🎉"
                                        : filterMode === "review"
                                            ? "Không có nhóm cần xem lại."
                                            : "Chưa chọn thuật ngữ chuẩn nào."
                                }
                            </div>
                        ) : (
                            filteredClusters.map(cluster => (
                                <TermClusterCard
                                    key={cluster.id}
                                    cluster={cluster}
                                    selectedCanonical={audit.confirmedFixes.get(cluster.id)}
                                    onSelectCanonical={audit.confirmCanonical}
                                />
                            ))
                        )}
                    </div>

                    {/* Apply button */}
                    {confirmedCount > 0 && (
                        <div className="flex items-center gap-4 pt-4 border-t border-border/30">
                            <button
                                id="term-audit-apply-btn"
                                onClick={audit.apply}
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

                    {/* Apply result banner */}
                    {audit.applyResult && !isApplying && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            <div className="text-sm">
                                <strong className="text-emerald-700">
                                    {audit.applyResult.rulesCreated} Correction rules
                                </strong>
                                {" "}đã tạo vào Luyện Văn,{" "}
                                <strong className="text-emerald-700">
                                    {audit.applyResult.chaptersFixed} lượt cập nhật
                                </strong>
                                {" "}đã áp dụng.
                                <span className="text-muted-foreground ml-1">
                                    ({audit.applyResult.durationMs}ms)
                                </span>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ── Idle state ── */}
            {!report && !isScanning && (
                <div className="text-center py-16 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto">
                        <ScanSearch className="w-6 h-6 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Quét chương đã dịch để phát hiện thuật ngữ không nhất quán.
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                        Chọn range chương hoặc để trống để quét tất cả.
                        Chỉ xét <code className="font-mono">content_translated</code>.
                    </p>
                </div>
            )}
        </div>
    );
}
