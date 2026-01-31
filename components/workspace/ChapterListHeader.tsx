"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search, ChevronLeft, ChevronRight,
    FileText, LayoutGrid, LayoutList, Zap,
    Clock, ShieldCheck, Eraser,
    Download, UploadCloud, ScanLine
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChapterListHeaderProps {
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
}

export function ChapterListHeader({
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
    onImportJSON
}: ChapterListHeaderProps) {
    return (
        <div className="sticky top-0 z-30 bg-background/80 border-b border-border mb-6 -mx-8 px-8 py-3 backdrop-blur-md transition-all">
            <div className="flex items-center justify-between gap-4">
                {/* Left: Info & Search */}
                <div className="flex items-center gap-4 flex-1">
                    <div className="flex flex-col">
                        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            {totalChapters} chương
                        </h2>
                        {lastReadChapterId && onReadContinue && (
                            <button
                                onClick={() => onReadContinue(lastReadChapterId)}
                                className="text-[10px] text-emerald-500 hover:text-emerald-400 font-bold flex items-center gap-1 mt-0.5"
                            >
                                <Zap className="h-3 w-3 animate-pulse" /> Đọc tiếp
                            </button>
                        )}
                    </div>

                    <div className="h-8 w-px bg-border/40 mx-2 hidden md:block" />

                    <div className="relative flex-1 max-w-[320px]">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/40" />
                        <Input
                            placeholder="Tìm kiếm chương nhanh..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 w-full bg-muted/20 border-border/50 text-foreground placeholder:text-muted-foreground/30 h-9 rounded-xl focus:bg-background transition-all"
                        />
                    </div>
                </div>

                {/* Right: Actions & Utils */}
                <div className="flex items-center gap-2">
                    {/* View Controls Group */}
                    <div className="flex items-center bg-muted/30 p-0.5 rounded-xl border border-border/40 mr-2">
                        <Select
                            value={filterStatus}
                            onValueChange={(value: "all" | "draft" | "translated") => setFilterStatus(value)}
                        >
                            <SelectTrigger className="h-7 w-[95px] bg-transparent border-0 text-[10px] font-black uppercase tracking-widest focus:ring-0">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border text-popover-foreground">
                                <SelectItem value="all" className="text-[11px] font-bold">TẤT CẢ</SelectItem>
                                <SelectItem value="draft" className="text-[11px] font-bold">CHƯA DỊCH</SelectItem>
                                <SelectItem value="translated" className="text-[11px] font-bold">ĐÃ DỊCH</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="w-px h-4 bg-border/40 mx-0.5" />

                        <Select
                            value={itemsPerPage.toString()}
                            onValueChange={(value) => setItemsPerPage(parseInt(value))}
                        >
                            <SelectTrigger className="h-7 w-[80px] bg-transparent border-0 text-[10px] font-black uppercase tracking-widest focus:ring-0">
                                <SelectValue placeholder="Per Page" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border text-popover-foreground">
                                {[20, 50, 100, 200, 500].map(size => (
                                    <SelectItem key={size} value={size.toString()} className="text-[11px] font-bold">
                                        {size} / PAGE
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="w-px h-4 bg-border/40 mx-1" />

                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-7 w-7 rounded-lg",
                                viewMode === "grid" ? "bg-background shadow-xs text-primary" : "text-muted-foreground"
                            )}
                            onClick={() => onViewModeChange("grid")}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-7 w-7 rounded-lg",
                                viewMode === "table" ? "bg-background shadow-xs text-primary" : "text-muted-foreground"
                            )}
                            onClick={() => onViewModeChange("table")}
                        >
                            <LayoutList className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    {/* Action Hub - Missing feature restoration (2-row Grid Layout) */}
                    <div className="grid grid-cols-3 gap-1 bg-muted/40 p-1.5 rounded-2xl border border-border/40 mx-1 overflow-hidden shadow-inner w-fit">
                        {/* Top Row */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-xl hover:bg-background hover:shadow-md text-slate-500 transition-all hover:scale-110 active:scale-95"
                                    onClick={onClearCache}
                                >
                                    <Eraser className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[10px] font-bold">Dọn dẹp Cache AI</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-xl hover:bg-background hover:shadow-md text-blue-500 transition-all hover:scale-110 active:scale-95"
                                    onClick={onExport}
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[10px] font-bold">Xuất dữ liệu JSON</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-xl hover:bg-background hover:shadow-md text-emerald-500 transition-all hover:scale-110 active:scale-95"
                                    onClick={onImportJSON}
                                >
                                    <UploadCloud className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[10px] font-bold">Nhập dữ liệu JSON</TooltipContent>
                        </Tooltip>

                        {/* Bottom Row */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-xl hover:bg-background hover:shadow-md text-orange-500 transition-all hover:scale-110 active:scale-95"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <FileText className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-[10px] font-bold">Nhập Epub/Txt</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-xl hover:bg-background hover:shadow-md text-indigo-500 transition-all hover:scale-110 active:scale-95"
                                    onClick={onScan}
                                >
                                    <ScanLine className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-[10px] font-bold">Quét Thuật Ngữ (AI Extract)</TooltipContent>
                        </Tooltip>

                        {/* Empty or Helper Slots */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-xl hover:bg-background hover:shadow-md text-purple-500 transition-all hover:scale-110 active:scale-95"
                                    onClick={onHistoryOpen}
                                >
                                    <Clock className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-[10px] font-bold">Lịch sử & Hoàn tác</TooltipContent>
                        </Tooltip>
                    </div>

                    <div className="h-6 w-px bg-border/40 mx-1" />

                    {/* Pagination - Slim */}
                    <div className="flex items-center gap-1 bg-muted/20 px-2 py-1 rounded-xl border border-border/30">
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="h-6 w-6 text-muted-foreground disabled:opacity-20"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-[10px] font-black text-muted-foreground/60 min-w-[50px] text-center tracking-tighter">
                            {currentPage} / {totalPages}
                        </span>
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="h-6 w-6 text-muted-foreground disabled:opacity-20"
                        >
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    <input
                        type="file"
                        accept=".txt,.text,.html,.epub"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={onFileUpload}
                    />

                    <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-4 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 gap-2"
                        onClick={onApplyCorrections}
                        disabled={importing}
                    >
                        <ShieldCheck className="h-4 w-4" />
                        Cải chính
                    </Button>
                </div>
            </div>
        </div>
    );
}
