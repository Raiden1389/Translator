"use client";

import React from "react";
import {
    Zap,
    RotateCw,
    Trash2,
    CheckCircle,
    Info,
    AlertCircle,
    Sparkles
} from "lucide-react";
import { HeuristicForensicDialog } from "../HeuristicForensicDialog";
import { HeuristicExportDialog } from "../HeuristicExportDialog";
import { HeuristicBlacklistDialog } from "../HeuristicBlacklistDialog";
import type { HeuristicTerm, BlacklistEntry } from "@/lib/db";
import type { ForensicReport } from "@/lib/gemini/heuristic/forensic-analyzer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface HeuristicScannerProps {
    isScanning: boolean;
    progress: { current: number; total: number; message: string };
    stats: { total: number; approved: number };
    onScan: () => void;
    onAiRefine: () => void;
    onClearAll: () => void;
    onApproveAll: () => void;
    rawTerms: HeuristicTerm[];
    forensicReport: ForensicReport | null;
    blacklist: BlacklistEntry[];
    workspaceId: string;
}

export function HeuristicScanner({
    isScanning,
    progress,
    stats,
    onScan,
    onAiRefine,
    onClearAll,
    onApproveAll,
    rawTerms,
    forensicReport,
    blacklist,
    workspaceId
}: HeuristicScannerProps) {
    const percent = Math.round((progress.current / (progress.total || 1)) * 100);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Main Stats Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Zap className={cn("w-6 h-6 text-primary", isScanning && "animate-pulse")} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tight text-foreground uppercase">Discovery Radar</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
                                Heuristic Engine v2.5
                            </span>
                            <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                            <span className="text-xs font-medium text-primary">
                                {stats.approved} / {stats.total} Duyệt
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearAll}
                        disabled={isScanning || stats.total === 0}
                        className="h-9 px-4 text-[10px] font-black uppercase tracking-widest hover:bg-destructive/10 hover:text-destructive text-muted-foreground/40 transition-all rounded-xl border border-transparent hover:border-destructive/20"
                    >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        Xóa sạch rác
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onApproveAll}
                        disabled={isScanning || stats.total - stats.approved === 0}
                        className="h-9 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all rounded-xl border-border/40 hover:bg-muted"
                    >
                        <CheckCircle className="w-3.5 h-3.5 mr-2" />
                        Duyệt nhanh (All)
                    </Button>

                    <div className="w-px h-6 bg-border/40 mx-1" />

                    {/* Debug Tools Group */}
                    <div className="flex items-center gap-1.5 p-1 bg-muted/30 rounded-xl border border-border/40">
                        <HeuristicForensicDialog forensicReport={forensicReport} />
                        <HeuristicExportDialog rawTerms={rawTerms} />
                        <HeuristicBlacklistDialog workspaceId={workspaceId} blacklist={blacklist} />
                    </div>

                    <div className="w-px h-6 bg-border/40 mx-1" />

                    <Button
                        variant="default"
                        size="sm"
                        onClick={onAiRefine}
                        disabled={isScanning}
                        className={cn(
                            "h-9 px-6 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl shadow-lg transition-all active:scale-95 border-none",
                            isScanning
                                ? "bg-muted text-muted-foreground cursor-not-allowed"
                                : "bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-indigo-500/20"
                        )}
                    >
                        {isScanning ? (
                            <>
                                <RotateCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                                Đang tinh lọc...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-3.5 h-3.5 mr-2" />
                                AI NER REFINE ✨
                            </>
                        )}
                    </Button>

                    <Button
                        variant="default"
                        size="sm"
                        onClick={onScan}
                        disabled={isScanning}
                        className={cn(
                            "h-9 px-6 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl shadow-lg transition-all active:scale-95 border-none",
                            isScanning
                                ? "bg-muted text-muted-foreground cursor-not-allowed"
                                : "bg-primary text-primary-foreground shadow-primary/20"
                        )}
                    >
                        {isScanning ? (
                            <>
                                <RotateCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                                Đang quét...
                            </>
                        ) : (
                            <>
                                <Zap className="w-3.5 h-3.5 mr-2" />
                                START RADAR SCAN
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Progress Display */}
            <div className={cn(
                "overflow-hidden transition-all duration-500 ease-in-out",
                isScanning ? "max-h-32 opacity-100" : "max-h-0 opacity-0"
            )}>
                <div className="p-5 bg-muted/30 border border-border/40 rounded-3xl space-y-3 shadow-inner relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <RotateCw className="w-12 h-12 animate-spin text-primary" />
                    </div>

                    <div className="flex justify-between items-end relative z-10">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">
                                <Zap className="w-3 h-3" />
                                Engine Signal
                            </div>
                            <h4 className="text-sm font-bold text-foreground/80 tracking-tight">
                                {progress.message || "Đang khởi động radar..."}
                            </h4>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-black text-primary tracking-tighter tabular-nums">
                                {percent}%
                            </span>
                        </div>
                    </div>

                    <Progress value={percent} className="h-2 rounded-full bg-border/20 border border-border/10 overflow-hidden shadow-inner" />

                    <div className="flex items-center gap-3 pt-1">
                        <div className="flex-1 h-px bg-border/20" />
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest whitespace-nowrap">
                            <AlertCircle className="w-3 h-3" />
                            Đang xử lý dữ liệu quy mô lớn...
                        </div>
                        <div className="flex-1 h-px bg-border/20" />
                    </div>
                </div>
            </div>

            {/* Zero results warning */}
            {!isScanning && stats.total === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in duration-700">
                    <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
                        <Info className="w-8 h-8 text-muted-foreground/20" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground/60 max-w-[300px]">
                        Radar chưa có dữ liệu. Hãy bấm &quot;START RADAR SCAN&quot; để bắt đầu quét toàn bộ vương quốc này.
                    </p>
                </div>
            )}
        </div>
    );
}
