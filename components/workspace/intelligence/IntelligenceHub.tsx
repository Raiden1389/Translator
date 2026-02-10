"use client";

import React, { useState } from "react";
import {
    Book,
    UserCircle2,
    Wrench,
    ShieldAlert,
    ArrowLeft,
    Compass,
    BrainCircuit
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Real Components
import { DiscoveryModule } from "./DiscoveryModule";
import { DictionaryView } from "../dictionary/tabs/DictionaryView";
import { CharacterTab } from "../CharacterTab";
import { CorrectionsView } from "../dictionary/tabs/CorrectionsView";
import { BlacklistView } from "../dictionary/tabs/BlacklistView";

interface IntelligenceHubProps {
    workspaceId: string;
    onClose?: () => void;
    initialModule?: string;
}

type ModuleType = "discovery" | "glossary" | "persona" | "tuning" | "sanitizer";

export function IntelligenceHub({ workspaceId, onClose, initialModule = "discovery" }: IntelligenceHubProps) {
    const [activeModule, setActiveModule] = useState<ModuleType>(initialModule as ModuleType);

    const navItems = [
        { id: "discovery", label: "Discovery", icon: Compass, sub: "Radar & Scan" },
        { id: "glossary", label: "Glossary", icon: Book, sub: "Thuật ngữ" },
        { id: "persona", label: "Persona", icon: UserCircle2, sub: "Nhân vật" },
        { id: "tuning", label: "Tuning", icon: Wrench, sub: "Cải chính" },
        { id: "sanitizer", label: "Sanitizer", icon: ShieldAlert, sub: "Blacklist" },
    ];

    return (
        <div className="flex h-full bg-background overflow-hidden animate-in slide-in-from-right-4 duration-500">
            {/* 1. INTERNAL SIDEBAR (Mini-Nav) */}
            <aside className="w-64 border-r border-border/40 bg-muted/5 flex flex-col shrink-0 select-none">
                {/* Hub Header */}
                <div className="h-14 flex items-center px-6 border-b border-border/40 justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
                            <BrainCircuit className="w-3 h-3 text-primary" />
                        </div>
                        <span className="font-black text-[10px] uppercase tracking-widest text-foreground">Intelligence hub</span>
                    </div>
                </div>

                {/* Nav List */}
                <nav className="flex-1 py-4 px-3 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeModule === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveModule(item.id as ModuleType)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 rounded-[10px] transition-all duration-200 group relative",
                                    isActive
                                        ? "bg-[#EDEDF3] text-foreground"
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                <Icon className={cn(
                                    "w-4.5 h-4.5 shrink-0 transition-colors",
                                    isActive ? "text-accent" : "opacity-40 group-hover:opacity-70"
                                )} />
                                <div className="flex flex-col items-start truncate overflow-hidden">
                                    <span className="text-xs font-bold leading-tight tracking-tight">{item.label}</span>
                                    <span className={cn(
                                        "text-[9px] font-medium leading-none mt-0.5",
                                        isActive ? "text-muted-foreground" : "text-muted-foreground/30"
                                    )}>
                                        {item.sub}
                                    </span>
                                </div>
                                {isActive && (
                                    <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-accent" />
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Return Button (Portal Back to Library/Reader) */}
                <div className="p-4 border-t border-border/40 bg-muted/10">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="w-full justify-start gap-2 h-9 text-muted-foreground hover:text-foreground hover:bg-background rounded-xl px-3 group"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Trở lại</span>
                    </Button>
                </div>
            </aside>

            {/* 2. MAIN CONTENT AREA (Canvas) */}
            <main className="flex-1 flex flex-col bg-background/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--primary-muted),transparent_40%)] opacity-30 pointer-events-none" />

                {/* Active Module Rendering */}
                <div className="flex-1 flex flex-col p-8 overflow-y-auto relative z-10 custom-scrollbar">
                    <div className="max-w-6xl mx-auto w-full h-full flex flex-col">
                        <div className="mb-8 shrink-0">
                            <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase flex items-center gap-3">
                                {navItems.find(n => n.id === activeModule)?.label}
                                <span className="h-px bg-border flex-1 ml-2 opacity-20" />
                            </h2>
                        </div>

                        <div className="flex-1">
                            {activeModule === "discovery" && <DiscoveryModule workspaceId={workspaceId} />}
                            {activeModule === "glossary" && <DictionaryView workspaceId={workspaceId} onChangeTab={() => { }} />}
                            {activeModule === "persona" && <CharacterTab workspaceId={workspaceId} />}
                            {activeModule === "tuning" && <CorrectionsView workspaceId={workspaceId} />}
                            {activeModule === "sanitizer" && <BlacklistView workspaceId={workspaceId} />}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
