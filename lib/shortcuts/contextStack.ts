/**
 * Shortcut Context Stack
 * 
 * Manages keyboard shortcut contexts in a stack-based hierarchy.
 * Prevents conflicts between different shortcut handlers (reader, dialog, palette, etc.)
 * 
 * Usage:
 * - When reader opens: shortcutContext.push('reader')
 * - When reader closes: shortcutContext.pop()
 * - Global shortcuts only fire when: shortcutContext.getCurrent() === 'global'
 */

export type ShortcutContext = 'global' | 'reader' | 'dialog' | 'palette' | 'workspace';

type Listener = () => void;

class ShortcutContextStack {
  private stack: ShortcutContext[] = ['global'];
  private listeners = new Set<Listener>();

  /**
   * Push a new context onto the stack
   * Notifies all listeners
   */
  push(context: ShortcutContext): void {
    this.stack.push(context);
    this.notify();

    if (process.env.NODE_ENV === 'development') {
      console.log(`[ShortcutContext] Pushed: ${context}, Stack:`, this.stack);
    }
  }

  /**
   * Pop the current context from the stack
   * Never pops the base 'global' context
   * Notifies all listeners
   */
  pop(): void {
    if (this.stack.length > 1) {
      const popped = this.stack.pop();
      this.notify();

      if (process.env.NODE_ENV === 'development') {
        console.log(`[ShortcutContext] Popped: ${popped}, Stack:`, this.stack);
      }
    } else {
      console.warn('[ShortcutContext] Cannot pop base "global" context');
    }
  }

  /**
   * Get the current (top) context
   */
  getCurrent(): ShortcutContext {
    return this.stack[this.stack.length - 1];
  }

  /**
   * Get the full stack (for debugging)
   */
  getStack(): ShortcutContext[] {
    return [...this.stack];
  }

  /**
   * Check if a specific context is active
   */
  isActive(context: ShortcutContext): boolean {
    return this.getCurrent() === context;
  }

  /**
   * Subscribe to context changes
   * Returns unsubscribe function
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of context change
   */
  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Reset stack to base state (for testing/debugging)
   */
  reset(): void {
    this.stack = ['global'];
    this.notify();

    if (process.env.NODE_ENV === 'development') {
      console.log('[ShortcutContext] Reset to global');
    }
  }
}

/**
 * Singleton instance
 * Import this in components/hooks that need to manage shortcut contexts
 */
export const shortcutContext = new ShortcutContextStack();

/**
 * React hook for subscribing to context changes
 * Returns current context and re-renders on change
 */
export function useShortcutContext(): ShortcutContext {
  const [context, setContext] = React.useState<ShortcutContext>(
    shortcutContext.getCurrent()
  );

  React.useEffect(() => {
    const unsubscribe = shortcutContext.subscribe(() => {
      setContext(shortcutContext.getCurrent());
    });

    return unsubscribe;
  }, []);

  return context;
}

// For React import
import * as React from 'react';
