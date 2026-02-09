"use client";

import { cn } from "@/lib/utils";
import { Check, LucideIcon } from "lucide-react";

interface FormatCardProps {
    id: string;
    label: string;
    description: string;
    icon: LucideIcon;
    isActive: boolean;
    onClick: () => void;
}

export function FormatCard({ label, description, icon: Icon, isActive, onClick }: FormatCardProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-start gap-4 p-4 rounded-xl border text-left transition-all group relative overflow-hidden h-full shadow-sm",
                isActive
                    ? "bg-primary/5 border-primary ring-1 ring-primary shadow-primary/10"
                    : "bg-card border-border hover:bg-muted/80 hover:border-border/80"
            )}
        >
            <div className={cn(
                "p-3 rounded-lg shrink-0 transition-all",
                isActive ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105" : "bg-muted text-muted-foreground group-hover:bg-muted/80"
            )}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <div className={cn(
                    "font-bold transition-colors",
                    isActive ? "text-primary" : "text-foreground group-hover:text-primary"
                )}>
                    {label}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    {description}
                </div>
            </div>
            {isActive && (
                <div className="absolute top-3 right-3">
                    <Check className="w-4 h-4 text-primary" />
                </div>
            )}
        </button>
    );
}
