"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DictionaryEntry } from "@/lib/db";
import { toast } from "sonner";

interface CharacterRowProps {
    char: DictionaryEntry;
    index: number;
    isSelected: boolean;
    onSelect: (id: number, checked: boolean) => void;
    onUpdate: (id: number, updates: Partial<DictionaryEntry>) => void;
    onDelete: (id: number) => void;
}

export function CharacterRow({
    char,
    index,
    isSelected,
    onSelect,
    onUpdate,
    onDelete
}: CharacterRowProps) {
    return (
        <div
            className={cn(
                "grid grid-cols-[40px_250px_1fr_36px] gap-4 px-4 py-2 items-center transition-all duration-150 group border-b min-h-[64px] border-border/50",
                isSelected
                    ? "bg-primary/10 hover:bg-primary/20 shadow-sm"
                    : (index % 2 === 0 ? "bg-card hover:bg-muted/50" : "bg-muted/10 hover:bg-muted/50")
            )}
        >
            <div className="flex justify-center items-center">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelect(char.id!, !!checked)}
                    className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
            </div>

            {/* Stacked Identity Column */}
            <div className="flex flex-col justify-center px-2 py-1 overflow-hidden">
                <Input
                    className="h-7 w-full bg-transparent border-none focus:ring-0 p-0 font-bold text-lg leading-tight text-primary"
                    defaultValue={char.translated}
                    onBlur={(e) => {
                        if (e.target.value !== char.translated) {
                            onUpdate(char.id!, { translated: e.target.value });
                            toast.success(`Đã cập nhật: ${char.original}`);
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                />
                <div className="text-[11px] opacity-40 font-serif truncate mt-0.5 text-muted-foreground">
                    {char.original}
                </div>
            </div>

            {/* Super-Wide Description Column (1fr) */}
            <div className="px-2 overflow-hidden py-1">
                <Textarea
                    className="min-h-[32px] w-full bg-transparent border-none focus:ring-0 p-0 text-xs resize-none scrollbar-hide leading-normal transition-all text-muted-foreground focus:text-foreground"
                    defaultValue={char.description || ""}
                    placeholder="Thêm mô tả chi tiết nhẫn vật..."
                    onBlur={(e) => {
                        if (e.target.value !== char.description) {
                            onUpdate(char.id!, { description: e.target.value });
                        }
                    }}
                    rows={1}
                    onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;
                    }}
                />
            </div>

            {/* Delete button — visible on hover */}
            <div className="flex justify-center">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(char.id!)}
                    title="Xoá nhân vật"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}
