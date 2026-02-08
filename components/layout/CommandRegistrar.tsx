"use client";

import { useEffect } from "react";

export function CommandRegistrar() {
  useEffect(() => {
    // Register commands on mount
    import('@/lib/commands/registry').then(({ registerCommands }) => {
      registerCommands();
    });
  }, []);

  return null; // This component doesn't render anything
}
