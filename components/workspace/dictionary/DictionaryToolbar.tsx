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
import { Search, Upload, Download, Sparkles, Plus } from "lucide-react";
import { AIExtractDialog } from "../shared/AIExtractDialog";

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
    onSearchChange: (value: string) => void;
    filterType: string;
    onFilterTypeChange: (value: string) => void;
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onExport: () => void;
    onAIExtract: (source: "latest" | "current" | "select") => void;
    isExtracting: boolean;
    extractDialogOpen: boolean;
    onExtractDialogChange: (open: boolean) => void;
    onAddClick: () => void;
    onSelectFromList: () => void;
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
    onSelectFromList
}: DictionaryToolbarProps) {
    return (
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 items-center w-full md:w-auto">
                <Select value={filterType} onValueChange={onFilterTypeChange}>
                    <SelectTrigger className="w-[150px] bg-background border-border text-foreground">
                        <SelectValue placeholder="Tất cả loại" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                        <SelectItem value="all">Tất cả loại</SelectItem>
                        {DIC_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="relative flex-1 md:w-[300px]">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-9 bg-background border-border text-foreground"
                        placeholder="Tìm kiếm thuật ngữ..."
                    />
                </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto justify-end">
                <Button
                    variant="outline"
                    className="border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={() => document.getElementById('import-file')?.click()}
                >
                    <Upload className="mr-2 h-4 w-4" /> Import VP
                </Button>
                <input
                    type="file"
                    id="import-file"
                    className="hidden"
                    accept=".txt"
                    onChange={onImport}
                />
                <Button
                    variant="outline"
                    className="border-border text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                    onClick={onExport}
                >
                    <Download className="mr-2 h-4 w-4" /> Export VP
                </Button>

                <Button
                    onClick={() => onExtractDialogChange(true)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Quét AI
                </Button>

                <Button
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={onAddClick}
                >
                    <Plus className="mr-2 h-4 w-4" /> Thêm Thuật Ngữ
                </Button>
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
