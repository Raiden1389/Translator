"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { ShieldBan, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditableCell } from "../shared/EditableCell";
import { db, type DictionaryEntry } from "@/lib/db";
import { DIC_TYPES } from "./DictionaryToolbar";


interface DictionaryRowProps {
    index: number;
    entry: DictionaryEntry;
    isSelected: boolean;
    virtualRow: { size: number; start: number };
    onSelectChange: (id: number, checked: boolean) => void;
    onUpdateType: (id: number, type: string) => void;
    onBlacklist: (id: number) => void;
    onDelete: (id: number) => void;
}

export const DictionaryRow = React.memo(function DictionaryRow({
    index,
    entry,
    isSelected,
    virtualRow,
    onSelectChange,
    onUpdateType,
    onBlacklist,
    onDelete,
}: DictionaryRowProps) {
    const [isHovered, setIsHovered] = React.useState(false);
    const typeInfo = DIC_TYPES.find((t: { value: string; label: string; color: string }) => t.value === entry.type) || DIC_TYPES[0];

    return (
        <div
            data-index={index}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
            }}
            className={cn(
                "grid grid-cols-[40px_1fr_1fr_120px_110px] gap-4 px-4 py-2 items-center transition-all duration-150 group border-b border-border/50",
                isSelected
                    ? "bg-primary/10 hover:bg-primary/20 shadow-sm"
                    : (index % 2 === 0 ? "bg-card hover:bg-muted/50" : "bg-muted/10 hover:bg-muted/50")
            )}
        >
            <div className="flex justify-center">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelectChange(entry.id!, !!checked)}
                    className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
            </div>
            <div className="font-semibold font-serif text-lg select-text px-2 truncate h-8 flex items-center text-foreground">{entry.original}</div>
            <div className="relative flex flex-col justify-center px-2 h-10 overflow-hidden group/cell">
                <EditableCell
                    initialValue={entry.translated}
                    onSave={(val: string) => db.dictionary.update(entry.id!, { translated: val })}
                    className="w-full h-8 p-0 bg-transparent border-none focus:ring-0 font-bold transition-all text-lg text-primary"
                />
                {(entry.description || isHovered) ? (
                    <div className="absolute bottom-0 left-2 right-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <EditableCell
                            initialValue={entry.description || ""}
                            onSave={(val: string) => db.dictionary.update(entry.id!, { description: val })}
                            placeholder="Thêm mô tả..."
                            className="w-full h-4 text-[10px] italic bg-transparent border-none p-0 focus-visible:ring-0 font-sans line-clamp-1 transition-all opacity-40 hover:opacity-100 text-muted-foreground"
                        />
                    </div>
                ) : null}
            </div>
            <div className="flex items-center">
                <Select
                    value={entry.type}
                    onValueChange={(val) => onUpdateType(entry.id!, val)}
                >
                    <SelectTrigger className="h-7 text-xs bg-muted border-border text-foreground">
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${typeInfo.color}`} />
                            <span>{typeInfo.label}</span>
                        </div>
                    </SelectTrigger>
                    <SelectContent className="border-border bg-popover text-popover-foreground">
                        {DIC_TYPES.map((t: { value: string; label: string; color: string }) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex justify-end gap-1 pr-4">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-amber-500/10 text-muted-foreground hover:text-amber-500"
                    onClick={(e) => {
                        e.stopPropagation();
                        onBlacklist(entry.id!);
                    }}
                    title="Chặn (Thêm vào Blacklist)"
                >
                    <ShieldBan className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(entry.id!);
                    }}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
});

DictionaryRow.displayName = "DictionaryRow";
