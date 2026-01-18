"use client";

import { X, Minus, Square } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

export function TitleBar() {
    const [appWindow, setAppWindow] = useState<any>(null);

    useEffect(() => {
        try {
            // Check if running in Tauri environment before accessing window API
            if (typeof window !== 'undefined' && 'isTauri' in window) { // heuristic or just try/catch
                // actually just try-catch is enough
            }
            const win = getCurrentWindow();
            setAppWindow(win);
        } catch (e) {
            console.warn("Failed to attach to Tauri window (likely running in browser):", e);
        }
    }, []);

    const handleMinimize = () => appWindow?.minimize();
    const handleMaximize = () => appWindow?.toggleMaximize();
    const handleClose = () => appWindow?.close();

    return (
        <div
            data-tauri-drag-region
            className="h-8 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 select-none shrink-0"
        >
            <div className="flex items-center gap-2 pointer-events-none flex-1">
                <div className="w-2 h-2 rounded-full bg-gradient-to-br from-purple-500 to-blue-500" />
                <span className="text-xs text-sidebar-foreground/60 font-medium">Raiden AI Translator</span>
            </div>

            <div className="flex items-center gap-1 pointer-events-auto">
                <button
                    onClick={handleMinimize}
                    className="w-8 h-6 flex items-center justify-center hover:bg-sidebar-accent/50 rounded transition-colors"
                >
                    <Minus className="w-3 h-3 text-sidebar-foreground/60" />
                </button>
                <button
                    onClick={handleMaximize}
                    className="w-8 h-6 flex items-center justify-center hover:bg-sidebar-accent/50 rounded transition-colors"
                >
                    <Square className="w-3 h-3 text-sidebar-foreground/60" />
                </button>
                <button
                    onClick={handleClose}
                    className="w-8 h-6 flex items-center justify-center hover:bg-destructive/80 rounded transition-colors group"
                >
                    <X className="w-3 h-3 text-sidebar-foreground/60 group-hover:text-destructive-foreground" />
                </button>
            </div>
        </div>
    );
}
