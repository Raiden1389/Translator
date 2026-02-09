import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Book, ShieldBan, Wand2, Copy } from "lucide-react";

interface ReaderContextMenuProps {
    position: { x: number; y: number } | null;
    selectedText: string;
    onAction: (action: "dictionary" | "blacklist" | "correction" | "copy") => void;
    onClose: () => void;
}

export function ReaderContextMenu({ position, onAction, onClose }: ReaderContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu on outside click
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

    if (!position) return null;

    return createPortal(
        <div
            ref={menuRef}
            className="fixed z-9999 bg-popover border border-border shadow-2xl rounded-lg overflow-hidden min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
            style={{
                top: position.y,
                left: position.x,
            }}
            onContextMenu={(e) => e.preventDefault()} // Prevent native context menu on our custom menu
        >
            <div className="p-1 space-y-0.5">
                <button
                    onClick={() => onAction("dictionary")}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-popover-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                >
                    <Book className="w-4 h-4 text-primary" />
                    Thêm vào Từ điển
                </button>
                <button
                    onClick={() => onAction("blacklist")}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-popover-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                >
                    <ShieldBan className="w-4 h-4 text-destructive" />
                    Thêm vào Blacklist
                </button>
                <button
                    onClick={() => onAction("correction")}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-popover-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                >
                    <Wand2 className="w-4 h-4 text-amber-400" />
                    Sửa & Thay thế
                </button>

                <div className="h-px bg-border my-1" />


                <button
                    onClick={() => onAction("copy")}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-popover-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
                >
                    <Copy className="w-4 h-4 text-muted-foreground" />
                    Sao chép
                </button>
            </div>
        </div>,
        document.body
    );
}
