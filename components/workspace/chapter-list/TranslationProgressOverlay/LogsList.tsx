import React from "react";
import { cn } from "@/lib/utils";
import type { LogEntry } from "./types";

interface LogsListProps {
  logs: LogEntry[];
  logContainerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
}

export function LogsList({ logs, logContainerRef, onScroll }: LogsListProps) {
  if (logs.length === 0) return null;

  return (
    <div
      ref={logContainerRef}
      onScroll={onScroll}
      className="pt-3 border-t border-border/40 max-h-[180px] overflow-y-auto custom-scrollbar space-y-1.5"
    >
      {[...logs].sort((a, b) => a.order - b.order).slice(-5).map((log) => (
        <div
          key={log.id}
          className={cn(
            "flex items-start gap-2 p-2 rounded-lg transition-all animate-in fade-in slide-in-from-left-1",
            log.type === 'success' && "bg-emerald-500/10 border-l-2 border-emerald-500",
            log.type === 'error' && "bg-red-500/10 border-l-2 border-red-500",
            log.type === 'info' && "bg-muted/20"
          )}
        >
          <span className="bg-muted px-1 rounded text-muted-foreground shrink-0 tabular-nums text-[10px] font-mono">
            CH {log.order}
          </span>
          <span className={cn(
            "break-all text-[10px] flex-1",
            log.type === 'error' ? 'text-red-400' :
              log.type === 'success' ? 'text-emerald-400' :
                'text-white/60'
          )}>
            {log.message}
          </span>
          {log.tokens && (
            <span className="text-[9px] text-muted-foreground tabular-nums font-mono shrink-0">
              {log.tokens.total.toLocaleString()}t
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
