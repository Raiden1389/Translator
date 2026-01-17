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
    onScan
}: ChapterListHeaderProps) {
    return (
        <div className="sticky top-2 z-30 bg-[#1a0b2e]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl mb-6 mx-1 px-4 pb-4 transition-all duration-300">
            {/* Main Header Row */}
            <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        {totalChapters} chương
                    </h2>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                        <Input
                            placeholder="Tìm chương..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 w-64 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9"
                        />
                    </div>

                    {/* Filter */}
                    <Select
                        value={filterStatus}
                        onValueChange={(value) => setFilterStatus(value as any)}
                    >
                        <SelectTrigger className="h-9 w-[130px] bg-white/5 border-white/10 text-white focus:ring-primary">
                            <div className="flex items-center gap-2">
                                <Filter className="h-3 w-3 text-white/50" />
                                <SelectValue placeholder="Trạng thái" />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a0b2e] border-white/10 text-white font-sans">
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="draft">Chưa dịch</SelectItem>
                            <SelectItem value="translated">Đã dịch</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Range Select */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <span className="text-white/40 text-[10px] font-mono">#</span>
                        </div>
                        <Input
                            placeholder="1-10, 20..."
                            className="pl-7 w-[100px] bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9 text-xs focus:w-[140px] transition-all"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onSelectRange((e.target as HTMLInputElement).value);
                                    (e.target as HTMLInputElement).value = '';
                                }
                            }}
                        />
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-white/5 p-1 rounded-lg border border-white/5 ml-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-7 w-7",
                                viewMode === "grid" ? "bg-primary text-white hover:bg-primary/90" : "text-white/40 hover:text-white"
                            )}
                            onClick={() => onViewModeChange("grid")}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-7 w-7",
                                viewMode === "table" ? "bg-primary text-white hover:bg-primary/90" : "text-white/40 hover:text-white"
                            )}
                            onClick={() => onViewModeChange("table")}
                        >
                            <LayoutList className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Export/Import Buttons */}
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={onExport}
                        className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 h-9 font-medium"
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
                        className="border-green-500/30 text-green-400 hover:bg-green-500/10 h-9 font-medium"
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
                        className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 h-9 font-medium"
                    >
                        {importing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-2 h-3.5 w-3.5" />}
                        EPUB/TXT
                    </Button>
                </div>
            </div>

            {/* Pagination Row */}
            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0 text-white/70 hover:text-white disabled:opacity-30"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-white/70 min-w-[100px] text-center font-medium">
                        Trang {currentPage} / {totalPages}
                    </span>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0 text-white/70 hover:text-white disabled:opacity-30"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-white/50">Hiển thị:</span>
                    <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(value) => {
                            setItemsPerPage(Number(value));
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="h-8 w-[80px] bg-white/5 border-white/10 text-white focus:ring-primary font-mono text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a0b2e] border-white/10 text-white font-mono text-xs">
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                    </Select>
                    <span className="text-sm text-white/50">/ trang</span>
                </div>
            </div>

            {/* Batch Actions Bar (Conditional) */}
            {selectedChapters.length > 0 && (
                <div className="mt-3 flex items-center justify-between bg-gradient-to-r from-purple-600/20 to-blue-600/20 p-3 rounded-xl border border-purple-500/30 animate-in slide-in-from-top-2 shadow-lg shadow-purple-500/5">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary px-3 py-1 rounded-full text-white text-[10px] uppercase font-black tracking-widest">
                            {selectedChapters.length} Selected
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedChapters([])}
                            className="h-7 text-xs text-white/70 hover:text-white hover:bg-white/5"
                        >
                            <X className="mr-1.5 h-3 w-3" /> Clear selection
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={onScan}
                            className="bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 h-8 font-medium px-4 transition-all hover:scale-105 active:scale-95"
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
