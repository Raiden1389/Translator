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
    <button
      onClick={(e) => {
        // Shift+Click or Ctrl+Click to edit
        if (e.shiftKey || e.ctrlKey) {
          e.stopPropagation();
          setIsEditing(true);
        } else {
          // Normal click opens Reader Modal
          onRead(e);
        }
      }}
      className={cn(
        "w-full truncate italic text-sm font-medium text-left",
        isRaidenMode ? "text-slate-400 hover:text-purple-300" : "text-slate-600 hover:text-blue-600"
      )}
      title="Click để đọc, Shift+Click hoặc Ctrl+Click để sửa"
    >
      {(title_translated || "—").replace(/<br\s*\/?>/gi, " ")}
    </button>
  );
}
