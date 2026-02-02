"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useHeuristic } from "./hooks/useHeuristic";
import { suggestHanViet } from "@/lib/gemini/heuristic/utils";
import { Button } from "@/components/ui/button";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
    Search,
    CheckCircle2,
    Trash2,
    Sparkles,
    Activity,
    User,
    Sword,
    MapPin,
    Loader2,
    Info,
    RotateCw,
    DownloadCloud,
    Ghost,
    X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRaiden } from "@/components/theme/RaidenProvider";
import { writeTextFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export function HeuristicTab({ workspaceId }: { workspaceId: string }) {
    const { isRaidenMode } = useRaiden();
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<'all' | 'character' | 'skill' | 'location' | 'unknown'>('all');
    const [isScanning, setIsScanning] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, message: "" });
    const [refineLogs, setRefineLogs] = useState<string[]>([]);
    const [isBlacklistOpen, setIsBlacklistOpen] = useState(false);
    const parentRef = useRef<HTMLDivElement>(null);

    const isMounted = useRef(true);
    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    const { startScan, runAiRefine, approveTerm, deleteTerm, approveAll, removeFromBlacklist, clearBlacklist } = useHeuristic(workspaceId);

    const blacklist = useLiveQuery(
        async () => {
            // Lấy toàn bộ blacklist của workspace này để đảm bảo không sót từ nào (kể cả từ cũ chưa có source)
            const all = await db.blacklist.where('workspaceId').equals(workspaceId).toArray();
            // Lọc: Ưu tiên 'heuristic' và các từ chưa phân loại (manual/null)
            return all.filter(b => b.source === 'heuristic' || b.source === 'manual' || !b.source);
        },
        [workspaceId]
    );

    const termsFromDb = useLiveQuery(
        () => db.heuristicTerms.where('workspaceId').equals(workspaceId).toArray(),
        [workspaceId]
    );
    const rawTerms = useMemo(() => termsFromDb || [], [termsFromDb]);

    const stats = useMemo(() => {
        const counts = { total: 0, character: 0, skill: 0, location: 0, unknown: 0, approved: 0 };
        for (let i = 0; i < rawTerms.length; i++) {
            const t = rawTerms[i];
            if (t.isGarbage) continue;

            counts.total++;
            if (t.isApproved) counts.approved++;

            const type = (t.type || 'unknown').toLowerCase();
            if (type === 'character') counts.character++;
            else if (type === 'skill') counts.skill++;
            else if (type === 'location') counts.location++;
            else counts.unknown++;
        }
        return counts;
    }, [rawTerms]);

    const filteredTerms = useMemo(() => {
        const lowerSearch = search.toLowerCase();
        return rawTerms
            .filter(t => {
                if (t.isGarbage) return false;
                const matchesSearch = !search ||
                    t.original.toLowerCase().includes(lowerSearch) ||
                    (t.translated || '').toLowerCase().includes(lowerSearch);
                const type = (t.type || 'unknown').toLowerCase();
                const matchesType = filter === 'all' ||
                    (filter === 'unknown'
                        ? (type !== 'character' && type !== 'skill' && type !== 'location')
                        : type === filter);
                return matchesSearch && matchesType;
            })
            .sort((a, b) => (b.occurrences || 0) - (a.occurrences || 0));
    }, [rawTerms, search, filter]);

    const pendingCount = stats.total - stats.approved;

    const rowVirtualizer = useVirtualizer({
        count: filteredTerms.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 72,
        overscan: 10,
    });

    const handleScan = async () => {
        setIsScanning(true);
        await startScan((current, total, message) => {
            if (isMounted.current) {
                setProgress({ current, total, message });
            }
        });
        if (isMounted.current) setIsScanning(false);
    };

    const handleRefine = async () => {
        setIsRefining(true);
        setRefineLogs(["🚀 Khởi động AI..."]);
        await runAiRefine((msg) => {
            if (isMounted.current) {
                setRefineLogs(prev => [...prev.slice(-4), msg]);
            }
        });
        setTimeout(() => {
            if (isMounted.current) setIsRefining(false);
        }, 2000);
    };

    const handleDebugExport = async () => {
        try {
            const content = filteredTerms.map(t => {
                const hv = suggestHanViet(t.original || '');
                const type = (t.type || 'unknown').toUpperCase();
                const translated = t.translated || '??';
                const occurrences = t.occurrences || 0;
                const confidence = t.confidence || 0;
                return `[${type}] ${t.original} (${hv}) -> ${translated} (${occurrences} lần, ${confidence}%)`;
            }).join('\n');

            const filename = `heuristic_debug_${new Date().getTime()}.txt`;
            await writeTextFile(filename, content, { baseDir: BaseDirectory.Desktop });
            toast.success(`✅ Đã xuất ${filteredTerms.length} terms ra Desktop/${filename}`);
        } catch (err) {
            console.error('Export error:', err);
            toast.error("❌ Lỗi xuất file: " + String(err));
        }
    };

    const handleExportBlacklist = async () => {
        if (!blacklist || blacklist.length === 0) {
            toast.error("Blacklist đang trống!");
            return;
        }
        try {
            const content = blacklist.map(b => b.word).join('\n');
            const filename = `heuristic_blacklist_${new Date().getTime()}.txt`;
            await writeTextFile(filename, content, { baseDir: BaseDirectory.Desktop });
            toast.success(`✅ Đã xuất Blacklist ra Desktop/${filename}`);
        } catch (err) {
            toast.error("❌ Lỗi xuất Blacklist: " + String(err));
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
        <div className="h-[calc(100vh-160px)] flex flex-col space-y-4 animate-in fade-in duration-500">
            {/* Header section - Light Friendly */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 px-1 pt-2">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3 text-slate-900 border-0">
                        Heuristic Center
                        <div className="flex items-center bg-slate-100 rounded-full px-3 py-1 gap-2 border border-slate-200/50">
                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-tighter">Đã duyệt</span>
                            <span className="text-sm font-black text-indigo-600">{stats.approved}</span>
                            <span className="text-[11px] font-black text-slate-300">/</span>
                            <span className="text-sm font-black text-slate-400">{stats.total}</span>
                        </div>
                    </h2>
                    <p className="text-slate-500 text-sm font-medium">
                        Phát hiện và quản lý thuật ngữ tự động.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearAll}
                        className="h-9 gap-2 font-bold px-4 bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 shadow-sm"
                        title="Xóa toàn bộ dữ liệu heuristic"
                    >
                        <Trash2 className="h-4 w-4" />
                        Xóa Hết
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDebugExport}
                        className="h-9 gap-2 font-bold px-4 bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-900 shadow-sm"
                        title="Xuất danh sách ra file TXT để debug"
                    >
                        <DownloadCloud className="h-4 w-4" />
                        Xuất Debug
                    </Button>

                    <Dialog open={isBlacklistOpen} onOpenChange={setIsBlacklistOpen}>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 gap-2 font-bold px-4 bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100 shadow-sm"
                            >
                                <Ghost className="h-4 w-4" />
                                Blacklist
                                {blacklist && blacklist.length > 0 && (
                                    <Badge variant="secondary" className="bg-orange-200 text-orange-700 ml-1 px-1.5 h-4">
                                        {blacklist.length}
                                    </Badge>
                                )}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader className="flex flex-row items-center justify-between space-y-0">
                                <DialogTitle className="flex items-center gap-2">
                                    <Ghost className="h-5 w-5 text-orange-500" />
                                    Danh sách Blacklist
                                </DialogTitle>
                                {blacklist && blacklist.length > 0 && (
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleExportBlacklist}
                                            className="h-8 gap-2 font-bold px-3 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                        >
                                            <DownloadCloud className="h-4 w-4" />
                                            Xuất TXT
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                if (window.confirm("Bạn có chắc chắn muốn xóa sạch Blacklist Heuristics?")) {
                                                    clearBlacklist();
                                                }
                                            }}
                                            className="h-8 gap-2 font-bold px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Xóa Sạch
                                        </Button>
                                    </div>
                                )}
                            </DialogHeader>
                            <div className="max-h-[400px] overflow-auto py-4 space-y-2">
                                {(!blacklist || blacklist.length === 0) ? (
                                    <div className="text-center py-10 text-slate-400 italic font-medium">
                                        Chưa có từ nào bị chặn.
                                    </div>
                                ) : (
                                    blacklist.map((item: any) => (
                                        <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 group">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 font-mono text-base">{item.word}</span>
                                                <span className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">
                                                    Đã chặn vào {new Date(item.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all rounded-lg"
                                                onClick={() => removeFromBlacklist(item.id!)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="text-[11px] text-slate-400 text-center italic">
                                Các từ trong danh sách này sẽ bị Scanner bỏ qua hoàn toàn.
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleScan}
                        disabled={isScanning || isRefining}
                        className="h-9 gap-2 font-bold px-4 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                    >
                        {isScanning ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : <RotateCw className="h-4 w-4 text-slate-400" />}
                        {isScanning ? "Đang quét..." : "Quét Lại"}
                    </Button>
                    <Button
                        variant={isRaidenMode ? "raiden" : "default"}
                        size="sm"
                        onClick={handleRefine}
                        disabled={isScanning || isRefining || pendingCount === 0}
                        className={cn(
                            "h-9 gap-2 font-bold px-4 shadow-sm",
                            !isRaidenMode && "bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                        )}
                    >
                        {isRefining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        AI Lọc Rác
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => approveAll(filteredTerms.filter(t => !t.isApproved))}
                        disabled={isScanning || isRefining || pendingCount === 0}
                        className="h-9 gap-2 font-bold px-4 bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-sm"
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        Chốt Hết
                    </Button>
                </div>
            </div>

            {/* AI Console / Progress bar */}
            {(isScanning || isRefining) && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm shrink-0 space-y-3">
                    {isScanning && (
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
                    )}
                    {isRefining && (
                        <div className="space-y-1.5 font-mono text-[11px] text-slate-600">
                            {refineLogs.map((log, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="text-indigo-400 font-bold shrink-0">AI:</span>
                                    <span className="truncate">{log}</span>
                                </div>
                            ))}
                        </div>
                    )}
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
                        className="pl-10 h-10 rounded-xl bg-white border-slate-200 focus:ring-indigo-500 transition-all shadow-sm"
                    />
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                    {[
                        { id: 'all', label: 'Tất cả', count: stats.total },
                        { id: 'character', label: 'Nhân vật', icon: User, count: stats.character },
                        { id: 'skill', label: 'Chiêu thức', icon: Sword, count: stats.skill },
                        { id: 'location', label: 'Địa danh', icon: MapPin, count: stats.location },
                        { id: 'unknown', label: 'Khác', icon: Info, count: stats.unknown },
                    ].map((btn) => (
                        <button
                            key={btn.id}
                            onClick={() => setFilter(btn.id as typeof filter)}
                            className={cn(
                                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                                filter === btn.id
                                    ? "bg-white shadow-sm text-indigo-600"
                                    : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                            )}
                        >
                            {btn.icon && <btn.icon className="h-3.5 w-3.5" />}
                            {btn.label}
                            <span className={cn(
                                "text-[10px] px-1.5 rounded-md",
                                filter === btn.id ? "bg-indigo-50 text-indigo-500" : "bg-slate-200/50 text-slate-400"
                            )}>
                                {btn.count}
                            </span>
                        </button>
                    ))}
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
                                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                                            term.type === 'character' && "bg-amber-100 text-amber-600",
                                            term.type === 'skill' && "bg-blue-100 text-blue-600",
                                            term.type === 'location' && "bg-emerald-100 text-emerald-600",
                                            term.type === 'unknown' && "bg-slate-100 text-slate-500"
                                        )}>
                                            {term.type === 'character' && <User className="h-5 w-5" />}
                                            {term.type === 'skill' && <Sword className="h-5 w-5" />}
                                            {term.type === 'location' && <MapPin className="h-5 w-5" />}
                                            {term.type === 'unknown' && <Info className="h-5 w-5" />}
                                        </div>

                                        <div className="flex flex-col gap-0.5 min-w-0">
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-lg font-bold text-slate-900 tracking-tight shrink-0">{term.original}</span>
                                                <Badge variant="secondary" className="text-[9px] font-black uppercase px-2 h-4 scale-90 border-0 bg-slate-100 text-slate-500">
                                                    {term.type}
                                                </Badge>
                                            </div>
                                            <div className="text-sm font-medium text-slate-500 truncate italic">
                                                {term.translated || "Chưa có bản dịch..."}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8 shrink-0">
                                        <div className="hidden lg:flex flex-col items-end gap-0.5 text-[11px] font-bold uppercase tracking-tight opacity-70">
                                            <span className="text-slate-400">{term.occurrences} lần xuât hiện</span>
                                            <span className={cn(term.confidence > 80 ? "text-emerald-500" : "text-amber-500")}>
                                                Độ tin cậy: {term.confidence}%
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
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
                                                    className="h-9 px-5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-transform active:scale-95"
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
    );
}
