"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search, ChevronLeft, ChevronRight,
    FileText, LayoutGrid, LayoutList, Zap,
    Clock, ShieldCheck, Eraser,
    Download, UploadCloud, ScanLine, SlidersHorizontal, RotateCw, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import { useWorkspaceTokens } from "../hooks/useWorkspaceTokens";

interface ChapterListHeaderProps {
    workspaceId: string; // Added for token tracking
    totalChapters: number;
    searchTerm: string;
    setSearchTerm: (value: string) => void;
    filterStatus: "all" | "draft" | "translated";
    setFilterStatus: (value: "all" | "draft" | "translated") => void;
    currentPage: number;
    setCurrentPage: (value: number) => void;
    totalPages: number;
    onExport: () => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    importing: boolean;
    viewMode: "grid" | "table";
    onViewModeChange: (mode: "grid" | "table") => void;
    itemsPerPage: number;
    setItemsPerPage: (value: number) => void;
    lastReadChapterId?: number;
    onReadContinue?: (id: number) => void;
    onHistoryOpen: () => void;
    onScan: () => void;
    onApplyCorrections: () => void;
    onClearCache: () => void;
    onImportJSON: () => void;
    onRefresh?: () => void;
    processing?: boolean;
    onSelectRange?: (start: number, end: number) => void;
    onFixTitles?: () => void; // New: Fix Chinese characters in titles
}

export function ChapterListHeader({
    workspaceId,
    totalChapters,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    currentPage,
    setCurrentPage,
    totalPages,
    onExport,
    fileInputRef,
    onFileUpload,
    importing,
    viewMode,
    onViewModeChange,
    itemsPerPage,
    setItemsPerPage,
    lastReadChapterId,
    onReadContinue,
    onHistoryOpen,
    onScan,
    onApplyCorrections,
    onClearCache,
    onImportJSON,
    onRefresh,
    processing,
    onSelectRange,
    onFixTitles
}: ChapterListHeaderProps) {
    const [rangeValue, setRangeValue] = React.useState("");
    const tokenStats = useWorkspaceTokens(workspaceId);

    // Suggestion #5: Real-time validation feedback
    const isRangeValid = React.useMemo(() => {
        if (!rangeValue) return true;
        const rangeRegex = /^(\d+)(-\d+)?$/;
        return rangeRegex.test(rangeValue);
    }, [rangeValue]);

    return (
        <div className="sticky top-0 z-30 bg-background/80 border-b border-border mb-6 -mx-8 px-8 py-3 backdrop-blur-md transition-all">
            <div className="flex items-center justify-between gap-4">
                {/* Left: Info, Search & Quick Select */}
                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                    <div className="flex flex-col min-w-[140px] shrink-0">
                        <h2 className="text-xs font-black text-foreground flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-primary" />
                            <span className="truncate">{totalChapters} chương</span>
                        </h2>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="text-[10px] font-bold flex items-center gap-2 mt-0.5 cursor-help">
                                    <span className="text-indigo-500">{tokenStats.total.toLocaleString()}t</span>
                                    <span className="text-muted-foreground">•</span>
                                    <span className="text-emerald-500">${tokenStats.cost.toFixed(4)}</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-[10px] font-bold font-mono">
                                <div className="space-y-1">
                                    <div className="font-bold text-xs mb-2">💰 Token Usage</div>
                                    <div>Input: {tokenStats.input.toLocaleString()}t (${tokenStats.costBreakdown.input.toFixed(4)})</div>
                                    <div>Output: {tokenStats.output.toLocaleString()}t (${tokenStats.costBreakdown.output.toFixed(4)})</div>
                                    <div className="border-t border-border/40 pt-1 mt-1">
                                        <div className="font-bold">Total: {tokenStats.total.toLocaleString()}t</div>
                                        <div className="text-emerald-400">Cost: ${tokenStats.cost.toFixed(4)}</div>
                                    </div>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                        {lastReadChapterId && onReadContinue && (
                            <button
                                onClick={() => onReadContinue(lastReadChapterId)}
                                className="text-[10px] text-emerald-500 hover:text-emerald-400 font-bold flex items-center gap-1 mt-0.5"
                            >
                                <Zap className="h-2.5 w-2.5 animate-pulse" /> Đọc tiếp
                            </button>
                        )}
                    </div>

                    <div className="h-8 w-px bg-border/40 mx-1 hidden lg:block shrink-0" />

                    <div className={cn(
                        "flex-1 flex items-center bg-muted/20 border rounded-xl overflow-hidden focus-within:bg-background focus-within:ring-1 transition-all max-w-[380px] min-w-[140px]",
                        isRangeValid ? "border-border/40 focus-within:ring-primary/20" : "border-rose-500/50 focus-within:ring-rose-500/20"
                    )}>
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/30" />
                            <Input
                                placeholder="Tìm kiếm..."
                                aria-label="Tìm kiếm chương"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 w-full bg-transparent border-0 text-xs h-9 rounded-none focus-visible:ring-0"
                            />
                        </div>

                        <div className="h-4 w-px bg-border/40" />

                        <div className="relative w-[70px] sm:w-[90px] group shrink-0">
                            <div className="absolute left-2.5 top-2.5 text-[10px] font-black text-muted-foreground/30 pointer-events-none group-focus-within:text-primary transition-colors">#</div>
                            <Input
                                placeholder="1-10"
                                aria-label="Chọn dải chương nhanh"
                                value={rangeValue}
                                onChange={(e) => setRangeValue(e.target.value)}
                                className="pl-6 pr-1 w-full bg-transparent border-0 text-[11px] font-black h-9 rounded-none focus-visible:ring-0 placeholder:font-bold placeholder:text-muted-foreground/20"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = e.currentTarget.value.trim();
                                        if (val.includes('-')) {
                                            const [start, end] = val.split('-').map(n => parseInt(n));
                                            if (!isNaN(start) && !isNaN(end) && end >= start) {
                                                onSelectRange?.(start, end);
                                                toast.success(`Đã chọn chương ${start}-${end}`);
                                                setRangeValue("");
                                                e.currentTarget.blur();
                                            }
                                        } else {
                                            const num = parseInt(val);
                                            if (!isNaN(num)) {
                                                onSelectRange?.(num, num);
                                                toast.success(`Đã chọn chương ${num}`);
                                                setRangeValue("");
                                                e.currentTarget.blur();
                                            }
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Right: Actions & Utils */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        {/* 1. Simple Pagination Hub - Suggestion #3: Increase contrast & Suggestion #2: Grouping list logic */}
                        <div className="flex items-center bg-muted/20 px-1 py-1 rounded-full border border-border/30 h-9">
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="h-7 w-7 text-muted-foreground disabled:opacity-20 hover:text-primary rounded-full"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-[10px] font-black text-foreground min-w-[70px] text-center tracking-tighter">
                                {totalChapters === 0 ? "0-0" : `${((currentPage - 1) * itemsPerPage) + 1}-${Math.min(currentPage * itemsPerPage, totalChapters)}`}
                            </span>
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className="h-7 w-7 text-muted-foreground disabled:opacity-20 hover:text-primary rounded-full"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* 2. Collapsible View Controls (Popover) */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 px-3 gap-2 rounded-xl bg-muted/20 border-border/50 hover:bg-background transition-all hover:scale-105 active:scale-95 group"
                                >
                                    <SlidersHorizontal className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden lg:inline">Tùy chọn</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[320px] p-2 bg-popover/90 backdrop-blur-xl border-border/40 shadow-2xl rounded-2xl" align="end">
                                <div className="space-y-4 p-3">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 px-1">Lọc trạng thái</label>
                                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                                            <SelectTrigger className="h-10 w-full bg-muted/30 border-border/40 text-xs font-bold rounded-xl focus:ring-1 focus:ring-primary/30">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all" className="text-xs font-bold">TẤT CẢ CHƯƠNG</SelectItem>
                                                <SelectItem value="draft" className="text-xs font-bold">CHƯA DỊCH</SelectItem>
                                                <SelectItem value="translated" className="text-xs font-bold">ĐÃ DỊCH</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 px-1">Hiển thị mỗi trang</label>
                                        <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(parseInt(v))}>
                                            <SelectTrigger className="h-10 w-full bg-muted/30 border-border/40 text-xs font-bold rounded-xl focus:ring-1 focus:ring-primary/30">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[20, 50, 100, 200, 500].map(size => (
                                                    <SelectItem key={size} value={size.toString()} className="text-xs font-bold">{size} chương / trang</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 px-1">Chế độ xem</span>
                                        <div className="flex items-center bg-muted/30 p-1 rounded-xl border border-border/40">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={cn(
                                                    "h-8 px-4 text-[10px] font-bold rounded-lg gap-2 transition-all",
                                                    viewMode === "grid" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:bg-background/50"
                                                )}
                                                onClick={() => onViewModeChange("grid")}
                                            >
                                                <LayoutGrid className="h-3.5 w-3.5" /> Lưới
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={cn(
                                                    "h-8 px-4 text-[10px] font-bold rounded-lg gap-2 transition-all",
                                                    viewMode === "table" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:bg-background/50"
                                                )}
                                                onClick={() => onViewModeChange("table")}
                                            >
                                                <LayoutList className="h-3.5 w-3.5" /> Bảng
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="h-6 w-px bg-border/40 mx-1 sm:mx-2 shrink-0" />

                    {/* Suggestion #4: Action Hub - Add Glow effect and 8th slot Refresh button */}
                    {/* Add Issue #1: Spam Click Protection & #5: Visual Feedback */}
                    <div className="grid grid-cols-4 gap-1 bg-muted/40 p-1 rounded-2xl border border-border/40 overflow-hidden shadow-inner w-fit shrink-0">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-xl hover:bg-background hover:shadow-primary/20 text-slate-500 hover:text-slate-700 transition-all active:scale-95 group disabled:opacity-50"
                                    onClick={onClearCache}
                                    disabled={processing || importing}
                                >
                                    <Eraser className={cn("h-4 w-4 group-hover:scale-110 transition-transform", processing && "animate-pulse")} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[10px] font-bold">Dọn HTML rác</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-xl hover:bg-background hover:shadow-primary/20 text-blue-500 hover:text-blue-600 transition-all active:scale-95 group disabled:opacity-50"
                                    onClick={onExport}
                                    disabled={processing || importing}
                                >
                                    <Download className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[10px] font-bold">Save JSON</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-xl hover:bg-background hover:shadow-primary/20 text-emerald-500 hover:text-emerald-600 transition-all active:scale-95 group disabled:opacity-50"
                                    onClick={onImportJSON}
                                    disabled={processing || importing}
                                >
                                    <UploadCloud className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[10px] font-bold">Load JSON</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-xl hover:bg-background hover:shadow-primary/20 text-rose-500 hover:text-rose-600 transition-all active:scale-95 disabled:opacity-50 group"
                                    onClick={onApplyCorrections}
                                    disabled={importing || processing}
                                >
                                    <ShieldCheck className={cn("h-4 w-4 group-hover:scale-110 transition-transform", (importing || processing) && "animate-pulse")} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[10px] font-bold">Cải chính</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-xl hover:bg-background hover:shadow-primary/20 text-orange-500 hover:text-orange-600 transition-all active:scale-95 group disabled:opacity-50"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={processing || importing}
                                >
                                    <FileText className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-[10px] font-bold">Nạp thêm chương (Txt/Epub/Json)</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-xl hover:bg-background hover:shadow-primary/20 text-sky-500 hover:text-sky-600 transition-all active:scale-95 group disabled:opacity-50"
                                    onClick={onFixTitles}
                                    disabled={processing || importing}
                                >
                                    <Sparkles className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-[10px] font-bold">Sửa Title (Hán tự)</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-xl hover:bg-background hover:shadow-primary/20 text-indigo-500 hover:text-indigo-600 transition-all active:scale-95 group disabled:opacity-50"
                                    onClick={onScan}
                                    disabled={processing || importing}
                                >
                                    <ScanLine className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-[10px] font-bold">Quét AI</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-xl hover:bg-background hover:shadow-primary/20 text-purple-500 hover:text-purple-600 transition-all active:scale-95 group disabled:opacity-50"
                                    onClick={onHistoryOpen}
                                    disabled={processing || importing}
                                >
                                    <Clock className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-[10px] font-bold">Lịch sử</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-xl hover:bg-background hover:shadow-primary/20 text-amber-500 hover:text-amber-600 transition-all active:scale-95 group disabled:opacity-50"
                                    onClick={onRefresh}
                                    disabled={processing || importing}
                                >
                                    <RotateCw className={cn("h-4 w-4 group-hover:rotate-180 transition-all duration-500", processing && "animate-spin")} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-[10px] font-bold">Tải lại data</TooltipContent>
                        </Tooltip>
                    </div>

                    <input
                        type="file"
                        accept=".txt,.text,.html,.epub,.json"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={onFileUpload}
                    />
                </div>
            </div>
        </div>
    );
}
