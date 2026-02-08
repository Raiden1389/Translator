/**
 * Workspace Keyboard Shortcuts
 * Handles shortcuts specific to the workspace/chapter list view
 */

import { useEffect } from 'react';
import { shortcutContext } from '@/lib/shortcuts/contextStack';
import { toast } from 'sonner';

interface UseWorkspaceShortcutsProps {
  onTranslateSelected?: () => void;
  onOpenSettings?: () => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  hasSelection?: boolean;
  disabled?: boolean;
}

export function useWorkspaceShortcuts({
  onTranslateSelected,
  onOpenSettings,
  onSelectAll,
  onDeselectAll,
  hasSelection = false,
  disabled = false,
}: UseWorkspaceShortcutsProps) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if in reader, dialog, or palette
      const currentContext = shortcutContext.getCurrent();
      if (currentContext === 'reader' || currentContext === 'dialog' || currentContext === 'palette') {
        return;
      }

      // Ignore if typing in input fields
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ctrl+T: Translate selected chapters immediately
      // Ctrl+Shift+T: Open translation settings dialog
      if (e.ctrlKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        console.log('[Workspace Shortcuts] Ctrl+T pressed, hasSelection:', hasSelection, 'shiftKey:', e.shiftKey);

        if (!hasSelection) {
          toast.error('No chapters selected', {
            description: 'Select chapters first to translate',
          });
          return;
        }

        if (e.shiftKey) {
          // Ctrl+Shift+T: Open settings dialog
          if (onOpenSettings) {
            onOpenSettings();
          }
        } else {
          // Ctrl+T: Translate immediately
          if (onTranslateSelected) {
            onTranslateSelected();
          }
        }
        return;
      }

      // Ctrl+A: Select all chapters
      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        console.log('[Workspace Shortcuts] Ctrl+A pressed');
        if (onSelectAll) {
          onSelectAll();
          toast.success('All chapters selected');
        }
        return;
      }

      // Escape: Deselect all
      if (e.key === 'Escape') {
        if (hasSelection && onDeselectAll) {
          e.preventDefault();
          console.log('[Workspace Shortcuts] Escape pressed');
          onDeselectAll();
          toast.info('Selection cleared');
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onTranslateSelected, onOpenSettings, onSelectAll, onDeselectAll, hasSelection, disabled]);
}
