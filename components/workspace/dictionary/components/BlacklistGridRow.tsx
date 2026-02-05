"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RotateCcw } from "lucide-react";
import { EditableCell } from "../../shared/EditableCell";
import { cn } from "@/lib/utils";
import { SyllableRepository } from "@/lib/repositories/syllable-repo";
import { db, type BlacklistEntry } from "@/lib/db";

interface BlacklistGridRowProps {
    entry: BlacklistEntry;
    isSelected: boolean;
    onSelect: (id: number, checked: boolean) => void;
    onRestore: (id: number) => void;
    sourceFilter: 'all' | 'content' | 'engine';
    isLoaded: boolean;
}

export const BlacklistGridRow = React.memo(
    ({ entry, isSelected, onSelect, onRestore, sourceFilter, isLoaded }: BlacklistGridRowProps) => {
        const rawHanViet = SyllableRepository.getInstance().toHanViet(entry.word);
        const hanViet = (rawHanViet === entry.word && entry.word.length > 0) ? "..." : rawHanViet;

        return (
            <div
                className={cn(
                    "grid grid-cols-12 gap-2 px-3 py-2 items-center transition-colors group",
                    isSelected ? "bg-primary/5" : "hover:bg-secondary/30",
                    sourceFilter === 'engine' && "opacity-80 hover:opacity-100"
                )}
            >
                {/* Checkbox */}
                <div className="col-span-1 flex justify-center">
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => onSelect(entry.id!, !!checked)}
                        className="h-3.5 w-3.5 border-border"
                    />
                </div>

                {/* Entity (Word) */}
                <div className="col-span-4">
                    <div className="flex flex-col gap-0.5">
                        <span className={cn(
                            "font-mono text-xs font-medium tracking-tight px-1 rounded-sm w-fit",
                            sourceFilter === 'engine'
                                ? "bg-muted text-muted-foreground select-all"
                                : "bg-secondary/40 text-foreground"
                        )}>
                            {entry.word}
                        </span>
                        {/* Han Viet subtitle - only in Engine tab */}
                        {sourceFilter === 'engine' && (
                            <span className="text-[10px] font-black text-primary uppercase tracking-tighter px-1 min-h-[12px]">
                                {isLoaded ? hanViet : "Loading..."}
                            </span>
                        )}
                    </div>
                </div>

                {/* Translation / Fingerprint */}
                <div className="col-span-5">
                    {sourceFilter === 'engine' ? (
                        <span className="text-[10px] text-muted-foreground/50 font-mono italic">
                            detected_at: {new Date(entry.createdAt).toLocaleTimeString()}
                        </span>
                    ) : (
                        <EditableCell
                            initialValue={entry.translated || (isLoaded && hanViet !== "..." ? hanViet : entry.word)}
                            className="h-6 text-xs bg-transparent border-none p-0 focus:bg-background font-medium"
                            onSave={(val) => db.blacklist.update(entry.id!, { translated: val })}
                        />
                    )}
                </div>

                {/* Actions */}
                <div className="col-span-2 flex justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-transparent p-0"
                        onClick={() => onRestore(entry.id!)}
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        );
    },
    (prevProps, nextProps) => {
        // Custom comparison for performance
        return (
            prevProps.entry.id === nextProps.entry.id &&
            prevProps.isSelected === nextProps.isSelected &&
            prevProps.sourceFilter === nextProps.sourceFilter &&
            prevProps.isLoaded === nextProps.isLoaded &&
            prevProps.entry.translated === nextProps.entry.translated
        );
    }
);

BlacklistGridRow.displayName = "BlacklistGridRow";
