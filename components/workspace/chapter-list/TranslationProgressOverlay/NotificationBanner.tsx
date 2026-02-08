import React from "react";
import { cn } from "@/lib/utils";
import type { SystemNotification } from "./types";

interface NotificationBannerProps {
  notification: SystemNotification | undefined;
}

const notificationIcon = {
  init: '🚀',
  turbo: '⚡',
  success: '🎉',
  error: '❌'
};

const notificationColor = {
  init: 'bg-primary/10 border-primary/20 text-primary',
  turbo: 'bg-primary/10 border-primary/20 text-primary',
  success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600',
  error: 'bg-red-500/10 border-red-500/20 text-red-600'
};

export function NotificationBanner({ notification }: NotificationBannerProps) {
  if (!notification) return null;

  return (
    <div className={cn(
      "px-3 py-2 rounded-xl border flex items-center gap-2 text-xs font-medium animate-in slide-in-from-top-2 fade-in duration-300",
      notificationColor[notification.type]
    )}>
      <span>{notificationIcon[notification.type]}</span>
      <span className="flex-1">{notification.message}</span>
    </div>
  );
}
