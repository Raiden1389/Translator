/**
 * Global Shortcuts Manager
 * 
 * Client component that registers global keyboard shortcuts
 * Must be placed in root layout to work across all pages
 */

"use client";

import { useGlobalKeyboardShortcuts } from '@/lib/hooks/useGlobalKeyboardShortcuts';

export function GlobalShortcutsManager() {
  useGlobalKeyboardShortcuts();
  return null; // This component doesn't render anything
}
