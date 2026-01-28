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
                "flex items-start gap-4 p-4 rounded-xl border text-left transition-all group relative overflow-hidden h-full",
                isActive
                    ? "bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 shadow-sm"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
            )}
        >
            <div className={cn(
                "p-3 rounded-lg shrink-0 transition-colors",
                isActive ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-slate-200 text-slate-500 group-hover:bg-slate-300"
            )}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <div className={cn(
                    "font-bold text-slate-900 transition-colors",
                    isActive ? "text-indigo-700" : "group-hover:text-slate-900"
                )}>
                    {label}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {description}
                </div>
            </div>
            {isActive && (
                <div className="absolute top-3 right-3">
                    <Check className="w-4 h-4 text-indigo-600" />
                </div>
            )}
        </button>
    );
}
