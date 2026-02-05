"use client";

import React, { useEffect, useState } from "react";
import { useBlacklist } from "../hooks/useBlacklist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Search,
    RotateCcw,
    ShieldCheck,
    Microscope,
    Trash2,
    Upload,
    Download,
    ArrowUpCircle
} from "lucide-react";
import { db } from "@/lib/db";
import { EditableCell } from "../../shared/EditableCell";
import { cn } from "@/lib/utils";
import { SyllableRepository } from "@/lib/repositories/syllable-repo";

interface BlacklistViewProps {
    workspaceId: string;
}

export function BlacklistView({ workspaceId }: BlacklistViewProps) {
    const {
        blacklist,
        filteredBlacklist,
        blacklistSearch,
        setBlacklistSearch,
        selectedBlacklist,
        setSelectedBlacklist,
        sourceFilter,
        setSourceFilter,
        handleRestoreBlacklist,
        handleBulkRestoreBlacklist,
        handleTranslateBlacklist,
        handleBlacklistExport,
        handleBlacklistImport,
        handleHeuristicExport,
        handleClearHeuristic
    } = useBlacklist(workspaceId);

    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Fix path to correct dictionary file
        SyllableRepository.getInstance().load("/dicts/ChinesePhienAmWords.txt").then(() => {
            setIsLoaded(true);
        });
    }, []);

    const counts = {
        content: blacklist.filter(b => b.source === 'ai' || b.source === 'manual').length,
        engine: blacklist.filter(b => b.source === 'heuristic').length
    };

    return (
        <div className="flex flex-col h-full bg-background text-foreground animate-in fade-in duration-200 overflow-hidden">
            {/* 1. Minimalistic Navigation */}
            <div className="flex items-center gap-4 border-b border-border mb-4 pb-2">
                <div className="flex bg-secondary p-1 rounded-sm">
                    {[
                        { id: 'content', label: 'Shield', icon: ShieldCheck, count: counts.content },
                        { id: 'engine', label: 'Engine', icon: Microscope, count: counts.engine }
                    ].map((tab) => {
                        const isActive = sourceFilter === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setSourceFilter(tab.id as any)}
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

                <div className="relative flex-1 max-w-[240px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        value={blacklistSearch}
                        onChange={(e) => setBlacklistSearch(e.target.value)}
                        className="h-8 pl-8 text-[11px] border-border bg-background rounded-sm focus:ring-0 focus:border-primary transition-all"
                        placeholder="Filter entities..."
                    />
                </div>

                <div className="flex-1" />

                <div className="flex gap-2">
                    {sourceFilter === 'engine' ? (
                        <>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleHeuristicExport}
                                className="h-8 px-4 text-[11px] font-bold uppercase tracking-wider rounded-sm bg-primary hover:bg-primary/90"
                            >
                                <ArrowUpCircle className="w-3.5 h-3.5 mr-2" />
                                Export for AI (Luyện Rule)
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleClearHeuristic} className="h-8 w-8 p-0 border-border text-muted-foreground hover:text-destructive hover:border-destructive rounded-sm">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </>
                    ) : (
                        <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => document.getElementById('blk-import')?.click()} className="h-8 px-3 text-[10px] uppercase font-bold border-border rounded-sm">
                                <Upload className="w-3 h-3 mr-1.5" /> Import
                            </Button>
                            <input type="file" id="blk-import" className="hidden" accept=".json" onChange={handleBlacklistImport} />
                            <Button variant="outline" size="sm" onClick={handleBlacklistExport} className="h-8 px-3 text-[10px] uppercase font-bold border-border rounded-sm">
                                <Download className="w-3 h-3 mr-1.5" /> Export
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Selection Action Bar */}
            {selectedBlacklist.length > 0 && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-primary text-primary-foreground text-[11px] font-bold uppercase tracking-wider rounded-sm mb-4">
                    <span>{selectedBlacklist.length} items flagged for recovery</span>
                    <button onClick={handleBulkRestoreBlacklist} className="underline hover:no-underline px-2">Restore All</button>
                </div>
            )}

            {/* 3. The Data Grid (Log-style) */}
            <div className="flex-1 border border-border bg-background flex flex-col overflow-hidden rounded-sm hover:border-muted-foreground/30 transition-colors">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-3 py-1.5 bg-secondary text-[10px] font-bold uppercase text-muted-foreground tracking-widest border-b border-border">
                    <div className="col-span-1 flex justify-center">
                        <Checkbox
                            className="h-3.5 w-3.5 border-border bg-background"
                            checked={selectedBlacklist.length > 0 && selectedBlacklist.length === filteredBlacklist.length}
                            onCheckedChange={(checked) => {
                                if (checked) setSelectedBlacklist(filteredBlacklist.map(b => b.id!));
                                else setSelectedBlacklist([]);
                            }}
                        />
                    </div>
                    <div className="col-span-4 italic">Entity (Raw Data)</div>
                    <div className="col-span-5">{sourceFilter === 'engine' ? 'Scan Fingerprint' : 'Translation/Meaning'}</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>

                {/* Rows */}
                <div className="flex-1 overflow-y-auto divide-y divide-border">
                    {filteredBlacklist.length === 0 ? (
                        <div className="h-full flex items-center justify-center p-8 text-muted-foreground text-[11px] uppercase tracking-widest italic opacity-50">
                            Storage empty.
                        </div>
                    ) : (
                        filteredBlacklist.map((entry) => {
                            const isSelected = selectedBlacklist.includes(entry.id!);
                            const rawHanViet = SyllableRepository.getInstance().toHanViet(entry.word);
                            // Avoid showing the raw Chinese if transliteration failed
                            const hanViet = (rawHanViet === entry.word && entry.word.length > 0) ? "..." : rawHanViet;

                            return (
                                <div key={entry.id} className={cn(
                                    "grid grid-cols-12 gap-2 px-3 py-2 items-center transition-colors group",
                                    isSelected ? "bg-primary/5" : "hover:bg-secondary/30",
                                    sourceFilter === 'engine' && "opacity-80 hover:opacity-100"
                                )}>
                                    <div className="col-span-1 flex justify-center">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={(checked) => {
                                                if (checked) setSelectedBlacklist([...selectedBlacklist, entry.id!]);
                                                else setSelectedBlacklist(selectedBlacklist.filter(id => id !== entry.id));
                                            }}
                                            className="h-3.5 w-3.5 border-border"
                                        />
                                    </div>
                                    <div className="col-span-4">
                                        <div className="flex flex-col gap-0.5">
                                            <span className={cn(
                                                "font-mono text-xs font-medium tracking-tight px-1 rounded-sm w-fit",
                                                sourceFilter === 'engine' ? "bg-muted text-muted-foreground select-all" : "bg-secondary/40 text-foreground"
                                            )}>
                                                {entry.word}
                                            </span>
                                            {/* Only show HV subtitle in Engine tab to avoid redundancy in Shield tab */}
                                            {sourceFilter === 'engine' && (
                                                <span className="text-[10px] font-black text-primary uppercase tracking-tighter px-1 min-h-[12px]">
                                                    {isLoaded ? hanViet : "Loading..."}
                                                </span>
                                            )}
                                        </div>
                                    </div>
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
                                    <div className="col-span-2 flex justify-end">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-transparent p-0"
                                            onClick={() => handleRestoreBlacklist(entry.id!)}
                                        >
                                            <RotateCcw className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* 4. Technical Footer */}
            <div className="flex items-center justify-between py-2 text-[10px] font-mono text-muted-foreground/30 uppercase tracking-tighter shrink-0 border-t border-border mt-2 px-1">
                <div className="flex gap-4">
                    <span>WS_{workspaceId.slice(0, 8)}</span>
                    <span>ENTITIES: {filteredBlacklist.length}</span>
                    <span className={cn(isLoaded ? "text-emerald-500/50" : "text-amber-500/50")}>
                        DICT_{isLoaded ? "READY" : "LOADING"}
                    </span>
                </div>

                {sourceFilter === 'content' && (
                    <button
                        className="hover:text-primary transition-colors font-bold"
                        onClick={handleTranslateBlacklist}
                    >
                        [ RUN_DEEP_SCAN ]
                    </button>
                )}
            </div>
        </div>
    );
}
