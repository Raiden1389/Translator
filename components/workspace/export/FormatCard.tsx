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

export function FormatCard({ id, label, description, icon: Icon, isActive, onClick }: FormatCardProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-start gap-4 p-4 rounded-xl border text-left transition-all group relative overflow-hidden h-full",
                isActive
                    ? "bg-amber-500/10 border-amber-500 ring-1 ring-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
            )}
        >
            <div className={cn(
                "p-3 rounded-lg flex-shrink-0 transition-colors",
                isActive ? "bg-amber-500 text-white" : "bg-white/5 text-white/50 group-hover:bg-white/10"
            )}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <div className={cn(
                    "font-bold text-white transition-colors",
                    isActive ? "text-amber-500" : "group-hover:text-amber-500/80"
                )}>
                    {label}
                </div>
                <div className="text-[11px] text-white/40 mt-1 leading-relaxed">
                    {description}
                </div>
            </div>
            {isActive && (
                <div className="absolute top-2 right-2">
                    <Check className="w-4 h-4 text-amber-500" />
                </div>
            )}
        </button>
    );
}
