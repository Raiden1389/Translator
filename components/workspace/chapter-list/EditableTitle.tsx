"use client";

import React, { useState, useRef, useEffect } from "react";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EditableTitleProps {
  id: number;
  title_translated?: string;
  isRaidenMode: boolean;
  onRead: (e: React.MouseEvent) => void;
}

export function EditableTitle({ id, title_translated, isRaidenMode, onRead }: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(title_translated || "");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (!isEditing) return;

    const trimmedValue = value.trim();

    // If no change, just exit editing mode
    if (trimmedValue === (title_translated || "")) {
      setIsEditing(false);
      return;
    }

    try {
      await db.chapters.update(id, {
        title_translated: trimmedValue,
        updatedAt: new Date()
      });

      setIsEditing(false);
      toast.success("✅ Đã lưu tiêu đề!");
    } catch (error) {
      console.error("Failed to update title:", error);
      toast.error("❌ Lỗi khi lưu tiêu đề");
      setValue(title_translated || ""); // Revert on error
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setValue(title_translated || ""); // Revert
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn(
          "w-full bg-transparent border-b-2 border-indigo-500 outline-none",
          "text-sm font-medium italic px-1 py-0.5",
          "focus:border-indigo-600 transition-colors"
        )}
        placeholder="Nhập tiêu đề..."
      />
    );
  }

  return (
    <div className="flex items-center gap-2 w-full group">
      <button
        onClick={onRead}
        className={cn(
          "flex-1 truncate italic text-sm font-medium text-left",
          isRaidenMode ? "text-slate-400 hover:text-purple-300" : "text-slate-600 hover:text-blue-600"
        )}
      >
        {(title_translated || "—").replace(/<br\s*\/?>/gi, " ")}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent opening Reader Modal
          setIsEditing(true);
        }}
        className={cn(
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "p-1 rounded hover:bg-muted/50",
          "text-muted-foreground hover:text-foreground"
        )}
        title="Sửa tiêu đề"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
      </button>
    </div>
  );
}
