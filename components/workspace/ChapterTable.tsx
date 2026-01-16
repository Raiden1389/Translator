"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Chapter } from "@/lib/db";

interface ChapterTableProps {
    chapters: Chapter[];
    selectedChapters: number[];
    onToggleSelect: (id: number) => void;
    onToggleSelectAll: () => void;
    onDelete: (id: number) => void;
    onRead: (id: number) => void;
    workspaceId: string;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function ChapterTable({
    chapters,
    selectedChapters,
    onToggleSelect,
    onToggleSelectAll,
    onDelete,
    onRead,
    workspaceId,
    currentPage,
    totalPages,
    onPageChange
}: ChapterTableProps) {
    return (
        <>
            <Table>
                <TableHeader className="bg-[#252538] sticky top-0 z-10">
                    <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="w-[40px] pl-4">
                            <Checkbox
                                checked={chapters.length > 0 && selectedChapters.length === chapters.length}
                                onCheckedChange={onToggleSelectAll}
                                className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                        </TableHead>
                        <TableHead className="w-[60px] text-center text-white/60">C.#</TableHead>
                        <TableHead className="text-white/60">Tiêu đề</TableHead>
                        <TableHead className="text-white/60">Tiêu đề dịch</TableHead>
                        <TableHead className="w-[120px] text-center text-white/60">Trạng thái</TableHead>
                        <TableHead className="w-[100px] text-center text-white/60">Từ gốc</TableHead>
                        <TableHead className="w-[100px] text-center text-white/60">Từ dịch</TableHead>
                        <TableHead className="w-[80px] text-right text-white/60">Hành động</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {chapters.map((chapter) => (
                        <TableRow key={chapter.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                            <TableCell className="pl-4">
                                <Checkbox
                                    checked={selectedChapters.includes(chapter.id!)}
                                    onCheckedChange={() => onToggleSelect(chapter.id!)}
                                    className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                            </TableCell>
                            <TableCell className="text-center font-mono text-white/50 text-xs">
                                {chapter.order}
                            </TableCell>
                            <TableCell className="font-medium text-white/90">
                                <button
                                    onClick={() => onRead(chapter.id!)}
                                    className="hover:text-primary transition-colors block w-full h-full text-left"
                                >
                                    <div className="line-clamp-1 text-sm font-bold">{chapter.title}</div>
                                </button>
                            </TableCell>
                            <TableCell className="text-white/70">
                                <div className="line-clamp-1 text-sm italic">{chapter.title_translated || "—"}</div>
                            </TableCell>
                            <TableCell className="text-center">
                                <span className={cn(
                                    "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider",
                                    chapter.status === 'translated'
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                )}>
                                    {chapter.status === 'translated' ? "Đã dịch" : "Chờ dịch"}
                                </span>
                            </TableCell>
                            <TableCell className="text-center text-xs text-white/50 font-mono">
                                {chapter.wordCountOriginal?.toLocaleString() || 0}
                            </TableCell>
                            <TableCell className="text-center text-xs text-white/50 font-mono">
                                {chapter.wordCountTranslated?.toLocaleString() || 0}
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-50 group-hover:opacity-100">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-white/50 hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => onDelete(chapter.id!)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-end p-4 gap-2 border-t border-white/5">
                    <span className="text-xs text-white/50 mr-4">
                        Trang {currentPage} / {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="h-8 w-8 bg-[#2b2b40] border-white/10 hover:bg-white/10 text-white"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 bg-[#2b2b40] border-white/10 hover:bg-white/10 text-white"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </>
    );
}
