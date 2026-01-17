import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Book, ShieldBan, Wand2, Copy } from "lucide-react";

interface ReaderContextMenuProps {
    position: { x: number; y: number } | null;
    selectedText: string;
    onAction: (action: "dictionary" | "blacklist" | "correction" | "copy") => void;
    onClose: () => void;
}

export function ReaderContextMenu({ position, selectedText, onAction, onClose }: ReaderContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleScroll = () => {
            onClose();
        };

        if (position) {
            document.addEventListener("mousedown", handleClickOutside);
            window.addEventListener("scroll", handleScroll, true);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("scroll", handleScroll, true);
        };
    }, [position, onClose]);

    if (!mounted || !position) return null;

    return createPortal(
        <div
            ref={menuRef}
            className="fixed z-[9999] bg-[#1e1e2e] border border-white/10 shadow-2xl rounded-lg overflow-hidden min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
            style={{
                top: position.y,
                left: position.x,
            }}
            onContextMenu={(e) => e.preventDefault()} // Prevent native context menu on our custom menu
        >
            <div className="p-1 space-y-0.5">
                <button
                    onClick={() => onAction("dictionary")}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-white/90 hover:bg-white/10 rounded-md transition-colors"
                >
                    <Book className="w-4 h-4 text-blue-400" />
                    Thêm vào Từ điển
                </button>
                <button
                    onClick={() => onAction("blacklist")}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-white/90 hover:bg-white/10 rounded-md transition-colors"
                >
                    <ShieldBan className="w-4 h-4 text-red-400" />
                    Thêm vào Blacklist
                </button>
                <button
                    onClick={() => onAction("correction")}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-white/90 hover:bg-white/10 rounded-md transition-colors"
                >
                    <Wand2 className="w-4 h-4 text-amber-400" />
                    Sửa & Thay thế
                </button>

                <div className="h-px bg-white/10 my-1" />


                <button
                    onClick={() => onAction("copy")}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-white/90 hover:bg-white/10 rounded-md transition-colors"
                >
                    <Copy className="w-4 h-4 text-white/50" />
                    Sao chép
                </button>
            </div>
        </div>,
        document.body
    );
}
