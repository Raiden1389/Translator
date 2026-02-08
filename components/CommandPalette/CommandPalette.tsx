/**
 * Command Palette Component
 * 
 * Keyboard-first command interface (Ctrl+K)
 * Features:
 * - Fuzzy search
 * - Keyboard navigation
 * - Recent commands
 * - Categories
 */

"use client";

import { useEffect, useState, useMemo } from 'react';
import { commandPalette, type Command } from '@/lib/services/commandPalette';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Simple fuzzy search
 * Returns true if all characters in query appear in target (in order)
 */
function fuzzyMatch(target: string, query: string): boolean {
  const targetLower = target.toLowerCase();
  const queryLower = query.toLowerCase();

  let queryIndex = 0;
  for (let i = 0; i < targetLower.length && queryIndex < queryLower.length; i++) {
    if (targetLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === queryLower.length;
}

/**
 * Filter commands by search query
 */
function filterCommands(commands: Command[], query: string): Command[] {
  if (!query.trim()) {
    return commands;
  }

  return commands.filter(cmd => {
    // Search in label
    if (fuzzyMatch(cmd.label, query)) return true;

    // Search in description
    if (cmd.description && fuzzyMatch(cmd.description, query)) return true;

    // Search in keywords
    if (cmd.keywords?.some(kw => fuzzyMatch(kw, query))) return true;

    return false;
  });
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [commands, setCommands] = useState<Command[]>([]);

  // Subscribe to palette state
  useEffect(() => {
    const updateState = () => {
      const newIsOpen = commandPalette.getIsOpen();
      setIsOpen(newIsOpen);
      setCommands(commandPalette.getCommands());

      // Reset state when opening
      if (newIsOpen && !isOpen) {
        setQuery('');
        setSelectedIndex(0);
      }
    };

    updateState();
    const unsubscribe = commandPalette.subscribe(updateState);

    return unsubscribe;
  }, [isOpen]);

  // Filter commands
  const filteredCommands = useMemo(() => {
    return filterCommands(commands, query);
  }, [commands, query]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        commandPalette.close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredCommands[selectedIndex];
        if (selected) {
          commandPalette.executeCommand(selected.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && commandPalette.close()}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <div className="flex flex-col">
          {/* Search Input */}
          <div className="p-4 border-b">
            <Input
              autoFocus
              placeholder="Type a command or search..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0); // Reset selection when query changes
              }}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          {/* Commands List */}
          <ScrollArea className="max-h-96">
            <div className="p-2">
              {filteredCommands.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No commands found
                </div>
              ) : (
                filteredCommands.map((cmd, index) => (
                  <button
                    key={cmd.id}
                    onClick={() => commandPalette.executeCommand(cmd.id)}
                    className={`
                      w-full text-left px-4 py-3 rounded-md
                      transition-colors
                      ${index === selectedIndex
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/50'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{cmd.label}</div>
                        {cmd.description && (
                          <div className="text-sm text-muted-foreground">
                            {cmd.description}
                          </div>
                        )}
                      </div>
                      {cmd.shortcut && (
                        <div className="text-xs text-muted-foreground ml-4">
                          {cmd.shortcut}
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
