/**
 * Command Registry - Register all available commands here
 * Commands are automatically loaded when the app starts
 */

import { commandPalette } from '@/lib/services/commandPalette';
import { toast } from 'sonner';

export function registerCommands() {
  // Navigation Commands
  commandPalette.registerCommand({
    id: 'nav.home',
    label: 'Go to Home',
    description: 'Navigate to the home page',
    category: 'navigation',
    keywords: ['home', 'dashboard', 'main'],
    action: async () => {
      window.location.href = '/';
      toast.success('Navigating to Home');
    },
  });

  commandPalette.registerCommand({
    id: 'nav.workspaces',
    label: 'View All Workspaces',
    description: 'See all your translation workspaces',
    category: 'navigation',
    keywords: ['workspace', 'projects', 'list'],
    action: async () => {
      window.location.href = '/';
      toast.success('Viewing Workspaces');
    },
  });

  // Theme Commands
  commandPalette.registerCommand({
    id: 'theme.toggle',
    label: 'Toggle Theme',
    description: 'Switch between light and dark mode',
    category: 'settings',
    keywords: ['theme', 'dark', 'light', 'mode'],
    action: async () => {
      const html = document.documentElement;
      const isDark = html.classList.contains('dark');

      if (isDark) {
        html.classList.remove('dark');
        toast.success('Switched to Light Mode');
      } else {
        html.classList.add('dark');
        toast.success('Switched to Dark Mode');
      }
    },
  });

  // Workspace Commands
  commandPalette.registerCommand({
    id: 'workspace.new',
    label: 'Create New Workspace',
    description: 'Start a new translation project',
    category: 'workspace',
    keywords: ['new', 'create', 'workspace', 'project'],
    action: async () => {
      toast.info('Opening new workspace dialog...');
      // TODO: Implement workspace creation
    },
  });

  commandPalette.registerCommand({
    id: 'workspace.import',
    label: 'Import Chapters',
    description: 'Import TXT/EPUB/JSON files',
    category: 'workspace',
    keywords: ['import', 'upload', 'txt', 'epub', 'json'],
    action: async () => {
      toast.info('Opening file import dialog...');
      // TODO: Trigger file input
    },
  });

  // Help Commands
  commandPalette.registerCommand({
    id: 'help.shortcuts',
    label: 'Show Keyboard Shortcuts',
    description: 'View all available keyboard shortcuts',
    category: 'settings',
    keywords: ['help', 'shortcuts', 'keyboard', 'hotkeys'],
    action: async () => {
      toast.info('Keyboard Shortcuts', {
        description: 'Ctrl+K: Command Palette\nEsc: Close dialogs',
        duration: 5000,
      });
    },
  });

  commandPalette.registerCommand({
    id: 'help.about',
    label: 'About Raiden Translator',
    description: 'View app information',
    category: 'settings',
    keywords: ['about', 'version', 'info'],
    action: async () => {
      toast.info('Raiden AI Translator v2.6.0', {
        description: 'AI-powered translation tool',
      });
    },
  });

  // Translation Commands
  commandPalette.registerCommand({
    id: 'translate.selected',
    label: 'Translate Selected Chapters',
    description: 'Start translation for selected chapters',
    category: 'translation',
    keywords: ['translate', 'dịch', 'selected', 'batch'],
    action: async () => {
      toast.info('Open a workspace and select chapters to translate');
    },
  });

  commandPalette.registerCommand({
    id: 'chapter.scan',
    label: 'AI Scan Chapters',
    description: 'Scan chapters for names and terms',
    category: 'chapter',
    keywords: ['scan', 'ai', 'ner', 'names', 'terms'],
    action: async () => {
      toast.info('Open a workspace to use AI Scan');
    },
  });

  commandPalette.registerCommand({
    id: 'chapter.fix-titles',
    label: 'Fix Chapter Titles',
    description: 'Remove Chinese characters from titles',
    category: 'chapter',
    keywords: ['fix', 'title', 'chinese', 'sparkles'],
    action: async () => {
      toast.info('Open a workspace to fix titles');
    },
  });

  commandPalette.registerCommand({
    id: 'chapter.import',
    label: 'Import Chapters (TXT/EPUB/JSON)',
    description: 'Import chapters from file',
    category: 'chapter',
    keywords: ['import', 'upload', 'txt', 'epub', 'json', 'file'],
    action: async () => {
      toast.info('Open a workspace to import chapters');
    },
  });

  commandPalette.registerCommand({
    id: 'chapter.export',
    label: 'Export Workspace JSON',
    description: 'Download workspace as JSON',
    category: 'chapter',
    keywords: ['export', 'download', 'json', 'backup'],
    action: async () => {
      toast.info('Open a workspace to export');
    },
  });

  // Developer Commands
  commandPalette.registerCommand({
    id: 'dev.reload',
    label: 'Reload Page',
    description: 'Refresh the current page',
    category: 'settings',
    keywords: ['reload', 'refresh', 'dev'],
    action: async () => {
      window.location.reload();
    },
  });

  commandPalette.registerCommand({
    id: 'dev.console',
    label: 'Open DevTools',
    description: 'Open browser developer tools (F12)',
    category: 'settings',
    keywords: ['console', 'devtools', 'debug', 'inspect', 'f12'],
    action: async () => {
      toast.info('Press F12 to open DevTools', {
        description: 'Right-click → Inspect also works',
        duration: 5000,
      });
    },
  });

  console.log('[Commands] Registered', commandPalette.getCommands().length, 'commands');
}
