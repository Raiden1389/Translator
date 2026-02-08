/**
 * Command Palette Service (Singleton)
 * 
 * Manages command palette state and command registry
 * Singleton pattern - no React overhead
 * 
 * Usage:
 * - commandPalette.open() - Open palette
 * - commandPalette.close() - Close palette
 * - commandPalette.registerCommand() - Add command
 * - commandPalette.subscribe() - Listen to state changes
 */

import { shortcutContext } from '@/lib/shortcuts/contextStack';

export interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  keywords?: string[]; // For fuzzy search
  category?: 'workspace' | 'chapter' | 'translation' | 'settings' | 'navigation';
  action: () => void | Promise<void>;
  shortcut?: string; // e.g., "Ctrl+K"
}

type Listener = () => void;

class CommandPaletteService {
  private isOpen = false;
  private commands = new Map<string, Command>();
  private listeners = new Set<Listener>();
  private lastCommand: string | null = null;

  /**
   * Open command palette
   * Pushes 'palette' context to prevent other shortcuts
   */
  open(): void {
    if (this.isOpen) return;

    this.isOpen = true;
    shortcutContext.push('palette');
    this.notify();

    if (process.env.NODE_ENV === 'development') {
      console.log('[CommandPalette] Opened');
    }
  }

  /**
   * Close command palette
   * Pops 'palette' context
   */
  close(): void {
    if (!this.isOpen) return;

    this.isOpen = false;
    shortcutContext.pop();
    this.notify();

    if (process.env.NODE_ENV === 'development') {
      console.log('[CommandPalette] Closed');
    }
  }

  /**
   * Toggle palette open/close
   */
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Get current open state
   */
  getIsOpen(): boolean {
    return this.isOpen;
  }

  /**
   * Register a command
   */
  registerCommand(command: Command): void {
    this.commands.set(command.id, command);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[CommandPalette] Registered command: ${command.id}`);
    }
  }

  /**
   * Unregister a command
   */
  unregisterCommand(id: string): void {
    this.commands.delete(id);

    if (process.env.NODE_ENV === 'development') {
      console.log(`[CommandPalette] Unregistered command: ${id}`);
    }
  }

  /**
   * Get all commands
   */
  getCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * Execute a command by ID
   */
  async executeCommand(id: string): Promise<void> {
    const command = this.commands.get(id);
    if (!command) {
      console.warn(`[CommandPalette] Command not found: ${id}`);
      return;
    }

    this.lastCommand = id;
    this.close();

    try {
      await command.action();

      if (process.env.NODE_ENV === 'development') {
        console.log(`[CommandPalette] Executed command: ${id}`);
      }
    } catch (error) {
      console.error(`[CommandPalette] Error executing command ${id}:`, error);
    }
  }

  /**
   * Get last executed command ID
   */
  getLastCommand(): string | null {
    return this.lastCommand;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Clear all commands (for cleanup/testing)
   */
  clearCommands(): void {
    this.commands.clear();

    if (process.env.NODE_ENV === 'development') {
      console.log('[CommandPalette] Cleared all commands');
    }
  }
}

/**
 * Singleton instance
 */
export const commandPalette = new CommandPaletteService();
