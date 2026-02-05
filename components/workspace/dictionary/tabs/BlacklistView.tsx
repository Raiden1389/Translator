"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useBlacklist } from "../hooks/useBlacklist";
import { SyllableRepository } from "@/lib/repositories/syllable-repo";
import { BlacklistHeader } from "../components/BlacklistHeader";
import { BlacklistGrid } from "../components/BlacklistGrid";
import { BlacklistGridRow } from "../components/BlacklistGridRow";
import { BlacklistFooter } from "../components/BlacklistFooter";

interface BlacklistViewProps {
    workspaceId: string;
}

export function BlacklistView({ workspaceId }: BlacklistViewProps) {
    const hook = useBlacklist(workspaceId);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        SyllableRepository.getInstance().load("/dicts/ChinesePhienAmWords.txt").then(() => {
            setIsLoaded(true);
        });
    }, []);

    const counts = useMemo(() => ({
        content: hook.blacklist.filter(b => b.source === 'ai' || b.source === 'manual').length,
        engine: hook.blacklist.filter(b => b.source === 'heuristic').length
    }), [hook.blacklist]);

    const handleSelectAll = useCallback((checked: boolean) => {
        const { filteredBlacklist, setSelectedBlacklist } = hook;
        if (checked) setSelectedBlacklist(filteredBlacklist.map(b => b.id!));
        else setSelectedBlacklist([]);
    }, [hook]);

    const handleRowSelect = useCallback((id: number, checked: boolean) => {
        const { selectedBlacklist, setSelectedBlacklist } = hook;
        if (checked) setSelectedBlacklist([...selectedBlacklist, id]);
        else setSelectedBlacklist(selectedBlacklist.filter(i => i !== id));
    }, [hook]);

    return (
        <div className="flex flex-col h-full bg-background text-foreground animate-in fade-in duration-200 overflow-hidden">
            <BlacklistHeader
                sourceFilter={hook.sourceFilter}
                onFilterChange={hook.setSourceFilter}
                counts={counts}
                searchValue={hook.blacklistSearch}
                onSearchChange={hook.setBlacklistSearch}
                onExport={hook.handleBlacklistExport}
                onImport={hook.handleBlacklistImport}
                onHeuristicExport={hook.handleHeuristicExport}
                onClearHeuristic={hook.handleClearHeuristic}
            />

            {hook.selectedBlacklist.length > 0 && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wider rounded-sm mb-4">
                    <span>{hook.selectedBlacklist.length} items flagged for recovery</span>
                    <button onClick={hook.handleBulkRestoreBlacklist} className="underline hover:no-underline px-2">
                        Restore All
                    </button>
                </div>
            )}

            <BlacklistGrid
                items={hook.filteredBlacklist}
                selectedIds={hook.selectedBlacklist}
                onSelectAll={handleSelectAll}
                sourceFilter={hook.sourceFilter}
            >
                {hook.filteredBlacklist.map(entry => (
                    <BlacklistGridRow
                        key={entry.id}
                        entry={entry}
                        isSelected={hook.selectedBlacklist.includes(entry.id!)}
                        onSelect={handleRowSelect}
                        onRestore={hook.handleRestoreBlacklist}
                        sourceFilter={hook.sourceFilter}
                        isLoaded={isLoaded}
                    />
                ))}
            </BlacklistGrid>

            <BlacklistFooter
                workspaceId={workspaceId}
                itemCount={hook.filteredBlacklist.length}
                isLoaded={isLoaded}
                sourceFilter={hook.sourceFilter}
                onDeepScan={hook.handleTranslateBlacklist}
            />
        </div>
    );
}
