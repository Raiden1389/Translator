"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface OriginalPaneProps {
    sourceLang?: string;
    renderedText: React.ReactNode;
    onSetDictionary: (text: string) => void;
    onOpenDictionary: () => void;
}

export function OriginalPane({
    sourceLang,
    renderedText,
    onSetDictionary,
    onOpenDictionary
}: OriginalPaneProps) {
    return (
        <div className={cn("flex flex-col border-r border-white/10 min-h-0", "reader-column")}>
            <div className="h-10 border-b border-white/5 flex items-center px-4 bg-[#1e1e2e]/50 shrink-0">
                <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Original ({sourceLang})</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <ContextMenu>
                    <ContextMenuTrigger asChild>
                        <div className={cn("w-full min-h-full p-6 md:p-10 pb-0 text-lg leading-loose tracking-wide text-white/90 font-lora whitespace-pre-wrap", "reader-text")}>
                            {renderedText}
                        </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="bg-[#2b2b40] border-white/10 text-white">
                        <ContextMenuItem
                            className="focus:bg-primary focus:text-white cursor-pointer"
                            onSelect={() => {
                                onSetDictionary("");
                                onOpenDictionary();
                            }}
                        >
                            Sửa nghĩa (Vietphrase)
                        </ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>
            </div>
        </div>
    );
}
