"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal } from "lucide-react";
import { TranslationLog } from "@/lib/gemini";

interface TranslationLogDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    logs: TranslationLog[];
}

export function TranslationLogDialog({ open, onOpenChange, logs }: TranslationLogDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-[#1e1e2e] border-white/10 text-white p-0 overflow-hidden">
                <DialogHeader className="p-4 border-b border-white/10 bg-[#2b2b40]">
                    <DialogTitle className="flex items-center gap-2 text-sm font-mono">
                        <Terminal className="h-4 w-4 text-emerald-500" />
                        AI Translation Log
                    </DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[300px] p-4 font-mono text-xs space-y-2">
                    {logs.map((log, i) => (
                        <div key={i} className={cn(
                            "flex gap-2 items-start opacity-90",
                            log.type === 'error' && "text-red-400",
                            log.type === 'success' && "text-emerald-400",
                            log.type === 'info' && "text-white/70"
                        )}>
                            <span className="text-white/30 shrink-0">[{log.timestamp.toLocaleTimeString()}]</span>
                            <span>{log.message}</span>
                        </div>
                    ))}
                    {logs.length === 0 && <span className="text-white/30 italic">Waiting...</span>}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
