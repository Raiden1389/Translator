"use client";

import React, { useState, useEffect } from "react";
import { GlossaryCharacter, GlossaryTerm } from "@/lib/types";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ShieldBan, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    characters: GlossaryCharacter[];
    terms: GlossaryTerm[];
    onSave: (
        saveChars: GlossaryCharacter[],
        saveTerms: GlossaryTerm[],
        blacklistChars: GlossaryCharacter[],
        blacklistTerms: GlossaryTerm[]
    ) => void;
    title?: string;
    description?: string;
}

export function ReviewDialog({
    open,
    onOpenChange,
    characters: initialCharacters,
    terms: initialTerms,
    onSave,
    title = "Duyệt kết quả quét AI"
}: ReviewDialogProps) {
    const [pendingCharacters, setPendingCharacters] = useState<GlossaryCharacter[]>([]);
    const [pendingTerms, setPendingTerms] = useState<GlossaryTerm[]>([]);

    useEffect(() => {
        if (open) {
            // Defer to avoid cascading renders warning from React Compiler
            const timer = setTimeout(() => {
                setPendingCharacters(initialCharacters.map(c => ({ ...c, status: 'save' })));
                setPendingTerms(initialTerms.map(t => ({ ...t, status: 'save' })));
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [open, initialCharacters, initialTerms]);

    const handleConfirmSave = () => {
        const saveChars = pendingCharacters.filter(c => c.status === 'save');
        const blacklistChars = pendingCharacters.filter(c => c.status === 'blacklist');

        const saveTerms = pendingTerms.filter(t => t.status === 'save');
        const blacklistTerms = pendingTerms.filter(t => t.status === 'blacklist');

        onSave(saveChars, saveTerms, blacklistChars, blacklistTerms);
        onOpenChange(false);
    };

    const totalCount = pendingCharacters.length + pendingTerms.length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl h-[80vh] flex flex-col bg-background border border-border/40 p-0 overflow-hidden shadow-2xl rounded-md [&>button]:hidden focus:outline-none">
                <DialogHeader className="px-5 py-3 border-b border-border/50 bg-background flex-row items-center justify-between space-y-0">
                    <DialogTitle className="text-sm font-bold tracking-tight">
                        {title} <span className="text-muted-foreground/40 font-medium ml-1">({totalCount})</span>
                    </DialogTitle>
                    <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-6 w-6 opacity-40 hover:opacity-100">
                        <X className="w-4 h-4" />
                    </Button>
                </DialogHeader>

                <ScrollArea className="flex-1">
                    <div className="divide-y divide-border/10">
                        {/* Section: Characters */}
                        {pendingCharacters.length > 0 && (
                            <div>
                                <div className="px-5 py-1.5 bg-muted/20 border-b border-border/5">
                                    <span className="text-[10px] font-bold text-muted-foreground/90 uppercase tracking-wider">Nhân vật</span>
                                </div>
                                <div className="divide-y divide-border/5">
                                    {pendingCharacters.map((char, i) => (
                                        <div key={i} className={cn(
                                            "flex items-center gap-3 px-5 h-[38px] transition-all group relative",
                                            char.status === 'save' && "bg-primary/1",
                                            char.status === 'blacklist' ? "bg-red-500/2 opacity-50" : "hover:bg-muted/30",
                                            char.status === 'ignore' && "opacity-40"
                                        )}>
                                            {/* Pro Selection Indicator */}
                                            {char.status === 'save' && (
                                                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary/60" />
                                            )}

                                            <div className="flex items-center gap-1 shrink-0">
                                                <Checkbox
                                                    checked={char.status === 'save'}
                                                    onCheckedChange={(checked) => {
                                                        const newItems = [...pendingCharacters];
                                                        newItems[i].status = checked ? 'save' : 'ignore';
                                                        setPendingCharacters(newItems);
                                                    }}
                                                    className={cn(
                                                        "h-3.5 w-3.5 rounded-sm border-border transition-colors",
                                                        char.status === 'save' ? "data-[state=checked]:bg-primary/80 data-[state=checked]:border-primary/20" : "opacity-40"
                                                    )}
                                                />
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className={cn(
                                                        "h-6 w-6 rounded opacity-0 group-hover:opacity-100",
                                                        char.status === 'blacklist' ? "text-red-500 opacity-100" : "text-muted-foreground/20 hover:text-red-500"
                                                    )}
                                                    onClick={() => {
                                                        const newItems = [...pendingCharacters];
                                                        newItems[i].status = newItems[i].status === 'blacklist' ? 'ignore' : 'blacklist';
                                                        setPendingCharacters(newItems);
                                                    }}
                                                >
                                                    <ShieldBan className="h-3 w-3" />
                                                </Button>
                                            </div>

                                            <div className="flex-1 flex items-center gap-4 min-w-0 pr-4">
                                                <span className={cn(
                                                    "font-serif text-base shrink-0 text-foreground transition-opacity leading-none",
                                                    char.status === 'blacklist' && "line-through opacity-40"
                                                )}>
                                                    {char.original}
                                                </span>
                                                <span className="text-muted-foreground/40 text-[10px] select-none pb-0.5">·</span>
                                                <Input
                                                    value={char.translated}
                                                    onChange={(e) => {
                                                        const newItems = [...pendingCharacters];
                                                        newItems[i].translated = e.target.value;
                                                        setPendingCharacters(newItems);
                                                    }}
                                                    className="h-full text-sm font-normal text-primary/70 bg-transparent border-none focus-visible:ring-0 p-0 truncate hover:text-primary transition-colors selection:bg-primary/20 leading-none"
                                                />
                                            </div>

                                            {char.isExisting && (
                                                <span className="shrink-0 text-[8px] font-black text-blue-500/20 uppercase tracking-tighter mr-2">Exist</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Section: Terms */}
                        {pendingTerms.length > 0 && (
                            <div>
                                <div className="px-5 py-1.5 bg-muted/20 border-b border-border/5">
                                    <span className="text-[10px] font-bold text-muted-foreground/90 uppercase tracking-wider">Thuật ngữ</span>
                                </div>
                                <div className="divide-y divide-border/5">
                                    {pendingTerms.map((term, i) => (
                                        <div key={i} className={cn(
                                            "flex items-center gap-3 px-5 h-[38px] transition-all group relative",
                                            term.status === 'save' && "bg-primary/1",
                                            term.status === 'blacklist' ? "bg-red-500/2 opacity-50" : "hover:bg-muted/30",
                                            term.status === 'ignore' && "opacity-40"
                                        )}>
                                            {/* Pro Selection Indicator */}
                                            {term.status === 'save' && (
                                                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary/60" />
                                            )}

                                            <div className="flex items-center gap-1 shrink-0">
                                                <Checkbox
                                                    checked={term.status === 'save'}
                                                    onCheckedChange={(checked) => {
                                                        const newItems = [...pendingTerms];
                                                        newItems[i].status = checked ? 'save' : 'ignore';
                                                        setPendingTerms(newItems);
                                                    }}
                                                    className={cn(
                                                        "h-3.5 w-3.5 rounded-sm border-border transition-colors",
                                                        term.status === 'save' ? "data-[state=checked]:bg-primary/80 data-[state=checked]:border-primary/20" : "opacity-40"
                                                    )}
                                                />
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className={cn(
                                                        "h-6 w-6 rounded opacity-0 group-hover:opacity-100",
                                                        term.status === 'blacklist' ? "text-red-500 opacity-100" : "text-muted-foreground/20 hover:text-red-500"
                                                    )}
                                                    onClick={() => {
                                                        const newItems = [...pendingTerms];
                                                        newItems[i].status = newItems[i].status === 'blacklist' ? 'ignore' : 'blacklist';
                                                        setPendingTerms(newItems);
                                                    }}
                                                >
                                                    <ShieldBan className="h-3 w-3" />
                                                </Button>
                                            </div>

                                            <div className="flex-1 flex items-center gap-4 min-w-0 pr-4">
                                                <span className={cn(
                                                    "font-serif text-base shrink-0 text-foreground transition-opacity leading-none",
                                                    term.status === 'blacklist' && "line-through opacity-40"
                                                )}>
                                                    {term.original}
                                                </span>
                                                <span className="text-muted-foreground/40 text-[10px] select-none pb-0.5">·</span>
                                                <Input
                                                    value={term.translated}
                                                    onChange={(e) => {
                                                        const newItems = [...pendingTerms];
                                                        newItems[i].translated = e.target.value;
                                                        setPendingTerms(newItems);
                                                    }}
                                                    className="h-full text-sm font-normal text-primary/70 bg-transparent border-none focus-visible:ring-0 p-0 truncate hover:text-primary transition-colors selection:bg-primary/20 leading-none"
                                                />
                                            </div>

                                            <span className="shrink-0 text-[8px] font-bold text-muted-foreground/20 uppercase italic mr-2 tracking-widest">
                                                {term.type}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="px-5 py-3 border-t border-border/50 flex items-center justify-between sm:justify-between shrink-0">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground/40 font-medium tracking-tight">
                        <span className="text-foreground/60">{pendingCharacters.filter(c => c.status === 'save').length + pendingTerms.filter(t => t.status === 'save').length} mục sẽ lưu</span>
                        <span className="opacity-30">/</span>
                        <span>{pendingCharacters.filter(c => c.status === 'blacklist').length + pendingTerms.filter(t => t.status === 'blacklist').length} chặn</span>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-7 px-3 text-[11px] font-medium opacity-50 hover:opacity-100">Hủy</Button>
                        <Button className="h-8 px-5 text-[11px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded shadow-sm shadow-primary/10 transition-all active:scale-95" onClick={handleConfirmSave}>
                            Lưu cấu hình
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
