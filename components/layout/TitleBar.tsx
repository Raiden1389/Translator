"use client";

import { X, Minus, Square } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

export function TitleBar() {
    const [appWindow, setAppWindow] = useState<any>(null);

    useEffect(() => {
        setAppWindow(getCurrentWindow());
    }, []);

    const handleMinimize = () => appWindow?.minimize();
    const handleMaximize = () => appWindow?.toggleMaximize();
    const handleClose = () => appWindow?.close();

    return (
        <div
            data-tauri-drag-region
            className="h-8 bg-black/40 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 select-none shrink-0 cursor-move"
        >
            <div className="flex items-center gap-2 pointer-events-none">
                <div className="w-2 h-2 rounded-full bg-gradient-to-br from-purple-500 to-blue-500" />
                <span className="text-xs text-white/60 font-medium">Raiden AI Translator</span>
            </div>

            <div className="flex items-center gap-1 pointer-events-auto">
                <button
                    onClick={handleMinimize}
                    className="w-8 h-6 flex items-center justify-center hover:bg-white/10 rounded transition-colors"
                >
                    <Minus className="w-3 h-3 text-white/60" />
                </button>
                <button
                    onClick={handleMaximize}
                    className="w-8 h-6 flex items-center justify-center hover:bg-white/10 rounded transition-colors"
                >
                    <Square className="w-3 h-3 text-white/60" />
                </button>
                <button
                    onClick={handleClose}
                    className="w-8 h-6 flex items-center justify-center hover:bg-red-500/80 rounded transition-colors group"
                >
                    <X className="w-3 h-3 text-white/60 group-hover:text-white" />
                </button>
            </div>
        </div>
    );
}
