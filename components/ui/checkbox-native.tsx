"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CheckboxNativeProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    className?: string;
    disabled?: boolean;
    onClick?: (e: React.MouseEvent) => void;
}

export const CheckboxNative = React.forwardRef<HTMLInputElement, CheckboxNativeProps>(
    ({ checked, onChange, className, disabled, onClick }, ref) => {
        return (
            <input
                ref={ref}
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                onClick={onClick}
                disabled={disabled}
                className={cn(
                    // Base styles - matching Radix
                    "peer h-4 w-4 shrink-0 rounded-sm border cursor-pointer",
                    "ring-offset-background",

                    // Focus state
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",

                    // Disabled state
                    "disabled:cursor-not-allowed disabled:opacity-50",

                    // Remove native appearance
                    "appearance-none",

                    // Checked state background
                    "checked:bg-primary checked:border-primary",

                    // Checkmark icon (pure CSS)
                    "relative",
                    "checked:after:content-[''] checked:after:absolute",
                    "checked:after:left-[3px] checked:after:top-[0px]",
                    "checked:after:w-[6px] checked:after:h-[10px]",
                    "checked:after:border-white checked:after:border-r-[2.5px] checked:after:border-b-[2.5px]",
                    "checked:after:rotate-45",

                    // Smooth transitions
                    "transition-colors duration-150 ease-out",

                    className
                )}
            />
        );
    }
);

CheckboxNative.displayName = "CheckboxNative";
