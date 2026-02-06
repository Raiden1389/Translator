import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ControlButtonsProps {
  isPinned: boolean;
  isFinished: boolean;
  onPin: () => void;
  onClose: () => void;
}

export function ControlButtons({ isPinned, isFinished, onPin, onClose }: ControlButtonsProps) {
  return (
    <>
      {/* Pin Button */}
      <button
        onClick={onPin}
        className={cn(
          "absolute top-4 right-16 p-1.5 rounded-full transition-all z-10",
          isPinned
            ? "bg-primary/20 text-primary hover:bg-primary/30"
            : "bg-muted/20 hover:bg-muted/40 text-muted-foreground",
          isFinished ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        title={isPinned ? "Unpin (auto-close enabled)" : "Pin (keep visible)"}
      >
        <span className="text-sm">{isPinned ? "📌" : "📍"}</span>
      </button>

      {/* Close Button */}
      <button
        onClick={onClose}
        className={cn(
          "absolute top-4 right-4 p-1.5 rounded-full bg-muted/20 hover:bg-muted/40 text-muted-foreground transition-all z-10",
          isFinished ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <X className="h-4 w-4" />
      </button>
    </>
  );
}
