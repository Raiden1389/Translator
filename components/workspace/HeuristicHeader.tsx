/**
 * HeuristicHeader
 * Header section with stats and action buttons
 */

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
    RotateCw,
    Trash2,
    Sparkles,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HeuristicTerm, BlacklistEntry } from '@/lib/db';
import type { ForensicReport } from '@/lib/gemini/heuristic/forensic-analyzer';
import type { HeuristicStats } from './hooks/useHeuristicStats';
import { HeuristicForensicDialog } from './HeuristicForensicDialog';
import { HeuristicExportDialog } from './HeuristicExportDialog';
import { HeuristicBlacklistDialog } from './HeuristicBlacklistDialog';

interface HeuristicHeaderProps {
    workspaceId: string;
    stats: HeuristicStats;
    pendingCount: number;
    isScanning: boolean;
    isRefining: boolean;
    isRaidenMode: boolean;
    rawTerms: HeuristicTerm[];
    filteredTerms: HeuristicTerm[];
    forensicReport: ForensicReport | null;
    blacklist: BlacklistEntry[];
    onScan: () => void;
    onRefine: () => void;
    onClearAll: () => void;
    onApproveAll: () => void;
}

export function HeuristicHeader({
    workspaceId,
    stats,
    pendingCount,
    isScanning,
    isRefining,
    isRaidenMode,
    rawTerms,
    filteredTerms,
    forensicReport,
    blacklist,
    onScan,
    onRefine,
    onClearAll,
    onApproveAll
}: HeuristicHeaderProps) {
    return (
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

            {/* Action Bar */}
            <div className="flex items-center gap-1.5">
                {/* Scan Button */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={onScan}
                            disabled={isScanning || isRefining}
                            className="h-9 w-9 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                        >
                            {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{isScanning ? 'Đang quét...' : 'Quét lại toàn bộ'}</p>
                    </TooltipContent>
                </Tooltip>

                {/* Forensic Analyzer */}
                <HeuristicForensicDialog forensicReport={forensicReport} />

                {/* Export Debug */}
                <HeuristicExportDialog rawTerms={rawTerms} />

                {/* Blacklist Dialog */}
                <HeuristicBlacklistDialog workspaceId={workspaceId} blacklist={blacklist} />

                {/* Clear All */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={onClearAll}
                            className="h-9 w-9 bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 shadow-sm"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Xóa toàn bộ</p>
                    </TooltipContent>
                </Tooltip>

                {/* AI Refine */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="inline-block">
                            <Button
                                variant={isRaidenMode ? "raiden" : "default"}
                                size="icon"
                                onClick={onRefine}
                                disabled={isScanning || isRefining || pendingCount === 0}
                                className={cn(
                                    "h-9 w-9 shadow-sm",
                                    !isRaidenMode && "bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                                )}
                            >
                                {isRefining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            </Button>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>AI Lọc Rác ({pendingCount})</p>
                    </TooltipContent>
                </Tooltip>

                {/* Approve All */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="inline-block">
                            <Button
                                size="icon"
                                onClick={onApproveAll}
                                disabled={isScanning || isRefining || pendingCount === 0}
                                className="h-9 w-9 bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-sm"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                            </Button>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Chốt hết ({pendingCount})</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
}
