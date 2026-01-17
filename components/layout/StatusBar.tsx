```javascript
"use client";

import React from "react";
import { Activity } from "lucide-react";
import packageJson from "@/package.json";

export function StatusBar() {
    return (
        <div className="h-6 bg-black/40 backdrop-blur-xl border-t border-white/10 flex items-center justify-between px-4 text-[10px] text-white/30 select-none shrink-0">
            <div className="flex items-center gap-3">
                <span className="hover:text-white/60 transition-colors">v{packageJson.version}</span>
                <div className="w-px h-3 bg-white/10" />
                <div className="flex items-center gap-1.5">
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
