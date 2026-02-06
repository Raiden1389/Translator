import React from "react";
import { cn } from "@/lib/utils";
import type { LogEntry } from "./types";

interface LogItemProps {
  log: LogEntry;
}

export const LogItem = React.memo(({ log }: LogItemProps) => (
  <div className="flex items-start gap-2 animate-in fade-in slide-in-from-left-1">
    <span className="bg-muted px-1 rounded text-muted-foreground shrink-0 tabular-nums">CH {log.order}</span>
    <span className={cn(
      "break-all",
      log.type === 'error' ? 'text-red-400' :
        log.type === 'success' ? 'text-emerald-400' :
          'text-white/60'
    )}>
      {log.message}
    </span>
  </div>
));

LogItem.displayName = "LogItem";
