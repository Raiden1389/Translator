import React, { useEffect, useRef } from "react";
import { Book, ShieldBan, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TextSelectionMenuProps {
    position: { x: number; y: number } | null;
    selectedText: string;
    onAction: (action: "dictionary" | "blacklist" | "correction") => void;
    onClose: () => void;
}

export function TextSelectionMenu({ position, selectedText, onAction, onClose }: TextSelectionMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    if (!position || !selectedText) return null;

    return (
        <div
            ref={menuRef}
            className="fixed z-[9999] bg-[#1e1e2e] border border-white/10 shadow-2xl rounded-lg p-1 flex gap-1 animate-in fade-in zoom-in-95 duration-200"
            style={{
                top: position.y - 50, // Display above selection
                left: position.x,
                transform: "translateX(-50%)"
            }}
        >
            <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-white/80 hover:bg-white/10 hover:text-white"
                onClick={() => onAction("dictionary")}
                title="Lưu vào Từ điển"
            >
                <Book className="w-4 h-4 mr-2 text-blue-400" />
                Từ điển
            </Button>
            <div className="w-px bg-white/10 my-1" />
            <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-white/80 hover:bg-white/10 hover:text-white"
                onClick={() => onAction("blacklist")}
                title="Thêm vào Blacklist"
            >
                <ShieldBan className="w-4 h-4 mr-2 text-red-400" />
                Blacklist
            </Button>
            <div className="w-px bg-white/10 my-1" />
            <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-white/80 hover:bg-white/10 hover:text-white"
                onClick={() => onAction("correction")}
                title="Sửa lỗi (Tự động thay thế sau này)"
            >
                <Wand2 className="w-4 h-4 mr-2 text-amber-400" />
                Sửa lỗi
            </Button>
        </div>
    );
}
