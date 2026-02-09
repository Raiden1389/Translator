"use client";

import React from "react";
import {
    User,
    Sword,
    MapPin,
    Trash2,
    CheckCircle2,
    Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HeuristicTerm, db } from "@/lib/db";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider
} from "@/components/ui/tooltip";

interface HeuristicTermItemProps {
    term: HeuristicTerm;
    isScanning: boolean;
    onApprove: (id: number) => void;
    onDelete: (id: number) => void;
}

export function HeuristicTermItem({ term, isScanning, onApprove, onDelete }: HeuristicTermItemProps) {
    const type = term.type?.toLowerCase() || 'unknown';

    const getTypeIcon = () => {
        switch (type) {
            case 'character':
            case 'person':
                return <User className="h-5 w-5" />;
            case 'skill':
                return <Sword className="h-5 w-5" />;
            case 'location':
                return <MapPin className="h-5 w-5" />;
            default:
                return <Info className="h-5 w-5" />;
        }
    };

    const getTypeColor = () => {
        switch (type) {
            case 'character':
            case 'person':
                return "bg-amber-500/15 text-amber-400 border-amber-500/30";
            case 'skill':
                return "bg-rose-500/15 text-rose-400 border-rose-500/30";
            case 'location':
                return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
            default:
                return "bg-muted text-muted-foreground border-border";
        }
    };

    const handleTypeCycle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const types = ['character', 'skill', 'location'];
        const currentIndex = types.indexOf(type);
        const nextType = types[(currentIndex + 1) % types.length];
        await db.heuristicTerms.update(term.id!, { type: nextType as 'character' | 'skill' | 'location' });
    };

    return (
        <div className={cn(
            "h-[72px] mb-2 rounded-[18px] flex items-center justify-between px-5 transition-all border group relative overflow-hidden",
            term.isApproved
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-card border-border hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 shadow-sm"
        )}>
            {/* Background Accent */}
            {!term.isApproved && (
                <div className="absolute inset-0 bg-linear-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            )}

            <div className="flex items-center gap-5 min-w-0 relative z-10">
                {/* Type Icon Button */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={handleTypeCycle}
                                disabled={isScanning || term.isApproved}
                                className={cn(
                                    "h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 transition-all active:scale-90 border",
                                    getTypeColor(),
                                    term.isApproved && "opacity-50 grayscale"
                                )}
                            >
                                {getTypeIcon()}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="text-[10px] font-bold uppercase">Bấm để đổi loại: {term.type}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-lg font-black text-foreground tracking-tighter shrink-0">
                            {term.original}
                        </span>

                        <div className={cn(
                            "text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider shrink-0 border",
                            getTypeColor()
                        )}>
                            {type === 'character' ? "Nhân vật" : type === 'skill' ? "Kỹ năng" : type === 'location' ? "Địa danh" : type}
                        </div>

                        {term.occurrences > 1 && (
                            <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded-full text-muted-foreground/60 border border-border/20">
                                x{term.occurrences}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground/80 truncate italic">
                        <span>{term.translated || "Chưa dịch..."}</span>
                        <span className="text-[10px] opacity-30 not-italic">({term.pinyin || "..."})</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6 shrink-0 relative z-10">
                {/* Stats */}
                <div className="hidden lg:flex flex-col items-end gap-0.5 text-[11px] font-black uppercase tracking-tighter">
                    <span className={cn(
                        "px-1.5 rounded",
                        term.confidence > 80 ? "text-emerald-500 bg-emerald-500/5" : "text-amber-500 bg-amber-500/5"
                    )}>
                        {term.confidence}% Match
                    </span>
                    <span className="text-muted-foreground/30">Heuristic Signal</span>
                </div>

                <div className="flex items-center gap-2">
                    {!term.isApproved && (
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={isScanning}
                            className="h-10 w-10 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 rounded-2xl transition-all"
                            onClick={() => onDelete(term.id!)}
                        >
                            <Trash2 className="h-4.5 w-4.5" />
                        </Button>
                    )}

                    {!term.isApproved ? (
                        <Button
                            variant="default"
                            size="sm"
                            disabled={isScanning}
                            className="h-10 px-6 text-xs font-black uppercase tracking-widest bg-foreground hover:bg-primary text-background hover:text-primary-foreground rounded-2xl shadow-lg shadow-black/10 transition-all active:scale-95 group/btn"
                            onClick={() => onApprove(term.id!)}
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2 group-hover/btn:animate-pulse" />
                            Chốt
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20 shadow-inner">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-[11px] font-black uppercase tracking-widest">Đã Duyệt</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
