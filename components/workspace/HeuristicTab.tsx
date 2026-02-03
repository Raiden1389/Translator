"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHeuristic } from "./hooks/useHeuristic";

import { Button } from "@/components/ui/button";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
    Search,
    CheckCircle2,
    Trash2,
    Activity,
    User,
    RotateCw,
    AlertTriangle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useRaiden } from "@/components/theme/RaidenProvider";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { analyzeHeuristicResults, type ForensicReport } from "@/lib/gemini/heuristic/forensic-analyzer";
import { HeuristicHeader } from "./HeuristicHeader";
import { useHeuristicStats } from "./hooks/useHeuristicStats";
import { useHeuristicFilter, type HeuristicFilterType } from "./hooks/useHeuristicFilter";

export function HeuristicTab({ workspaceId }: { workspaceId: string }) {
    const { isRaidenMode } = useRaiden();
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<HeuristicFilterType>('all');
    const [isScanning, setIsScanning] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, message: "" });
    const [scanTimeout, setScanTimeout] = useState<NodeJS.Timeout | null>(null);
    const parentRef = useRef<HTMLDivElement>(null);

    // ✅ FIX #1: Keep track of scan state outside component lifecycle
    const scanStateRef = useRef<{
        isActive: boolean;
        abortController: AbortController | null;
    }>({
        isActive: false,
        abortController: null,
    });

    // ✅ FIX #2: Reset scanning state on workspaceId change
    useEffect(() => {
        // When workspace changes, abort previous scan if still running
        if (scanStateRef.current.abortController) {
            scanStateRef.current.abortController.abort();
        }
        setIsScanning(false);
        setScanTimeout(null);
        scanStateRef.current.isActive = false;
        return () => {
            // Cleanup on unmount
            if (scanStateRef.current.abortController) {
                scanStateRef.current.abortController.abort();
            }
        };
    }, [workspaceId]);

    const { startScan, approveTerm, deleteTerm, approveAll } = useHeuristic(workspaceId);

    const blacklist = useLiveQuery(
        async () => {
            const allItems = await db.blacklist.where('workspaceId').equals(workspaceId).toArray();
            const heuristicOnly = allItems.filter(b => b.source === 'heuristic');

            console.log('🔍 BLACKLIST DEBUG:', {
                total: allItems.length,
                heuristicOnly: heuristicOnly.length,
                sources: allItems.map(b => ({ word: b.word, source: b.source }))
            });

            return heuristicOnly;
        },
        [workspaceId]
    );

    const rawTerms = useLiveQuery(() => db.heuristicTerms.where('workspaceId').equals(workspaceId).toArray(), [workspaceId]) || [];

    const stats = useHeuristicStats(rawTerms);
    const filteredTerms = useHeuristicFilter(rawTerms, search, filter);

    const forensicReport = useMemo<ForensicReport | null>(() => {
        if (rawTerms.length === 0) return null;
        const approved = rawTerms.filter(t => t.isApproved);
        return analyzeHeuristicResults(rawTerms, approved);
    }, [rawTerms]);

    const pendingCount = stats.total - stats.approved;

    const rowVirtualizer = useVirtualizer({
        count: filteredTerms.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 72,
        overscan: 10,
    });

    // ✅ FIX #3: Bulletproof scan handler with timeout protection
    const handleScan = async () => {
        // Prevent double-scan
        if (scanStateRef.current.isActive) {
            toast.warning("Quét đang chạy, vui lòng chờ...");
            return;
        }

        // Clear any previous timeout
        if (scanTimeout) clearTimeout(scanTimeout);

        setIsScanning(true);
        scanStateRef.current.isActive = true;
        scanStateRef.current.abortController = new AbortController();

        // ⚠️ Hard timeout: 5 minutes
        const timeoutId = setTimeout(() => {
            console.error("[HeuristicTab] Scan timeout exceeded 5 minutes");
            scanStateRef.current.abortController?.abort();
            // Reset state regardless
            scanStateRef.current.isActive = false;
            setIsScanning(false);
            toast.error("⏱️ Quét vượt quá thời gian giới hạn (5 phút). Đã dừng.");
        }, 5 * 60 * 1000);

        setScanTimeout(timeoutId);

        try {
            // Pass abort signal to scan (requires scanner.ts to accept it)
            await startScan(
                (current, total, message) => {
                    setProgress({ current, total, message });
                },
                scanStateRef.current.abortController.signal
            );

            // Only show success if scan wasn't aborted
            if (!scanStateRef.current.abortController.signal.aborted) {
                toast.success("✨ Quét hoàn tất!");
            }
        } catch (error) {
            // Error already handled in useHeuristic, just log here
            console.error("[HeuristicTab] Scan error:", error);
        } finally {
            // ✅ GUARANTEE: Always cleanup
            clearTimeout(timeoutId);
            setScanTimeout(null);
            scanStateRef.current.isActive = false;
            setIsScanning(false);
        }
    };

    const handleClearAll = async () => {
        if (!confirm(`⚠️ Xóa TOÀN BỘ ${stats.total} thực thể?\n\nHành động này KHÔNG THỂ hoàn tác!`)) {
            return;
        }

        setIsScanning(true);
        setProgress({ current: 0, total: 100, message: "🗑️ Đang xóa dữ liệu cũ..." });

        try {
            const count = stats.total;
            await db.heuristicTerms.where('workspaceId').equals(workspaceId).delete();
            toast.success(`✅ Đã xóa sạch ${count} thực thể`);
        } catch (err) {
            toast.error("❌ Lỗi khi xóa: " + (err as Error).message);
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <TooltipProvider>
            <div className="h-[calc(100vh-160px)] flex flex-col space-y-4 animate-in fade-in duration-500">
                {/* Header */}
                <HeuristicHeader
                    workspaceId={workspaceId}
                    stats={stats}
                    pendingCount={pendingCount}
                    isScanning={isScanning}
                    rawTerms={rawTerms}
                    forensicReport={forensicReport}
                    blacklist={blacklist || []}
                    onScan={handleScan}
                    onClearAll={handleClearAll}
                    onApproveAll={() => approveAll(filteredTerms.filter(t => !t.isApproved))}
                />

                {/* AI Console / Progress bar */}
                {isScanning && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm shrink-0 space-y-3">
                        <div className="space-y-2">
                            <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                <span>{progress.message}</span>
                                <span className="text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
                                    <RotateCw className="h-2.5 w-2.5 animate-spin" />
                                    {Math.round((progress.current / (progress.total || 1)) * 100)}%
                                </span>
                            </div>
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-300"
                                    style={{ width: `${(progress.current / (progress.total || 1)) * 100}%` }}
                                />
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 text-amber-500" />
                                Nếu quét bị kẹt quá lâu, trang sẽ tự dừng sau 5 phút.
                            </div>
                        </div>
                    </div>
                )}

                {/* Toolbar section */}
                <div className="flex flex-col md:flex-row gap-2 shrink-0">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Tìm theo chữ gốc hoặc Hán Việt..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            disabled={isScanning}
                            className="pl-10 h-10 rounded-xl bg-white border-slate-200 focus:ring-indigo-500 transition-all shadow-sm"
                        />
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                        <button
                            onClick={() => setFilter('character')}
                            disabled={isScanning}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 bg-white shadow-sm text-indigo-600 disabled:opacity-50"
                        >
                            <User className="h-3.5 w-3.5" />
                            Nhân vật
                            <span className="text-[10px] px-1.5 rounded-md bg-indigo-50 text-indigo-500">
                                {stats.character}
                            </span>
                        </button>
                    </div>
                </div>

                {/* List View */}
                <div
                    ref={parentRef}
                    className="flex-1 overflow-auto border border-slate-200 rounded-2xl bg-white shadow-inner bg-slate-50/20"
                >
                    <div
                        style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                        }}
                    >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const term = filteredTerms[virtualRow.index];
                            if (!term) return null;

                            return (
                                <div
                                    key={virtualRow.key}
                                    className="absolute top-0 left-0 w-full px-2"
                                    style={{
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                >
                                    <div className={cn(
                                        "h-[64px] mt-2 rounded-[14px] flex items-center justify-between px-5 transition-all border group",
                                        term.isApproved
                                            ? "bg-emerald-50/50 border-emerald-100"
                                            : "bg-white border-slate-200/60 hover:border-indigo-400 hover:shadow-sm"
                                    )}>
                                        <div className="flex items-center gap-5 min-w-0">
                                            <div className={cn(
                                                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-100 text-amber-600"
                                            )}>
                                                <User className="h-5 w-5" />
                                            </div>

                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-lg font-bold text-slate-900 tracking-tight shrink-0">{term.original}</span>
                                                </div>
                                                <div className="text-sm font-medium text-slate-500 truncate italic">
                                                    {term.translated || "Chưa có bản dịch..."}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-8 shrink-0">
                                            <div className="hidden lg:flex flex-col items-end gap-0.5 text-[11px] font-bold uppercase tracking-tight opacity-70">
                                                <span className="text-slate-400">{term.occurrences} lần xuất hiện</span>
                                                <span className={cn(term.confidence > 80 ? "text-emerald-500" : "text-amber-500")}>
                                                    Độ tin cậy: {term.confidence}%
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    disabled={isScanning}
                                                    className="h-9 w-9 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteTerm(term.id!);
                                                    }}
                                                >
                                                    <Trash2 className="h-4.5 w-4.5" />
                                                </Button>

                                                {!term.isApproved ? (
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        disabled={isScanning}
                                                        className="h-9 px-5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-transform active:scale-95 disabled:opacity-50"
                                                        onClick={() => approveTerm(term.id!)}
                                                    >
                                                        Chốt
                                                    </Button>
                                                ) : (
                                                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 animate-in zoom-in-95 duration-200">
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        <span className="text-[11px] font-black uppercase">Đã Duyệt</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {filteredTerms.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center p-20 text-center space-y-4">
                            <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center">
                                <Activity className="h-8 w-8 text-slate-200" />
                            </div>
                            <div className="text-slate-400 text-sm font-bold opacity-60 italic">Không tìm thấy thực thể nào.</div>
                        </div>
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}
