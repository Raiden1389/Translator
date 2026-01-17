"use client";

import React from "react";
import { Wifi, Database, CheckCircle2 } from "lucide-react";

export function StatusBar() {
    return (
        <footer className="h-7 w-full bg-[#0a0514]/95 backdrop-blur-md border-t border-white/5 flex items-center justify-between px-4 select-none shrink-0 text-[10px] text-white/40 font-mono">
            <div className="flex items-center gap-4">
                <span className="hover:text-white/60 transition-colors">v1.0.0-beta.2</span>
                <div className="h-3 w-px bg-white/10" />
                <div className="flex items-center gap-1.5 hover:text-white/60 transition-colors">
                    <Wifi className="w-3 h-3" />
                    <span>Connected</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                    <Database className="w-3 h-3" />
                    <span>Local DB: Dexie</span>
                </div>
                <div className="h-3 w-px bg-white/10" />
                <div className="flex items-center gap-1.5 text-emerald-500/70">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>System Ready</span>
                </div>
            </div>
        </footer>
    );
}
