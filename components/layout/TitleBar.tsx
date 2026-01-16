"use client";

import React, { useEffect, useState } from "react";
import { X, Minus, Square, Copy } from "lucide-react";

export function TitleBar() {
    const [isMaximized, setIsMaximized] = useState(false);
    const [isTauri, setIsTauri] = useState(false);

    useEffect(() => {
        const checkTauri = async () => {
            if (typeof window !== 'undefined' && (window as any).__TAURI__) {
                setIsTauri(true);
                try {
                    const { getCurrentWindow } = await import("@tauri-apps/api/window");
                    const appWindow = getCurrentWindow();

                    const updateMaximized = async () => {
                        setIsMaximized(await appWindow.isMaximized());
                    };

                    updateMaximized();
                    const unlisten = await appWindow.onResized(updateMaximized);
                    return () => { unlisten(); };
                } catch (e) {
                    console.error("Tauri API error:", e);
                }
            }
        };
        checkTauri();
    }, []);

    if (!isTauri) return null;

    const handleMinimize = async () => {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().minimize();
    };

    const handleMaximize = async () => {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().toggleMaximize();
    };

    const handleClose = async () => {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        await getCurrentWindow().close();
    };

    return (
        <div
            data-tauri-drag-region
            className="h-10 w-full bg-transparent flex items-center justify-between px-4 select-none shrink-0 fixed top-0 left-0 z-[9999]"
        >
            <div className="flex items-center gap-2 pointer-events-none">
                <div className="w-4 h-4 rounded-sm bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe] flex items-center justify-center text-[8px] font-black text-white">R</div>
                <span className="text-[10px] uppercase font-black tracking-widest text-white/40 italic">Raiden AI Translator</span>
            </div>

            <div className="flex items-center h-full">
                <button
                    onClick={handleMinimize}
                    className="h-full px-4 hover:bg-white/5 text-white/40 hover:text-white transition-colors flex items-center"
                >
                    <Minus className="w-3 h-3" />
                </button>
                <button
                    onClick={handleMaximize}
                    className="h-full px-4 hover:bg-white/5 text-white/40 hover:text-white transition-colors flex items-center"
                >
                    {isMaximized ? <Copy className="w-2.5 h-2.5" /> : <Square className="w-2.5 h-2.5" />}
                </button>
                <button
                    onClick={handleClose}
                    className="h-full px-4 hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-colors flex items-center"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
