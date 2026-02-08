"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { type BlacklistEntry } from "@/lib/db";

interface BlacklistGridProps {
    items: BlacklistEntry[];
    selectedIds: number[];
    onSelectAll: (checked: boolean) => void;
    sourceFilter: 'all' | 'content' | 'engine';
    children: React.ReactNode;
}

export const BlacklistGrid = React.memo(({
    items,
    selectedIds,
    onSelectAll,
    sourceFilter,
    children
}: BlacklistGridProps) => {
    return (
        <div className="flex-1 border border-border bg-background flex flex-col overflow-hidden rounded-sm hover:border-muted-foreground/30 transition-colors">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-3 py-1.5 bg-secondary text-[10px] font-bold uppercase text-muted-foreground tracking-widest border-b border-border">
                <div className="col-span-1 flex justify-center">
                    <Checkbox
                        className="h-3.5 w-3.5 border-border bg-background"
                        checked={selectedIds.length > 0 && selectedIds.length === items.length}
                        onCheckedChange={(checked) => onSelectAll(!!checked)}
                    />
                </div>
                <div className="col-span-4 italic">Entity (Raw Data)</div>
                <div className="col-span-5">{sourceFilter === 'engine' ? 'Scan Fingerprint' : 'Translation/Meaning'}</div>
                <div className="col-span-2 text-right">Actions</div>
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto divide-y divide-border">
                {items.length === 0 ? (
                    <div className="h-full flex items-center justify-center p-8 text-muted-foreground text-[11px] uppercase tracking-widest italic opacity-50">
                        Storage empty.
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
});

BlacklistGrid.displayName = "BlacklistGrid";
