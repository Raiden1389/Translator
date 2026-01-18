"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DIC_TYPES } from "./DictionaryToolbar";

interface DictionaryAddFormProps {
    newOriginal: string;
    newTranslated: string;
    newType: string;
    onOriginalChange: (value: string) => void;
    onTranslatedChange: (value: string) => void;
    onTypeChange: (value: string) => void;
    onAdd: () => void;
}

export function DictionaryAddForm({
    newOriginal,
    newTranslated,
    newType,
    onOriginalChange,
    onTranslatedChange,
    onTypeChange,
    onAdd
}: DictionaryAddFormProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-primary/10 p-4 rounded-lg border border-primary/30 shadow-lg mb-4">
            <div className="md:col-span-3">
                <Input
                    placeholder="Thuật ngữ gốc (Trung)..."
                    className="bg-background border-border text-foreground font-serif"
                    value={newOriginal}
                    onChange={(e) => onOriginalChange(e.target.value)}
                    autoFocus
                />
            </div>
            <div className="md:col-span-4">
                <Input
                    placeholder="Bản dịch (Việt)..."
                    className="bg-background border-border text-foreground font-bold"
                    value={newTranslated}
                    onChange={(e) => onTranslatedChange(e.target.value)}
                />
            </div>
            <div className="md:col-span-3">
                <Select value={newType} onValueChange={onTypeChange}>
                    <SelectTrigger className="bg-background border-border text-foreground">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                        {DIC_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${t.color}`} />
                                    {t.label}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="md:col-span-2">
                <Button className="w-full bg-primary hover:bg-primary/90" onClick={onAdd}>Lưu</Button>
            </div>
        </div>
    );
}
