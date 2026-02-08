/**
 * Global Keyboard Shortcuts Hook
 * 
 * Handles keyboard shortcuts at the global level (outside of reader/dialog/palette)
 * Includes guards to prevent firing in input fields, textareas, or when other contexts are active
 * 
 * Usage:
 * - Add to root layout (app/layout.tsx)
 * - Shortcuts only fire when context is 'global'
 * - Automatically disabled when feature flag is OFF
 */

"use client";

import { useEffect } from 'react';
import { shortcutContext } from '@/lib/shortcuts/contextStack';
import { featureFlags } from '@/lib/featureFlags';

/**
 * Check if global shortcuts should be handled
 * Returns false if:
 * - Inside input/textarea/contentEditable
 * - Dialog is open (data-dialog-open attribute)
 * - Context is not 'global'
 */
function shouldHandleGlobalShortcut(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement;

  // Guard 1: Ignore in input fields
  if (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  ) {
    return false;
  }

  // Guard 2: Ignore when dialog is open
  if (document.body.dataset.dialogOpen === 'true') {
    return false;
  }

  // Guard 3: Only handle when context is 'global'
  if (shortcutContext.getCurrent() !== 'global') {
    return false;
  }

  return true;
}

/**
 * Global keyboard shortcuts hook
 * Currently implements:
 * - Ctrl+K: Open command palette (Phase 1 Day 4-5)
 * - Ctrl+/: Show keyboard shortcuts help (Future)
 * 
 * Add more shortcuts here as needed
 */
export function useGlobalKeyboardShortcuts() {
  useEffect(() => {
    // Feature flag check - don't register if disabled
    if (!featureFlags.globalShortcuts) {
      return;
    }

    const handleKeyDown = async (e: KeyboardEvent) => {
      // Check guards before processing
      if (!shouldHandleGlobalShortcut(e)) {
        return;
      }

      // Ctrl+K: Command Palette
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();

        if (featureFlags.commandPalette) {
          const { commandPalette } = await import('@/lib/services/commandPalette');
          commandPalette.toggle();
        } else {
          console.log('[GlobalShortcuts] Ctrl+K pressed - Command Palette disabled');
        }
      }

      // Ctrl+/: Show keyboard shortcuts help (Future)
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        console.log('[GlobalShortcuts] Ctrl+/ pressed - Shortcuts help (not implemented yet)');
      }

      // Add more global shortcuts here...
    };

    window.addEventListener('keydown', handleKeyDown);

    if (process.env.NODE_ENV === 'development') {
      console.log('[GlobalShortcuts] Registered global keyboard shortcuts');
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);

      if (process.env.NODE_ENV === 'development') {
        console.log('[GlobalShortcuts] Unregistered global keyboard shortcuts');
      }
    };
  }, []);
}

/**
 * Helper: Mark dialog as open/closed
 * Call this when opening/closing dialogs to prevent global shortcuts
 */
export function setDialogOpen(isOpen: boolean): void {
  if (isOpen) {
    document.body.dataset.dialogOpen = 'true';
  } else {
    delete document.body.dataset.dialogOpen;
  }
}
