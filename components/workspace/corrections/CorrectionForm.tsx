"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CorrectionFormProps {
    type: 'replace' | 'wrap' | 'regex';
    setType: (t: 'replace' | 'wrap' | 'regex') => void;
    field1: string; // From / Target / Pattern
    field2: string; // To / Open / Replace
    field3: string; // Close (Wrap only)
    onField1Change: (value: string) => void;
    onField2Change: (value: string) => void;
    onField3Change: (value: string) => void;
    onAdd: () => void;
}

export function CorrectionForm({
    type, setType,
    field1, onField1Change,
    field2, onField2Change,
    field3, onField3Change,
    onAdd
}: CorrectionFormProps) {
    return (
        <div className="bg-amber-500/10 p-4 rounded-lg border border-amber-500/30 shadow-lg mb-4 space-y-4">
            {/* Type Selector */}
            <div className="flex bg-muted/20 p-1 rounded-lg w-fit">
                {[
                    { value: 'replace', label: 'Thay thế' },
                    { value: 'wrap', label: 'Bọc (Wrap)' },
                    { value: 'regex', label: 'Regex' }
                ].map((t) => (
                    <button
                        key={t.value}
                        onClick={() => setType(t.value as any)}
                        className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${type === t.value ? 'bg-amber-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                {type === 'replace' && (
                    <>
                        <div className="md:col-span-5">
                            <Input
                                placeholder="Từ sai (Ví dụ: Thiên Linh Kiếm)..."
                                className="bg-background border-border text-foreground"
                                value={field1}
                                onChange={(e) => onField1Change(e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-1 flex items-center justify-center text-muted-foreground pb-2">➔</div>
                        <div className="md:col-span-4">
                            <Input
                                placeholder="Từ đúng..."
                                className="bg-background border-border text-foreground font-bold"
                                value={field2}
                                onChange={(e) => onField2Change(e.target.value)}
                            />
                        </div>
                    </>
                )}

                {type === 'wrap' && (
                    <>
                        <div className="md:col-span-4">
                            <Input
                                placeholder="Target (Ví dụ: Hiệu ứng:)..."
                                className="bg-background border-border text-foreground"
                                value={field1}
                                onChange={(e) => onField1Change(e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-3">
                            <Input
                                placeholder="Open ([)..."
                                className="bg-background border-border text-foreground font-mono"
                                value={field2}
                                onChange={(e) => onField2Change(e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-3">
                            <Input
                                placeholder="Close (])..."
                                className="bg-background border-border text-foreground font-mono"
                                value={field3}
                                onChange={(e) => onField3Change(e.target.value)}
                            />
                        </div>
                    </>
                )}

                {type === 'regex' && (
                    <>
                        <div className="md:col-span-5">
                            <Input
                                placeholder="Pattern ((\d+) phút)..."
                                className="bg-background border-border text-foreground font-mono text-sm"
                                value={field1}
                                onChange={(e) => onField1Change(e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-1 flex items-center justify-center text-muted-foreground pb-2">➔</div>
                        <div className="md:col-span-4">
                            <Input
                                placeholder="Replacement ($1 phút)..."
                                className="bg-background border-border text-foreground font-mono text-sm"
                                value={field2}
                                onChange={(e) => onField2Change(e.target.value)}
                            />
                        </div>
                    </>
                )}

                <div className="md:col-span-2">
                    <Button
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold"
                        onClick={onAdd}
                    >
                        Thêm
                    </Button>
                </div>
            </div>
        </div>
    );
}
