"use client";

import React from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    variant?: "default" | "destructive";
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmText = "Tiếp tục",
    cancelText = "Hủy",
    onConfirm,
    variant = "default"
}: ConfirmDialogProps) {
    const handleConfirm = () => {
        onConfirm();
        onOpenChange(false);
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="bg-[#1a0b2e] border-white/10 text-white">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-bold text-white">
                        {title}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-white/70 text-base whitespace-pre-line">
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                        {cancelText}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        className={
                            variant === "destructive"
                                ? "bg-red-600 hover:bg-red-700 text-white"
                                : "bg-primary hover:bg-primary/90 text-white"
                        }
                    >
                        {confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
