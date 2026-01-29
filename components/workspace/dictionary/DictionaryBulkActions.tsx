"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Trash2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { DIC_TYPES } from "./DictionaryToolbar";

interface DictionaryBulkActionsProps {
    selectedCount: number;
    onBulkDelete: () => void;
    onBulkAICategorize: () => void;
    onBulkUpdateType: (type: string) => void;
    isExtracting: boolean;
}

export function DictionaryBulkActions({
    selectedCount,
    onBulkDelete,
    onBulkAICategorize,
    onBulkUpdateType,
    isExtracting
}: DictionaryBulkActionsProps) {
    if (selectedCount === 0) return null;

    return (
        <div className={cn(
            "flex items-center justify-between p-3 px-6 rounded-xl border-2 animate-in slide-in-from-top-4 duration-300 shadow-xl relative overflow-hidden mb-4",
            "bg-primary border-primary text-white"
        )}>
            {/* Glowing background effect */}
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent animate-pulse" />

            <div className="flex items-center gap-4 relative z-10">
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                    <Sparkles className="h-5 w-5 text-white animate-pulse" />
                </div>
                <div>
                    <p className="text-sm font-bold leading-none">Đã chọn {selectedCount} thuật ngữ</p>
                    <p className="text-[10px] opacity-80 mt-1">Chọn thao tác để xử lý hàng loạt</p>
                </div>
            </div>

            <div className="flex items-center gap-3 relative z-10">
                <Select onValueChange={onBulkUpdateType}>
                    <SelectTrigger className="h-9 w-[160px] bg-white/10 border-white/20 text-white text-xs hover:bg-white/20 transition-all font-medium">
                        <SelectValue placeholder="Đổi phân loại..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                        {DIC_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>
                                <div className="flex items-center gap-2 font-medium">
                                    <div className={`w-2 h-2 rounded-full ${t.color}`} />
                                    {t.label}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-4 text-white hover:bg-white/10 hover:text-white font-medium"
                    onClick={onBulkAICategorize}
                    disabled={isExtracting}
                >
                    <Sparkles className={cn("mr-2 h-4 w-4", isExtracting && "animate-spin")} />
                    {isExtracting ? "Đang xử lý..." : "AI Phân Loại"}
                </Button>

                <div className="h-6 w-px bg-white/20 mx-1" />

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
    );
}
