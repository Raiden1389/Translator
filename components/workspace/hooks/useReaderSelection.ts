import { useState, useRef } from "react";

/**
 * Custom hook for managing text selection and context menu
 */
export function useReaderSelection() {
    const [menuPosition, setMenuPosition] = useState<{ x: number, y: number } | null>(null);
    const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number, y: number } | null>(null);
    const [selectedText, setSelectedText] = useState("");
    const editorRef = useRef<HTMLDivElement>(null);

    const handleTextSelection = () => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0 && editorRef.current?.contains(selection.anchorNode)) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            // Show menu centered above selection
            setMenuPosition({
                x: rect.left + rect.width / 2,
                y: rect.top
            });
            setSelectedText(selection.toString().trim());
        } else {
            setMenuPosition(null);
            setSelectedText("");
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
            setContextMenuPosition({ x: e.clientX, y: e.clientY });
            setSelectedText(selection.toString().trim());
        }
    };

    const clearSelection = () => {
        setMenuPosition(null);
        setContextMenuPosition(null);
        setSelectedText("");
    };

    return {
        menuPosition,
        setMenuPosition,
        contextMenuPosition,
        setContextMenuPosition,
        selectedText,
        setSelectedText,
        editorRef,
        handleTextSelection,
        handleContextMenu,
        clearSelection,
    };
}
