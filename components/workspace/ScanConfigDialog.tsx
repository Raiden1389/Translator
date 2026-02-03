'use client';

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, User, MapPin, Zap, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TermType } from "@/lib/services/name-hunter/types";

interface ScanConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onStart: (selectedTypes: TermType[]) => void;
}

const SELECTION_ITEMS = [
    {
        id: TermType.Person,
        label: 'Nhân vật',
        icon: User,
        color: 'blue',
        bg: 'bg-blue-50/50',
        border: 'border-blue-200',
        iconColor: 'text-blue-500',
    },
    {
        id: TermType.Location,
        label: 'Địa danh',
        icon: MapPin,
        color: 'emerald',
        bg: 'bg-emerald-50/50',
        border: 'border-emerald-200',
        iconColor: 'text-emerald-500',
    },
    {
        id: TermType.Skill,
        label: 'Công pháp / Kỹ năng',
        icon: Zap,
        color: 'amber',
        bg: 'bg-amber-50/50',
        border: 'border-amber-200',
        iconColor: 'text-amber-500',
    },
    {
        id: TermType.Organization,
        label: 'Tổ chức / Thế lực',
        icon: Users,
        color: 'purple',
        bg: 'bg-purple-50/50',
        border: 'border-purple-200',
        iconColor: 'text-purple-500',
    },
] as const;

export function ScanConfigDialog({ open, onOpenChange, onStart }: ScanConfigDialogProps) {
    const [selected, setSelected] = useState<TermType[]>([
        TermType.Person,
        TermType.Location,
        TermType.Skill,
        TermType.Organization
    ]);

    const toggle = (type: TermType) => {
        setSelected(prev =>
            prev.includes(type)
                ? prev.filter(t => t !== type)
                : [...prev, type]
        );
    };

    const hasSelection = selected.length > 0;

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 animate-in fade-in duration-300" />
                <Dialog.Content
                    className={cn(
                        "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[480px]",
                        "bg-white rounded-3xl shadow-2xl p-8 z-50 outline-none",
                        "animate-in zoom-in-95 fade-in duration-300"
                    )}
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                <Sparkles size={24} />
                            </div>
                            <Dialog.Title className="text-2xl font-bold text-slate-800">
                                Cấu hình Quét AI
                            </Dialog.Title>
                        </div>
                        <Dialog.Close className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-100">
                            <X size={20} />
                        </Dialog.Close>
                    </div>

                    <Dialog.Description className="text-slate-500 mb-8 ml-11">
                        Chọn các loại thực thể mà ông muốn AI tìm kiếm trong văn bản.
                    </Dialog.Description>

                    <div className="space-y-4 mb-8">
                        {SELECTION_ITEMS.map((item) => {
                            const isActive = selected.includes(item.id);
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => toggle(item.id)}
                                    className={cn(
                                        "w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-200 text-left group",
                                        isActive
                                            ? `${item.bg} ${item.border} border-opacity-100 shadow-sm`
                                            : "bg-white border-slate-100 hover:border-slate-200"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "p-3 rounded-xl transition-colors",
                                            isActive ? item.bg.replace('/50', '') : "bg-slate-50 text-slate-400"
                                        )}>
                                            <item.icon className={cn("transition-colors", isActive ? item.iconColor : "")} size={22} />
                                        </div>
                                        <span className={cn(
                                            "font-semibold text-lg transition-colors",
                                            isActive ? "text-slate-800" : "text-slate-400"
                                        )}>
                                            {item.label}
                                        </span>
                                    </div>
                                    <div className={cn(
                                        "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200",
                                        isActive
                                            ? "bg-blue-600 border-blue-600 text-white"
                                            : "border-slate-300 group-hover:border-slate-400"
                                    )}>
                                        {isActive && (
                                            <svg
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="w-4 h-4"
                                            >
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-end gap-4 mt-4">
                        <button
                            onClick={() => onOpenChange(false)}
                            className="px-6 py-2.5 text-slate-500 font-semibold hover:bg-slate-50 rounded-xl transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            disabled={!hasSelection}
                            onClick={() => {
                                onStart(selected);
                                onOpenChange(false);
                            }}
                            className={cn(
                                "flex items-center gap-2 px-8 py-3 rounded-2xl font-bold text-white transition-all shadow-lg active:scale-95",
                                hasSelection
                                    ? "bg-linear-to-r from-purple-600 to-indigo-600 hover:shadow-purple-200"
                                    : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                            )}
                        >
                            <Sparkles size={18} />
                            Bắt đầu quét
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
