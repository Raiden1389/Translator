"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search, ChevronLeft, ChevronRight, Download, Upload, Loader2,
    FileText, X, Sparkles, Trash2, Filter, LayoutGrid, LayoutList
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

interface ChapterListHeaderProps {
    totalChapters: number;
    searchTerm: string;
    setSearchTerm: (value: string) => void;
    filterStatus: "all" | "draft" | "translated";
    setFilterStatus: (value: "all" | "draft" | "translated") => void;
    currentPage: number;
    setCurrentPage: (value: number) => void;
    totalPages: number;
    itemsPerPage: number;
    setItemsPerPage: (value: number) => void;
    selectedChapters: number[];
    setSelectedChapters: (value: number[]) => void;
    onExport: () => void;
    onImport: () => void;
    importInputRef: React.RefObject<HTMLInputElement | null>;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
    importing: boolean;
    onTranslate: () => void;
    viewMode: "grid" | "table";
    onViewModeChange: (mode: "grid" | "table") => void;
    onSelectRange: (range: string) => void;
    onScan: () => void;
    workspaceId: string;
    lastReadChapterId?: number;
    onReadContinue?: (id: number) => void;
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
    itemsPerPage,
    setItemsPerPage,
    selectedChapters,
    setSelectedChapters,
    onExport,
    onImport,
    importInputRef,
    fileInputRef,
    onFileUpload,
    onImportJSON,
    importing,
    onTranslate,
    viewMode,
    onViewModeChange,
    onSelectRange,
    onScan,
    workspaceId,
    lastReadChapterId,
    onReadContinue
}: ChapterListHeaderProps) {
    return (

        <div className="sticky top-2 z-30 bg-card/95 border border-border rounded-xl shadow-md mb-6 -mx-2 px-6 pb-2 transition-all duration-300 backdrop-blur-sm">
            {/* Main Header Row */}
            <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        {totalChapters} chương
                    </h2>

                    {/* Continue Reading Button - Compact */}
                    {lastReadChapterId && onReadContinue && (
                        <div className="flex items-center">
                            <Button
                                onClick={() => onReadContinue(lastReadChapterId)}
                                size="sm"
                                className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20 font-bold text-xs h-8 px-2 animate-in fade-in slide-in-from-left-2 shadow-none"
                                variant="outline"
                                title="Đọc tiếp chương đang dở"
                            >
                                <span className="mr-1">🚀</span> Đọc Tiếp
                            </Button>
                        </div>
                    )}

                    <div className="h-4 w-px bg-border/40 mx-2" />

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                        <Input
                            placeholder="Tìm chương..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 w-64 bg-background border-border text-foreground placeholder:text-muted-foreground/30 h-8"
                        />
                    </div>

                    {/* Filter */}
                    <Select
                        value={filterStatus}
                        onValueChange={(value) => setFilterStatus(value as any)}
                    >
                        <SelectTrigger className="h-8 w-[130px] bg-background border-border text-foreground focus:ring-primary">
                            <div className="flex items-center gap-2">
                                <Filter className="h-3 w-3 text-muted-foreground/50" />
                                <SelectValue placeholder="Trạng thái" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border text-popover-foreground font-sans">
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="draft">Chưa dịch</SelectItem>
                            <SelectItem value="translated">Đã dịch</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Range Select */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <span className="text-muted-foreground/40 text-[10px] font-mono">#</span>
                        </div>
                        <Input
                            placeholder="1-10..."
                            className="pl-7 w-[90px] bg-background border-border text-foreground placeholder:text-muted-foreground/30 h-8 text-xs focus:w-[130px] transition-all"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onSelectRange((e.target as HTMLInputElement).value);
                                    (e.target as HTMLInputElement).value = '';
                                }
                            }}
                        />
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-muted/50 p-0.5 rounded-lg border border-border ml-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-7 w-7",
                                viewMode === "grid" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => onViewModeChange("grid")}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-7 w-7",
                                viewMode === "table" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => onViewModeChange("table")}
                        >
                            <LayoutList className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>

                {/* Export/Import Buttons */}
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={onExport}
                        className="border-primary/20 text-primary hover:bg-primary/5 h-8 font-medium px-3 text-xs"
                    >
                        <Download className="mr-2 h-3.5 w-3.5" />
                        Xuất
                    </Button>
                    <input
                        ref={importInputRef}
                        type="file"
                        accept=".json"
                        onChange={onImportJSON}
                        className="hidden"
                    />
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={onImport}
                        className="border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5 h-8 font-medium px-3 text-xs"
                    >
                        <Upload className="mr-2 h-3.5 w-3.5" />
                        Nhập
                    </Button>
                    <input
                        type="file"
                        accept=".txt,.text,.html,.epub"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={onFileUpload}
                    />
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                        className="border-amber-500/30 text-amber-600 hover:bg-amber-500/5 h-8 font-medium px-3 text-xs"
                    >
                        {importing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-2 h-3.5 w-3.5" />}
                        EPUB/TXT
                    </Button>
                </div>
            </div>

            {/* Pagination Row */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground min-w-[100px] text-center font-medium">
                        Trang {currentPage} / {totalPages}
                    </span>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground/50">Hiển thị:</span>
                    <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(value) => {
                            setItemsPerPage(Number(value));
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="h-8 w-[80px] bg-background border-border text-foreground focus:ring-primary font-mono text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border text-popover-foreground font-mono text-xs">
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground/50">/ trang</span>
                </div>
            </div>

            {/* Batch Actions Bar (Conditional) */}
            {selectedChapters.length > 0 && (
                <div className="mt-3 flex items-center justify-between bg-primary/5 p-3 rounded-xl border border-primary/20 animate-in slide-in-from-top-2 shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary px-3 py-1 rounded-full text-primary-foreground text-[10px] uppercase font-black tracking-widest">
                            {selectedChapters.length} Selected
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedChapters([])}
                            className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        >
                            <X className="mr-1.5 h-3 w-3" /> Clear selection
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={onScan}
                            className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 h-8 font-medium px-4 transition-all hover:scale-105 active:scale-95"
                        >
                            <Sparkles className="mr-2 h-4 w-4" /> Quét thuật ngữ
                        </Button>
                        <Button
                            size="sm"
                            variant="default"
                            onClick={onTranslate}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 font-bold px-4 shadow-[0_4px_10px_rgba(var(--primary-rgb),0.3)] transition-all hover:scale-105 active:scale-95"
                        >
                            <FileText className="mr-2 h-4 w-4" /> Cấu hình & Dịch
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                if (confirm(`Xóa ${selectedChapters.length} chương?`)) {
                                    db.chapters.bulkDelete(selectedChapters).then(() => setSelectedChapters([]));
                                }
                            }}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 font-medium"
                        >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Xóa
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
