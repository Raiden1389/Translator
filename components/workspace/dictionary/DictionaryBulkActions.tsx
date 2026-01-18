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
        <div className="flex items-center gap-4 bg-primary/20 p-2 px-4 rounded-lg border border-primary/50 mb-4 animate-in slide-in-from-top-2">
            <span className="text-sm font-medium text-foreground">{selectedCount} đã chọn</span>
            <Button
                size="sm"
                variant="destructive"
                className="h-8 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50"
                onClick={onBulkDelete}
            >
                <Trash2 className="mr-2 h-4 w-4" /> Xóa hàng loạt
            </Button>
            <div className="h-6 w-px bg-border mx-2" />
            <Button
                variant="outline"
                size="sm"
                className="h-8 border-purple-500/30 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                onClick={onBulkAICategorize}
                disabled={isExtracting}
            >
                <Sparkles className={cn("mr-2 h-3.5 w-3.5", isExtracting && "animate-spin")} />
                {isExtracting ? "Đang xử lý..." : "AI Phân Loại"}
            </Button>
            <div className="h-6 w-px bg-border mx-2" />
            <Select onValueChange={onBulkUpdateType}>
                <SelectTrigger className="h-8 w-[180px] bg-background border-border text-foreground text-xs">
                    <SelectValue placeholder="Đổi phân loại..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                    {DIC_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${t.color}`} />
                                {t.label}
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
