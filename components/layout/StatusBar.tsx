"use client";

import React from "react";
import { Wifi, Database, CheckCircle2, DollarSign } from "lucide-react";
import packageJson from "@/package.json";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export function StatusBar() {
    const apiUsage = useLiveQuery(() => db.apiUsage.toArray()) || [];
    const totalCostUSD = apiUsage.reduce((acc, curr) => acc + (curr.totalCost || 0), 0);

    return (
        <footer className="h-7 w-full bg-sidebar border-t border-sidebar-border flex items-center justify-between px-4 select-none shrink-0 text-[10px] text-sidebar-foreground/40 font-mono">
            <div className="flex items-center gap-4">
                <span className="hover:text-sidebar-foreground/60 transition-colors">v{packageJson.version}</span>
                <div className="h-3 w-px bg-sidebar-border" />
                <div className="flex items-center gap-1.5 hover:text-sidebar-foreground/60 transition-colors">
                    <Wifi className="w-3 h-3" />
                    <span>Connected</span>
                </div>
                <div className="h-3 w-px bg-sidebar-border" />
                <div className="flex items-center gap-1.5 text-primary/60">
                    <DollarSign className="w-3 h-3" />
                    <span>API Cost: ${totalCostUSD.toFixed(3)}</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                    <Database className="w-3 h-3" />
                    <span>Local DB: Dexie</span>
                </div>
                <div className="h-3 w-px bg-sidebar-border" />
                <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>System Ready</span>
                </div>
            </div>
        </footer>
    );
}
