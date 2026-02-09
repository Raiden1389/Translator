/**
 * HeuristicHeader
 * Header section with stats and action buttons
 */

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
    RotateCw,
    Trash2,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import type { HeuristicTerm, BlacklistEntry } from '@/lib/db';
import type { ForensicReport } from '@/lib/gemini/heuristic/forensic-analyzer';
import type { HeuristicStats } from './hooks/useHeuristicStats';
import { HeuristicForensicDialog } from './HeuristicForensicDialog';
import { HeuristicExportDialog } from './HeuristicExportDialog';
import { HeuristicBlacklistDialog } from './intelligence/HeuristicBlacklistDialog';

interface HeuristicHeaderProps {
    workspaceId: string;
    stats: HeuristicStats;
    pendingCount: number;
    isScanning: boolean;
    rawTerms: HeuristicTerm[];
    forensicReport: ForensicReport | null;
    blacklist: BlacklistEntry[];
    onScan: () => void;
    onClearAll: () => void;
    onApproveAll: () => void;
}

export function HeuristicHeader({
    workspaceId,
    stats,
    pendingCount,
    isScanning,
    rawTerms,
    forensicReport,
    blacklist,
    onScan,
    onClearAll,
    onApproveAll
}: HeuristicHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 px-1 pt-2">
            <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3 text-foreground border-0">
                    Trung tâm Thuật ngữ
                    <div className="flex items-center bg-muted rounded-full px-3 py-1 gap-2 border border-border/50">
                        <span className="text-[11px] font-black text-muted-foreground uppercase tracking-tighter">Thuật ngữ</span>
                        <span className="text-sm font-black text-accent">{stats.total}</span>
                    </div>
                </h2>
                <p className="text-muted-foreground text-sm font-medium">
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
                            disabled={isScanning}
                            className="h-9 w-9 bg-card border-border text-foreground hover:bg-muted hover:text-foreground shadow-sm"
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
                            className="h-9 w-9 bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground shadow-sm transition-all"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Xóa toàn bộ</p>
                    </TooltipContent>
                </Tooltip>



                {/* Approve All */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="inline-block">
                            <Button
                                size="icon"
                                onClick={onApproveAll}
                                disabled={isScanning || pendingCount === 0}
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
