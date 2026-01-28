"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { User, MapPin, Zap, Users, Sparkles, Settings2 } from "lucide-react";
import { TermType } from "@/lib/services/name-hunter/types";
import { cn } from "@/lib/utils";

interface ScanConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onStart: (selectedTypes: TermType[]) => void;
}

const ENTITY_OPTIONS = [
    { id: TermType.Person, label: "Nhân vật", icon: User, color: "text-blue-500", bg: "bg-blue-500/10" },
    { id: TermType.Location, label: "Địa danh", icon: MapPin, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { id: TermType.Skill, label: "Công pháp / Kỹ năng", icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
    { id: TermType.Organization, label: "Tổ chức / Thế lực", icon: Users, color: "text-purple-500", bg: "bg-purple-500/10" },
];

export function ScanConfigDialog({ open, onOpenChange, onStart }: ScanConfigDialogProps) {
    const [selected, setSelected] = useState<TermType[]>([TermType.Person, TermType.Location, TermType.Skill, TermType.Organization]);

    const toggleType = (type: TermType) => {
        setSelected(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    const handleStart = () => {
        if (selected.length === 0) return;
        onStart(selected);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-card border-border shadow-2xl overflow-hidden p-0">
                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-purple-500 via-blue-500 to-emerald-500" />

                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Settings2 className="w-5 h-5 text-primary" />
                        Cấu hình Quét AI
                    </DialogTitle>
                    <DialogDescription>
                        Chọn các loại thực thể mà ông muốn AI tìm kiếm trong văn bản.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 pt-2 space-y-3">
                    {ENTITY_OPTIONS.map((opt) => (
                        <div
                            key={opt.id}
                            onClick={() => toggleType(opt.id)}
                            className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200",
                                selected.includes(opt.id)
                                    ? "bg-muted/50 border-primary/50 shadow-sm"
                                    : "bg-transparent border-transparent hover:bg-muted/30 opacity-60"
                            )}
                        >
                            <div className={cn("p-2 rounded-lg", opt.bg, opt.color)}>
                                <opt.icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 font-medium text-sm">{opt.label}</div>
                            <Checkbox
                                checked={selected.includes(opt.id)}
                                onCheckedChange={() => toggleType(opt.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="data-[state=checked]:bg-primary"
                            />
                        </div>
                    ))}
                </div>

                <DialogFooter className="p-6 bg-muted/20 border-t border-border">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
                    <Button
                        disabled={selected.length === 0}
                        onClick={handleStart}
                        className="bg-purple-600 hover:bg-purple-700 text-white min-w-[120px]"
                    >
                        <Sparkles className="w-4 h-4 mr-2" /> Bắt đầu quét
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
