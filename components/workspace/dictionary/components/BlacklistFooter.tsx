"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface BlacklistFooterProps {
    workspaceId: string;
    itemCount: number;
    isLoaded: boolean;
    sourceFilter: 'all' | 'content' | 'engine';
    onDeepScan: () => void;
}

export const BlacklistFooter = React.memo(({
    workspaceId,
    itemCount,
    isLoaded,
    sourceFilter,
    onDeepScan
}: BlacklistFooterProps) => {
    return (
        <div className="flex items-center justify-between py-2 text-[10px] font-mono text-muted-foreground/30 uppercase tracking-tighter shrink-0 border-t border-border mt-2 px-1">
            <div className="flex gap-4">
                <span>WS_{workspaceId.slice(0, 8)}</span>
                <span>ENTITIES: {itemCount}</span>
                <span className={cn(isLoaded ? "text-emerald-500/50" : "text-amber-500/50")}>
                    DICT_{isLoaded ? "READY" : "LOADING"}
                </span>
            </div>

            {sourceFilter === 'content' && (
                <button
                    className="hover:text-primary transition-colors font-bold"
                    onClick={onDeepScan}
                >
                    [ RUN_DEEP_SCAN ]
                </button>
            )}
        </div>
    );
});

BlacklistFooter.displayName = "BlacklistFooter";
