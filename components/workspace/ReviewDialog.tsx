"use client";

import React, { useState, useEffect } from "react";
import { GlossaryCharacter, GlossaryTerm } from "@/lib/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Sparkles, User, Filter, Save, ShieldBan, X } from "lucide-react";
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
    title = "Duyệt kết quả quét AI",
    description = "Kiểm tra lại các nhân vật và thuật ngữ AI vừa tìm thấy trước khi lưu vào từ điển."
}: ReviewDialogProps) {
    const [pendingCharacters, setPendingCharacters] = useState<GlossaryCharacter[]>([]);
    const [pendingTerms, setPendingTerms] = useState<GlossaryTerm[]>([]);

    useEffect(() => {
        if (open) {
            setPendingCharacters(initialCharacters.map(c => ({ ...c, status: 'save' })));
            setPendingTerms(initialTerms.map(t => ({ ...t, status: 'save' })));
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[85vh] flex flex-col bg-[#1e1e2e] border-white/10 text-white p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="p-6 pb-2 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        {title}
                    </DialogTitle>
                    <DialogDescription className="text-white/40">
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 min-h-0 px-6">
                    <div className="py-4 space-y-8">
                        {/* Characters Section */}
                        {pendingCharacters.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                                        <User className="w-4 h-4" /> Nhân vật ({pendingCharacters.length})
                                    </h3>
                                    <div className="flex items-center gap-4 text-[10px] text-white/30">
                                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500/50" /> Mới</div>
                                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500/50" /> Đã có</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {pendingCharacters.map((char, i) => (
                                        <div key={i} className={cn(
                                            "p-4 rounded-lg border transition-all",
                                            char.status === 'save' ? "bg-white/5 border-white/10" :
                                                char.status === 'blacklist' ? "bg-red-500/10 border-red-500/20" :
                                                    "bg-transparent border-white/5 opacity-50"
                                        )}>
                                            <div className="flex gap-4">
                                                <div className="flex flex-col gap-2 pt-1">
                                                    <Checkbox
                                                        checked={char.status === 'save'}
                                                        onCheckedChange={(checked) => {
                                                            const newChars = [...pendingCharacters];
                                                            newChars[i].status = checked ? 'save' : 'ignore';
                                                            setPendingCharacters(newChars);
                                                        }}
                                                        className="border-white/20 data-[state=checked]:bg-purple-500"
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className={cn(
                                                            "h-4 w-4 rounded-full p-0 hover:bg-red-500/20",
                                                            char.status === 'blacklist' ? "text-red-500 bg-red-500/10" : "text-white/20"
                                                        )}
                                                        onClick={() => {
                                                            const newChars = [...pendingCharacters];
                                                            newChars[i].status = newChars[i].status === 'blacklist' ? 'ignore' : 'blacklist';
                                                            setPendingCharacters(newChars);
                                                        }}
                                                        title="Blacklist (Chặn từ này)"
                                                    >
                                                        <ShieldBan className="h-3 w-3" />
                                                    </Button>
                                                </div>

                                                <div className="flex-1 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className={cn("flex items-center gap-3", char.status === 'blacklist' && "line-through opacity-50")}>
                                                            <span className="font-serif text-lg leading-none">{char.original}</span>
                                                            <span className="text-white/40">→</span>
                                                            <span className="font-bold text-lg leading-none text-emerald-400">{char.translated}</span>
                                                            {char.isExisting && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">Đã có</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-white/50">{char.gender}</span>
                                                            <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-white/50">{char.role}</span>
                                                        </div>
                                                    </div>
                                                    {char.status === 'save' && (
                                                        <Textarea
                                                            className="text-xs bg-black/20 border-white/5 focus:border-purple-500/50 min-h-[40px] h-[40px] resize-none"
                                                            value={char.description}
                                                            onChange={(e) => {
                                                                const newChars = [...pendingCharacters];
                                                                newChars[i].description = e.target.value;
                                                                setPendingCharacters(newChars);
                                                            }}
                                                            placeholder="Mô tả nhân vật..."
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Terms Section */}
                        {pendingTerms.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                    <Filter className="w-4 h-4" /> Thuật ngữ ({pendingTerms.length})
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {pendingTerms.map((term, i) => (
                                        <div key={i} className={cn(
                                            "p-3 rounded-lg border flex items-center gap-3 transition-opacity",
                                            term.status === 'save' ? "bg-white/5 border-white/10" :
                                                term.status === 'blacklist' ? "bg-red-500/10 border-red-500/20" :
                                                    "bg-transparent border-white/5 opacity-50"
                                        )}>
                                            <div className="flex flex-col gap-1">
                                                <Checkbox
                                                    checked={term.status === 'save'}
                                                    onCheckedChange={(checked) => {
                                                        const newTerms = [...pendingTerms];
                                                        newTerms[i].status = checked ? 'save' : 'ignore';
                                                        setPendingTerms(newTerms);
                                                    }}
                                                    className="border-white/20 data-[state=checked]:bg-amber-500"
                                                />
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className={cn(
                                                        "h-3 w-3 rounded-full p-0 hover:bg-red-500/20",
                                                        term.status === 'blacklist' ? "text-red-500 bg-red-500/10" : "text-white/20"
                                                    )}
                                                    onClick={() => {
                                                        const newTerms = [...pendingTerms];
                                                        newTerms[i].status = newTerms[i].status === 'blacklist' ? 'ignore' : 'blacklist';
                                                        setPendingTerms(newTerms);
                                                    }}
                                                    title="Blacklist"
                                                >
                                                    <ShieldBan className="h-2.5 w-2.5" />
                                                </Button>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={cn("flex items-center justify-between mb-1", term.status === 'blacklist' && "line-through opacity-50")}>
                                                    <span className="font-serif text-sm truncate">{term.original}</span>
                                                    <span className="text-[10px] text-white/30">{term.type}</span>
                                                </div>
                                                {term.status !== 'blacklist' && (
                                                    <Input
                                                        className="h-7 text-xs bg-black/20 border-white/5 text-emerald-400 font-bold"
                                                        value={term.translated}
                                                        onChange={(e) => {
                                                            const newTerms = [...pendingTerms];
                                                            newTerms[i].translated = e.target.value;
                                                            setPendingTerms(newTerms);
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="p-6 bg-black/20 border-t border-white/5 flex items-center justify-between shrink-0">
                    <div className="text-xs text-white/30">
                        Sẽ lưu: <span className="text-emerald-400 font-bold">{pendingCharacters.filter(c => c.status === 'save').length + pendingTerms.filter(t => t.status === 'save').length}</span> từ,
                        Blacklist: <span className="text-red-400 font-bold ml-1">{pendingCharacters.filter(c => c.status === 'blacklist').length + pendingTerms.filter(t => t.status === 'blacklist').length}</span> từ
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>Hủy bỏ</Button>
                        <Button className="bg-[#6c5ce7] hover:bg-[#5b4cc4] px-8" onClick={handleConfirmSave}>
                            <Save className="w-4 h-4 mr-2" /> Lưu tất cả
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
