"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Search,
    ShieldCheck,
    Microscope,
    Trash2,
    Upload,
    Download,
    ArrowUpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BlacklistHeaderProps {
    sourceFilter: 'all' | 'content' | 'engine';
    onFilterChange: (filter: 'all' | 'content' | 'engine') => void;
    counts: {
        content: number;
        engine: number;
    };
    searchValue: string;
    onSearchChange: (value: string) => void;
    onExport: () => void;
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onHeuristicExport: () => void;
    onClearHeuristic: () => void;
}

export const BlacklistHeader = React.memo(({
    sourceFilter,
    onFilterChange,
    counts,
    searchValue,
    onSearchChange,
    onExport,
    onImport,
    onHeuristicExport,
    onClearHeuristic
}: BlacklistHeaderProps) => {
    return (
        <div className="flex items-center gap-4 border-b border-border mb-4 pb-2">
            {/* Tab Navigation */}
            <div className="flex bg-secondary p-1 rounded-sm">
                {[
                    { id: 'content', label: 'Shield', icon: ShieldCheck, count: counts.content },
                    { id: 'engine', label: 'Engine', icon: Microscope, count: counts.engine }
                ].map((tab) => {
                    const isActive = sourceFilter === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onFilterChange(tab.id as 'content' | 'engine')}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1 text-[11px] font-bold uppercase transition-colors rounded-sm",
                                isActive
                                    ? "bg-background text-primary shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                            <span className="ml-1 opacity-50 tabular-nums">[{tab.count}]</span>
                        </button>
                    );
                })}
            </div>

            {/* Search Bar */}
            <div className="relative flex-1 max-w-[240px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                    value={searchValue}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="h-8 pl-8 text-[11px] border-border bg-background rounded-sm focus:ring-0 focus:border-primary transition-all"
                    placeholder="Filter entities..."
                />
            </div>

            <div className="flex-1" />

            {/* Action Buttons */}
            <div className="flex gap-2">
                {sourceFilter === 'engine' ? (
                    <>
                        <Button
                            variant="default"
                            size="sm"
                            onClick={onHeuristicExport}
                            className="h-8 px-4 text-[11px] font-bold uppercase tracking-wider rounded-sm bg-primary hover:bg-primary/90"
                        >
                            <ArrowUpCircle className="w-3.5 h-3.5 mr-2" />
                            Export for AI (Luyện Rule)
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onClearHeuristic}
                            className="h-8 w-8 p-0 border-border text-muted-foreground hover:text-destructive hover:border-destructive rounded-sm"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </>
                ) : (
                    <div className="flex gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('blk-import')?.click()}
                            className="h-8 px-3 text-[10px] uppercase font-bold border-border rounded-sm"
                        >
                            <Upload className="w-3 h-3 mr-1.5" /> Import
                        </Button>
                        <input
                            type="file"
                            id="blk-import"
                            className="hidden"
                            accept=".json"
                            onChange={onImport}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onExport}
                            className="h-8 px-3 text-[10px] uppercase font-bold border-border rounded-sm"
                        >
                            <Download className="w-3 h-3 mr-1.5" /> Export
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
});

BlacklistHeader.displayName = "BlacklistHeader";
