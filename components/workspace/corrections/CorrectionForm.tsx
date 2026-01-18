"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CorrectionFormProps {
    newWrong: string;
    newRight: string;
    onWrongChange: (value: string) => void;
    onRightChange: (value: string) => void;
    onAdd: () => void;
}

export function CorrectionForm({
    newWrong,
    newRight,
    onWrongChange,
    onRightChange,
    onAdd
}: CorrectionFormProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-amber-500/10 p-4 rounded-lg border border-amber-500/30 shadow-lg mb-4">
            <div className="md:col-span-4">
                <Input
                    placeholder="Từ sai (Ví dụ: Thiên Linh Kiếm)..."
                    className="bg-background border-border text-foreground"
                    value={newWrong}
                    onChange={(e) => onWrongChange(e.target.value)}
                />
            </div>
            <div className="md:col-span-1 flex items-center justify-center text-muted-foreground">
                ➔
            </div>
            <div className="md:col-span-5">
                <Input
                    placeholder="Từ đúng (Ví dụ: Thiên Minh Kiếm)..."
                    className="bg-background border-border text-foreground font-bold"
                    value={newRight}
                    onChange={(e) => onRightChange(e.target.value)}
                />
            </div>
            <div className="md:col-span-2">
                <Button
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={onAdd}
                >
                    Thêm
                </Button>
            </div>
        </div>
    );
}
