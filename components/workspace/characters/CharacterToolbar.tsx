"use client";

import React from "react";
import { Search, Plus, Download, Upload, Trash2, Sparkles, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface CharacterToolbarProps {
    search: string;
    setSearch: (value: string) => void;
    isAdding: boolean;
    setIsAdding: (value: boolean) => void;
    selectedCount: number;
    totalCount: number;
    onImportJSON: () => void;
    onExportJSON: () => void;
    onBulkDelete: () => void;
    onClearSelection: () => void;
}

export function CharacterToolbar({
    search,
    setSearch,
    isAdding,
    setIsAdding,
    selectedCount,
    totalCount,
    onImportJSON,
    onExportJSON,
    onBulkDelete,
    onClearSelection
}: CharacterToolbarProps) {
    const hasData = totalCount > 0;

    return (
        <div className="space-y-4">
            <div className="flex gap-4 items-center justify-between">
                <div className="flex gap-2 items-center flex-1">
                    {hasData && (
                        <div className="relative flex-1 max-w-[450px] animate-in fade-in slide-in-from-left-2 duration-300">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 bg-background border-border text-foreground h-10 rounded-xl"
                                placeholder="Tìm kiếm nhân vật..."
                            />
                        </div>
                    )}
                </div>

                <div className="flex gap-2 items-center">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 rounded-xl border border-transparent hover:border-border transition-all text-muted-foreground hover:text-foreground"
                                    >
                                        <MoreVertical className="h-5 w-5" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-2 rounded-xl" align="end">
                                    <div className="flex flex-col gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full justify-start text-[13px] font-medium h-9 rounded-lg px-3"
                                            onClick={onImportJSON}
                                        >
                                            <Download className="mr-2 h-4 w-4" /> Nhập Dữ Liệu
                                        </Button>
                                        {hasData && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full justify-start text-[13px] font-medium h-9 rounded-lg px-3"
                                                onClick={onExportJSON}
                                            >
                                                <Upload className="mr-2 h-4 w-4" /> Xuất Dữ Liệu
                                            </Button>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </TooltipTrigger>
                        <TooltipContent>Thêm tùy chọn</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="icon"
                                className={cn(
                                    "h-10 w-10 rounded-xl bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-all",
                                    !hasData && "h-12 w-32 px-4 flex gap-2 items-center justify-center animate-bounce"
                                )}
                                onClick={() => setIsAdding(!isAdding)}
                            >
                                <Plus className="h-5 w-5" />
                                {!hasData && <span className="text-sm font-bold">Thêm Mới</span>}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Thêm nhân vật mới</TooltipContent>
                    </Tooltip>
                </div>
            </div>

            {selectedCount > 0 && (
                <div className="flex items-center justify-between p-3 px-6 rounded-xl border-2 animate-in slide-in-from-top-4 duration-300 shadow-xl relative overflow-hidden bg-primary border-primary text-white">
                    {/* Glowing background effect */}
                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent animate-pulse" />

                    <div className="flex items-center gap-4 relative z-10">
                        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                            <Sparkles className="h-5 w-5 text-white animate-pulse" />
                        </div>
                        <div>
                            <p className="text-sm font-bold leading-none">Đã chọn {selectedCount} nhân vật</p>
                            <p className="text-[10px] opacity-80 mt-1">Bạn có thể thực hiện xóa hàng loạt hoặc các tác vụ khác</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 relative z-10">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 px-4 text-white hover:bg-white/10 hover:text-white font-medium"
                            onClick={onClearSelection}
                        >
                            Hủy chọn
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            className="h-9 px-6 bg-red-500 hover:bg-red-600 border border-red-400/50 shadow-lg font-bold"
                            onClick={onBulkDelete}
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Xóa vĩnh viễn
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
