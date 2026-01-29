"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search, Upload, Download, Plus, MoreVertical } from "lucide-react";
import { AIExtractDialog } from "../shared/AIExtractDialog";
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

const DIC_TYPES = [
    { value: "general", label: "Chung", color: "bg-slate-500" },
    { value: "name", label: "Tên riêng", color: "bg-blue-500" },
    { value: "location", label: "Vị trí", color: "bg-amber-600" },
    { value: "item", label: "Vật phẩm", color: "bg-purple-600" },
    { value: "beast", label: "Yêu thú", color: "bg-orange-600" },
    { value: "plant", label: "Dược thảo", color: "bg-green-600" },
    { value: "skill", label: "Kỹ năng", color: "bg-rose-600" },
    { value: "cultivation", label: "Cấp bậc", color: "bg-cyan-600" },
    { value: "organization", label: "Tổ chức", color: "bg-indigo-600" },
    { value: "correction", label: "Sửa lỗi", color: "bg-red-500" },
    { value: "other", label: "Khác", color: "bg-slate-600" },
];

interface DictionaryToolbarProps {
    search: string;
    onSearchChange: (search: string) => void;
    filterType: string;
    onFilterTypeChange: (type: string) => void;
    onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onExport: () => void;
    onAIExtract: (source: string) => void;
    isExtracting: boolean;
    extractDialogOpen: boolean;
    onExtractDialogChange: (open: boolean) => void;
    onAddClick: () => void;
    onSelectFromList: () => void;
    workspaceId: string;
    totalCount: number;
}

export function DictionaryToolbar({
    search,
    onSearchChange,
    filterType,
    onFilterTypeChange,
    onImport,
    onExport,
    onAIExtract,
    isExtracting,
    extractDialogOpen,
    onExtractDialogChange,
    onAddClick,
    onSelectFromList,
    totalCount
}: DictionaryToolbarProps) {
    const hasData = totalCount > 0;

    return (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 items-center w-full md:w-auto flex-1">
                {hasData && (
                    <>
                        <Select value={filterType} onValueChange={onFilterTypeChange}>
                            <SelectTrigger className="w-[150px] bg-background border-border text-foreground h-10 rounded-xl">
                                <SelectValue placeholder="Tất cả loại" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border text-popover-foreground">
                                <SelectItem value="all">Tất cả loại</SelectItem>
                                {DIC_TYPES.map(t => (
                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="relative flex-1 max-w-[350px]">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="pl-9 bg-background border-border text-foreground h-10 rounded-xl"
                                placeholder="Tìm kiếm thuật ngữ..."
                            />
                        </div>
                    </>
                )}
            </div>

            <div className="flex gap-2 w-full md:w-auto justify-end items-center">
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
                                        onClick={() => document.getElementById('import-file')?.click()}
                                    >
                                        <Upload className="mr-2 h-4 w-4" /> Nhập Dữ Liệu
                                    </Button>
                                    {hasData && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full justify-start text-[13px] font-medium h-9 rounded-lg px-3"
                                            onClick={onExport}
                                        >
                                            <Download className="mr-2 h-4 w-4" /> Xuất Dữ Liệu
                                        </Button>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </TooltipTrigger>
                    <TooltipContent>Thêm tùy chọn</TooltipContent>
                </Tooltip>

                <input
                    type="file"
                    id="import-file"
                    className="hidden"
                    accept=".txt"
                    onChange={onImport}
                />

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            size="icon"
                            className={cn(
                                "h-10 w-10 rounded-xl bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-all",
                                !hasData && "h-12 w-32 px-4 flex gap-2 items-center justify-center animate-bounce"
                            )}
                            onClick={onAddClick}
                        >
                            <Plus className="h-5 w-5" />
                            {!hasData && <span className="text-sm font-bold">Thêm Mới</span>}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Thêm thuật ngữ mới</TooltipContent>
                </Tooltip>
            </div>

            <AIExtractDialog
                open={extractDialogOpen}
                onOpenChange={onExtractDialogChange}
                onExtract={onAIExtract}
                isExtracting={isExtracting}
                onSelectFromList={onSelectFromList}
            />
        </div>
    );
}

export { DIC_TYPES };
