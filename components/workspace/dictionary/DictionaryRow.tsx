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
    virtualRow: any;
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
    const typeInfo = DIC_TYPES.find((t: any) => t.value === entry.type) || DIC_TYPES[0];

    return (
        <div
            data-index={index}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
            }}
            className={cn(
                "grid grid-cols-12 gap-4 p-4 items-center transition-colors group border-b border-border",
                isSelected ? "bg-cyan-500/10 hover:bg-cyan-500/20" : "hover:bg-muted"
            )}
        >
            <div className="col-span-1 flex justify-center">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelectChange(entry.id!, !!checked)}
                    className="border-border data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                />
            </div>
            <div className="col-span-1 text-center text-muted-foreground text-xs font-mono">{index + 1}</div>
            <div className="col-span-3 text-foreground font-serif text-lg select-all">{entry.original}</div>
            <div className="col-span-3 space-y-0.5">
                <EditableCell
                    initialValue={entry.translated}
                    onSave={(val: string) => db.dictionary.update(entry.id!, { translated: val })}
                />
                <EditableCell
                    initialValue={entry.description || ""}
                    onSave={(val: string) => db.dictionary.update(entry.id!, { description: val })}
                    className="h-5 text-[10px] text-muted-foreground italic bg-transparent border-transparent hover:border-border focus:border-cyan-500/50 p-0 px-2 focus-visible:ring-0 font-sans line-clamp-1"
                />
            </div>
            <div className="col-span-2">
                <Select
                    value={entry.type}
                    onValueChange={(val) => onUpdateType(entry.id!, val)}
                >
                    <SelectTrigger className="h-7 text-xs border-border bg-muted text-foreground">
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${typeInfo.color}`} />
                            <span>{typeInfo.label}</span>
                        </div>
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                        {DIC_TYPES.map((t: any) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="col-span-2 flex justify-end gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
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
                    className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
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
