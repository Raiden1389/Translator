"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Edit3, BookOpen } from "lucide-react";

interface TabSwitchProps {
    activeTab: "translated" | "original";
    setActiveTab: (tab: "translated" | "original") => void;
}

export function TabSwitch({ activeTab, setActiveTab }: TabSwitchProps) {
    return (
        <div className="flex border border-border/60 bg-muted/10">
            <button
                onClick={() => setActiveTab("translated")}
                className={cn(
                    "px-4 h-7 text-[10px] font-bold transition-all flex items-center gap-2",
                    "uppercase tracking-widest border-r border-border/40",
                    activeTab === "translated"
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/30"
                )}
            >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Dịch</span>
            </button>

            <button
                onClick={() => setActiveTab("original")}
                className={cn(
                    "px-4 h-7 text-[10px] font-bold transition-all flex items-center gap-2",
                    "uppercase tracking-widest",
                    activeTab === "original"
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/30"
                )}
            >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Gốc</span>
            </button>
        </div>
    );
}
