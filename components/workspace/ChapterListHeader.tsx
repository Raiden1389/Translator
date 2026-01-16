"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search, ChevronLeft, ChevronRight, Download, Upload, Loader2,
    FileText, X, Sparkles, ShieldCheck, Trash2, ArrowRightLeft, Filter
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { db } from "@/lib/db";

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
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onTranslate: () => void;
    onInspect: () => void;
    importInputRef: React.RefObject<HTMLInputElement | null>;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    importing: boolean;
    onRangeSelect?: () => void;
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
    onTranslate,
    onInspect,
    importInputRef,
    fileInputRef,
    onFileUpload,
    importing,
    onRangeSelect
}: ChapterListHeaderProps) {
    return (
        <div className="sticky top-0 z-30 bg-[#1a0b2e]/95 backdrop-blur-md border-b border-white/10 pb-4 mb-6">
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
                        <SelectContent className="bg-[#1a0b2e] border-white/10 text-white">
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="draft">Chưa dịch</SelectItem>
                            <SelectItem value="translated">Đã dịch</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Export/Import Buttons */}
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={onExport}
                        className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 h-9"
                    >
                        <Download className="mr-2 h-3 w-3" />
                        Xuất JSON
                    </Button>
                    <input
                        ref={importInputRef}
                        type="file"
                        accept=".json"
                        onChange={onImport}
                        className="hidden"
                    />
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => importInputRef.current?.click()}
                        className="border-green-500/30 text-green-400 hover:bg-green-500/10 h-9"
                    >
                        <Upload className="mr-2 h-3 w-3" />
                        Nhập JSON
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
                        className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 h-9"
                    >
                        {importing ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Upload className="mr-2 h-3 w-3" />}
                        Tải EPUB/TXT
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
                    <span className="text-sm text-white/70 min-w-[100px] text-center">
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
                        <SelectTrigger className="h-8 w-[80px] bg-white/5 border-white/10 text-white focus:ring-primary">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a0b2e] border-white/10 text-white">
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
                <div className="mt-3 flex items-center justify-between bg-gradient-to-r from-purple-600/20 to-blue-600/20 p-3 rounded-lg border border-purple-500/30 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary px-2.5 py-1 rounded text-white text-xs font-bold">
                            {selectedChapters.length} đã chọn
                        </div>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedChapters([])}
                            className="h-7 text-white/70 hover:text-white"
                        >
                            <X className="mr-1 h-3 w-3" /> Bỏ chọn
                        </Button>
                        {onRangeSelect && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={onRangeSelect}
                                className="h-7 text-white/70 hover:text-white"
                            >
                                <ArrowRightLeft className="mr-1 h-3 w-3" /> Chọn khoảng
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onTranslate}
                            className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10 h-8"
                        >
                            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Dịch
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onInspect}
                            className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 h-8"
                        >
                            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Soi lỗi
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                if (confirm(`Xóa ${selectedChapters.length} chương?`)) {
                                    db.chapters.bulkDelete(selectedChapters).then(() => setSelectedChapters([]));
                                }
                            }}
                            className="border-red-500/30 text-red-300 hover:bg-red-500/10 h-8"
                        >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Xóa
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
