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
import { useRaiden } from "@/components/theme/RaidenProvider";

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
    const { isRaidenMode } = useRaiden();
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
                "grid grid-cols-12 gap-4 p-4 items-center transition-colors group border-b",
                isRaidenMode ? "border-slate-800/40" : "border-slate-100",
                isSelected
                    ? (isRaidenMode ? "bg-purple-900/20 hover:bg-purple-900/30" : "bg-indigo-50 hover:bg-indigo-100/50")
                    : (isRaidenMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50")
            )}
        >
            <div className="col-span-1 flex justify-center">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelectChange(entry.id!, !!checked)}
                    className={cn(
                        isRaidenMode
                            ? "border-slate-600 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                            : "border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                    )}
                />
            </div>
            <div className={cn("col-span-1 text-center text-xs font-mono", isRaidenMode ? "text-slate-600" : "text-slate-400")}>{index + 1}</div>
            <div className={cn("col-span-3 font-bold font-serif text-lg select-all", isRaidenMode ? "text-slate-100" : "text-slate-900")}>{entry.original}</div>
            <div className="col-span-3 space-y-0.5">
                <EditableCell
                    initialValue={entry.translated}
                    onSave={(val: string) => db.dictionary.update(entry.id!, { translated: val })}
                    className={isRaidenMode ? "text-slate-200" : "text-slate-900"}
                />
                <EditableCell
                    initialValue={entry.description || ""}
                    onSave={(val: string) => db.dictionary.update(entry.id!, { description: val })}
                    className={cn(
                        "h-5 text-[10px] italic bg-transparent border-transparent p-0 px-2 focus-visible:ring-0 font-sans line-clamp-1",
                        isRaidenMode ? "text-slate-500 hover:border-slate-700 focus:border-purple-500/50" : "text-muted-foreground hover:border-border focus:border-cyan-500/50"
                    )}
                />
            </div>
            <div className="col-span-2">
                <Select
                    value={entry.type}
                    onValueChange={(val) => onUpdateType(entry.id!, val)}
                >
                    <SelectTrigger className={cn(
                        "h-7 text-xs",
                        isRaidenMode ? "bg-slate-900/50 border-slate-700 text-slate-300" : "bg-muted border-border text-foreground"
                    )}>
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${typeInfo.color}`} />
                            <span>{typeInfo.label}</span>
                        </div>
                    </SelectTrigger>
                    <SelectContent className={cn(
                        "border-slate-700",
                        isRaidenMode ? "bg-slate-900 text-slate-200" : "bg-popover text-popover-foreground"
                    )}>
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
                    className={cn(
                        "h-8 w-8 hover:bg-amber-500/10",
                        isRaidenMode ? "text-slate-500 hover:text-amber-400" : "text-muted-foreground hover:text-amber-500"
                    )}
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
                    className={cn(
                        "h-8 w-8 hover:bg-red-500/10",
                        isRaidenMode ? "text-slate-500 hover:text-red-400" : "text-muted-foreground hover:text-red-500"
                    )}
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
