import { useState, useEffect } from "react";
import type { SystemNotification } from "./types";
import { NOTIFICATION_AUTO_DISMISS_MS } from "./constants";

export function useNotifications(notifications: SystemNotification[]) {
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());

  // Get latest non-dismissed notification
  const latestNotification = notifications
    .filter(n => !dismissedNotifications.has(n.id))
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (!latestNotification) return;
    const timer = setTimeout(() => {
      setDismissedNotifications(prev => new Set(prev).add(latestNotification.id));
    }, NOTIFICATION_AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [latestNotification]);

  return latestNotification;
}
