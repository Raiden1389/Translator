"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface EditableCellProps {
    initialValue: string;
    onSave: (val: string) => void;
    className?: string;
    placeholder?: string;
}

export function EditableCell({ initialValue, onSave, className }: EditableCellProps) {
    const [value, setValue] = useState(initialValue);

    // Sync if external prop changes (e.g. bulk update)
    useEffect(() => {
        if (initialValue !== value) {
            const frame = requestAnimationFrame(() => {
                setValue(initialValue);
            });
            return () => cancelAnimationFrame(frame);
        }
    }, [initialValue]); // Removed 'value' from deps

    const handleBlur = () => {
        if (value !== initialValue) {
            onSave(value);
        }
    };

    return (
        <Input
            className={className || "h-8 bg-transparent border-transparent hover:border-border focus:border-primary text-emerald-400 font-bold p-0 px-2 focus-visible:ring-0"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.currentTarget.blur();
                }
            }}
        />
    );
}
