"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface HeaderIconButtonProps {
    icon: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    title?: string;
    children?: React.ReactNode;
    active?: boolean;
}

export function HeaderIconButton({
    icon,
    onClick,
    disabled,
    className,
    title,
    children,
    active
}: HeaderIconButtonProps) {
    const button = (
        <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "w-8 h-8 rounded-none border border-transparent transition-all",
                active && "bg-muted border-border/50 text-foreground",
                "hover:bg-muted/50 hover:border-border/30",
                className
            )}
        >
            {icon}
            {children}
        </Button>
    );

    if (!title) return button;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                {button}
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[9px] font-bold uppercase tracking-widest bg-background border border-border rounded-none shadow-none">
                {title}
            </TooltipContent>
        </Tooltip>
    );
}
