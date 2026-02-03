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
    User,
    Activity,
    RotateCw,
    CheckCircle,
    Clock,
    Sword,
    MapPin
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { analyzeHeuristicResults, type ForensicReport } from "@/lib/gemini/heuristic/forensic-analyzer";
import { HeuristicHeader } from "./HeuristicHeader";
import { useHeuristicStats } from "./hooks/useHeuristicStats";
import { useHeuristicFilter, type HeuristicTypeFilter, type HeuristicStatusFilter } from "./hooks/useHeuristicFilter";

export function HeuristicTab({ workspaceId }: { workspaceId: string }) {
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<HeuristicTypeFilter>('all');
    const [statusFilter, setStatusFilter] = useState<HeuristicStatusFilter>('all');
    const [isScanning, setIsScanning] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, message: "" });
    const [scanTimeout, setScanTimeout] = useState<NodeJS.Timeout | null>(null);
    const parentRef = useRef<HTMLDivElement>(null);

    const scanStateRef = useRef<{
        isActive: boolean;
        abortController: AbortController | null;
    }>({
        isActive: false,
        abortController: null,
    });

    useEffect(() => {
        if (scanStateRef.current.abortController) {
            scanStateRef.current.abortController.abort();
        }
        setIsScanning(false);
        setScanTimeout(null);
        const currentAbortController = scanStateRef.current.abortController;
        return () => {
            if (currentAbortController) {
                currentAbortController.abort();
            }
        };
    }, [workspaceId]);

    const { startScan, approveTerm, deleteTerm, approveAll } = useHeuristic(workspaceId);

    const blacklist = useLiveQuery(
        async () => {
            const allItems = await db.blacklist.where('workspaceId').equals(workspaceId).toArray();
            return allItems.filter(b => b.source === 'heuristic');
        },
        [workspaceId]
    );

    const rawTermsInternal = useLiveQuery(() => db.heuristicTerms.where('workspaceId').equals(workspaceId).toArray(), [workspaceId]);
    const rawTerms = useMemo(() => rawTermsInternal || [], [rawTermsInternal]);

    const stats = useHeuristicStats(rawTerms);
    const filteredTerms = useHeuristicFilter(rawTerms, search, typeFilter, statusFilter);


    const forensicReport = useMemo<ForensicReport | null>(() => {
        if (rawTerms.length === 0) return null;
        const approved = rawTerms.filter(t => t.isApproved);
        return analyzeHeuristicResults(rawTerms, approved);
    }, [rawTerms]);

    const filteredPendingCount = filteredTerms.filter(t => !t.isApproved).length;

    const rowVirtualizer = useVirtualizer({
        count: filteredTerms.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 72,
        overscan: 10,
    });

    const handleScan = async () => {
        if (scanStateRef.current.isActive) {
            toast.warning("Quét đang chạy, vui lòng chờ...");
            return;
        }

        if (scanTimeout) clearTimeout(scanTimeout);

        setIsScanning(true);
        scanStateRef.current.isActive = true;
        scanStateRef.current.abortController = new AbortController();

        const timeoutId = setTimeout(() => {
            scanStateRef.current.abortController?.abort();
            scanStateRef.current.isActive = false;
            setIsScanning(false);
            toast.error("⏱️ Quét vượt quá thời gian giới hạn (5 phút). Đã dừng.");
        }, 5 * 60 * 1000);

        setScanTimeout(timeoutId);

        try {
            await startScan(
                (current, total, message) => {
                    setProgress({ current, total, message });
                },
                scanStateRef.current.abortController.signal
            );

            if (!scanStateRef.current.abortController.signal.aborted) {
                toast.success("✨ Quét hoàn tất!");
            }
        } catch (error) {
            console.error("[HeuristicTab] Scan error:", error);
        } finally {
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
                <HeuristicHeader
                    workspaceId={workspaceId}
                    stats={stats}
                    pendingCount={filteredPendingCount}
                    isScanning={isScanning}
                    rawTerms={rawTerms}
                    forensicReport={forensicReport}
                    blacklist={blacklist || []}
                    onScan={handleScan}
                    onClearAll={handleClearAll}
                    onApproveAll={() => approveAll(filteredTerms.filter(t => !t.isApproved))}
                />

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
                        </div>
                    </div>
                )}

                <div className="flex flex-col md:flex-row gap-2 shrink-0">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Tìm kiếm thuật ngữ..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            disabled={isScanning}
                            spellCheck={false}
                            className="pl-10 h-10 rounded-xl bg-white border-slate-200 focus:ring-indigo-500 transition-all shadow-sm"
                        />
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 gap-1 overflow-x-auto scrollbar-none">
                        <button
                            onClick={() => setStatusFilter('all')}
                            disabled={isScanning}
                            className={cn(
                                "whitespace-nowrap px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                                statusFilter === 'all' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Tất cả
                            <span className={cn(
                                "text-[10px] px-1.5 rounded-md",
                                statusFilter === 'all' ? "bg-slate-100 text-slate-600" : "bg-slate-200/50 text-slate-400"
                            )}>
                                {stats.total}
                            </span>
                        </button>

                        <button
                            onClick={() => setStatusFilter('pending')}
                            disabled={isScanning}
                            className={cn(
                                "whitespace-nowrap px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                                statusFilter === 'pending' ? "bg-white shadow-sm text-amber-600" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <Clock className="h-3.5 w-3.5" />
                            Pending
                            <span className={cn(
                                "text-[10px] px-1.5 rounded-md",
                                statusFilter === 'pending' ? "bg-amber-50 text-amber-500" : "bg-slate-200/50 text-slate-400"
                            )}>
                                {stats.total - stats.approved}
                            </span>
                        </button>

                        <button
                            onClick={() => setStatusFilter('approved')}
                            disabled={isScanning}
                            className={cn(
                                "whitespace-nowrap px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                                statusFilter === 'approved' ? "bg-white shadow-sm text-emerald-600" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Đã chốt
                            <span className={cn(
                                "text-[10px] px-1.5 rounded-md",
                                statusFilter === 'approved' ? "bg-emerald-50 text-emerald-500" : "bg-slate-200/50 text-slate-400"
                            )}>
                                {stats.approved}
                            </span>
                        </button>

                        <div className="w-px h-4 bg-slate-200 self-center mx-1" />

                        <button
                            onClick={() => setTypeFilter('all')}
                            disabled={isScanning}
                            className={cn(
                                "whitespace-nowrap px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                                typeFilter === 'all' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            <Activity className="h-3.5 w-3.5" />
                            Tất cả loại
                        </button>

                        <button
                            onClick={() => {
                                if (!confirm("⚠️ Dọn sạch toàn bộ thực thể PHỤ (rác, skill/loc cũ) chưa duyệt?")) return;
                                setIsScanning(true);
                                try {
                                    const junk = rawTerms.filter(t => {
                                        const type = (t.type || '').toLowerCase();
                                        return !t.isApproved && type !== 'character' && type !== 'person';
                                    });
                                    db.heuristicTerms.bulkDelete(junk.map(j => j.id!));
                                    toast.success(`🧹 Đã quét sạch ${junk.length} rác!`);
                                } finally {
                                    setIsScanning(false);
                                }
                            }}
                            disabled={isScanning}
                            className="whitespace-nowrap px-4 py-1.5 rounded-lg text-[10px] font-black uppercase text-rose-500 hover:bg-rose-100/50 transition-all flex items-center gap-2 border border-rose-200/30 ml-2"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Dọn rác
                        </button>
                    </div>
                </div>

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
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const currentType = (term.type || '').toLowerCase();
                                                    const nextType = (currentType === 'character' || currentType === 'person') ? 'skill' :
                                                        currentType === 'skill' ? 'location' : 'character';
                                                    db.heuristicTerms.update(term.id!, { type: nextType });
                                                }}
                                                className={cn(
                                                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-90",
                                                    (term.type?.toLowerCase() === 'character' || term.type?.toLowerCase() === 'person') ? "bg-amber-100 text-amber-600" :
                                                        term.type?.toLowerCase() === 'skill' ? "bg-rose-100 text-rose-600" :
                                                            "bg-emerald-100 text-emerald-600"
                                                )}
                                                title="Đổi loại thực thể (Bấm để đổi)"
                                            >
                                                {(term.type?.toLowerCase() === 'character' || term.type?.toLowerCase() === 'person') ? <User className="h-5 w-5" /> :
                                                    term.type?.toLowerCase() === 'skill' ? <Sword className="h-5 w-5" /> :
                                                        <MapPin className="h-5 w-5" />}
                                            </button>

                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-lg font-bold text-slate-900 tracking-tight shrink-0">{term.original}</span>
                                                    <span className={cn(
                                                        "text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter shrink-0 border",
                                                        (term.type?.toLowerCase() === 'character' || term.type?.toLowerCase() === 'person') ? "bg-amber-50 text-amber-600 border-amber-200/50" :
                                                            term.type?.toLowerCase() === 'skill' ? "bg-rose-50 text-rose-600 border-rose-200/50" :
                                                                "bg-emerald-50 text-emerald-600 border-emerald-200/50"
                                                    )}>
                                                        {(term.type?.toLowerCase() === 'character' || term.type?.toLowerCase() === 'person') ? "Nhân vật" :
                                                            term.type?.toLowerCase() === 'skill' ? "Kỹ năng" : "Địa danh"}
                                                    </span>
                                                </div>
                                                <div className="text-sm font-medium text-slate-500 truncate italic">
                                                    {term.translated || "Chưa có bản dịch..."}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-8 shrink-0">
                                            <div className="hidden lg:flex flex-col items-end gap-0.5 text-[11px] font-bold uppercase tracking-tight opacity-70">
                                                <span className="text-slate-400">{term.occurrences} lần</span>
                                                <span className={cn(term.confidence > 80 ? "text-emerald-500" : "text-amber-500")}>
                                                    {term.confidence}%
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    disabled={isScanning}
                                                    className="h-9 w-9 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
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
                                                        className="h-9 px-5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-transform active:scale-95"
                                                        onClick={() => approveTerm(term.id!)}
                                                    >
                                                        Chốt
                                                    </Button>
                                                ) : (
                                                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
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
                </div>
            </div>
        </TooltipProvider>
    );
}
