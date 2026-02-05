"use client";

import React from "react";
import {
    Search,
    ArrowUpNarrowWide,
    CheckCircle,
    Clock,
    X,
    FilterX
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface HeuristicFiltersProps {
    search: string;
    onSearchChange: (v: string) => void;
    statusFilter: 'all' | 'pending' | 'approved';
    onStatusChange: (v: 'all' | 'pending' | 'approved') => void;
    freqFilter: number | null;
    onFreqChange: (v: number | null) => void;
    stats: { total: number; pending: number; approved: number };
}

export function HeuristicFilters({
    search,
    onSearchChange,
    statusFilter,
    onStatusChange,
    freqFilter,
    onFreqChange,
    stats
}: HeuristicFiltersProps) {
    const freqPresets = [1, 2, 3, 5, 10];

    return (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-left-4 duration-700">
            <div className="flex flex-col lg:flex-row gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Tìm kiếm thực thể, nhân vật..."
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-12 h-11 bg-muted/20 border-border/40 hover:border-border/80 focus:border-primary/40 rounded-2xl transition-all shadow-sm group-hover:bg-muted/40"
                    />
                    {search && (
                        <button
                            onClick={() => onSearchChange("")}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-foreground transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Status Chips */}
                <div className="flex bg-muted/30 p-1.5 rounded-2xl border border-border/40 shadow-inner overflow-x-auto scrollbar-none gap-1">
                    <button
                        onClick={() => onStatusChange('all')}
                        className={cn(
                            "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
                            statusFilter === 'all'
                                ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                                : "text-muted-foreground/60 hover:text-foreground hover:bg-muted/20"
                        )}
                    >
                        Tất cả
                        <span className="text-[10px] font-medium opacity-40">({stats.total})</span>
                    </button>

                    <button
                        onClick={() => onStatusChange('pending')}
                        className={cn(
                            "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
                            statusFilter === 'pending'
                                ? "bg-amber-500/10 text-amber-600 shadow-sm ring-1 ring-amber-500/20"
                                : "text-muted-foreground/60 hover:text-amber-500/80 hover:bg-amber-500/5"
                        )}
                    >
                        <Clock className="w-3.5 h-3.5" />
                        Chờ Duyệt
                        <span className="text-[10px] font-medium opacity-40">({stats.pending})</span>
                    </button>

                    <button
                        onClick={() => onStatusChange('approved')}
                        className={cn(
                            "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap",
                            statusFilter === 'approved'
                                ? "bg-emerald-500/10 text-emerald-600 shadow-sm ring-1 ring-emerald-500/20"
                                : "text-muted-foreground/60 hover:text-emerald-500/80 hover:bg-emerald-500/5"
                        )}
                    >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Đã Chốt
                        <span className="text-[10px] font-medium opacity-40">({stats.approved})</span>
                    </button>
                </div>
            </div>

            {/* Frequency Filter (The requested feature) */}
            <div className="flex flex-wrap items-center gap-2 px-1">
                <div className="flex items-center gap-2 mr-2">
                    <ArrowUpNarrowWide className="w-3.5 h-3.5 text-muted-foreground/40" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Lọc tần suất:</span>
                </div>

                <div className="flex flex-wrap gap-1.5 align-center">
                    <button
                        onClick={() => onFreqChange(null)}
                        className={cn(
                            "h-7 px-3 rounded-lg text-[10px] font-bold transition-all border flex items-center gap-1.5",
                            freqFilter === null
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-transparent text-muted-foreground/40 border-border/40 hover:border-border hover:text-foreground"
                        )}
                    >
                        <FilterX className="w-3 h-3" />
                        Bất kỳ
                    </button>

                    {freqPresets.map(f => (
                        <button
                            key={f}
                            onClick={() => onFreqChange(f)}
                            className={cn(
                                "h-7 px-3 rounded-lg text-[10px] font-bold transition-all border tabular-nums",
                                freqFilter === f
                                    ? "bg-foreground text-background border-foreground shadow-sm"
                                    : "bg-transparent text-muted-foreground/40 border-border/40 hover:border-border hover:text-foreground"
                            )}
                        >
                            x{f}
                        </button>
                    ))}

                    <div className="h-4 w-px bg-border/20 mx-1 self-center" />

                    <div className="relative group">
                        <Input
                            type="number"
                            placeholder="Tự chọn..."
                            value={freqFilter || ""}
                            onChange={(e) => onFreqChange(e.target.value ? parseInt(e.target.value) : null)}
                            className="h-7 w-20 px-2 text-[10px] font-bold rounded-lg bg-muted/10 border-border/20 focus:ring-0 focus:border-primary/40 text-center"
                        />
                    </div>
                </div>

                {freqFilter && (
                    <div className="ml-auto text-[10px] font-medium text-destructive/60 animate-in fade-in slide-in-from-right-2">
                        💡 Đang lọc các từ xuất hiện chính xác <b>{freqFilter}</b> lần
                    </div>
                )}
            </div>
        </div>
    );
}
