import React, { useLayoutEffect, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface AutoResizeTextareaProps {
    defaultValue: string;
    placeholder: string;
    onSave: (value: string) => void;
    className?: string;
}

export const AutoResizeTextarea = ({ defaultValue, placeholder, onSave, className }: AutoResizeTextareaProps) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [value, setValue] = useState(defaultValue || "");

    // Sync local state when prop changes (e.g. from DB)
    useEffect(() => {
        setValue(defaultValue || "");
    }, [defaultValue]);

    const adjustHeight = () => {
        const el = textareaRef.current;
        if (el) {
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
        }
    };

    // Use LayoutEffect to resize immediately after DOM update but before paint
    useLayoutEffect(() => {
        adjustHeight();
    }, [value]);

    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
        setValue(e.currentTarget.value);
    };

    return (
        <textarea
            ref={textareaRef}
            className={cn(
                "bg-transparent text-foreground text-sm whitespace-pre-wrap w-full border-none focus:ring-0 focus:outline-none resize-none placeholder:text-muted-foreground/30 hover:bg-muted/50 p-1 rounded transition-colors overflow-hidden",
                className
            )}
            value={value}
            placeholder={placeholder}
            onInput={handleInput}
            onBlur={(e) => onSave(e.target.value)}
            rows={1} // Start small
        />
    );
};
