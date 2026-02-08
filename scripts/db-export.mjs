#!/usr/bin/env node

/**
 * DB Export Script
 * Exports all workspaces from IndexedDB to JSON files
 * Usage: pnpm run db:export
 */

import { mkdir } from 'fs/promises';
import { join } from 'path';

console.log('🔄 Starting database export...\n');

const EXPORT_DIR = join(process.cwd(), 'backups', new Date().toISOString().split('T')[0]);
const INSTRUCTIONS = `
📦 DATABASE EXPORT INSTRUCTIONS

This script exports Raiden workspaces from IndexedDB to JSON files.

⚠️  IMPORTANT:
   - This script must be run from the Raiden app itself (not CLI)
   - IndexedDB is only accessible in browser context
   - Use the built-in export feature in the app instead

🎯 HOW TO EXPORT:

   1. Open Raiden app (pnpm dev)
   2. Go to Settings or Dashboard
   3. Click "Export All Workspaces"
   4. Choose destination folder
   
   OR use the Tauri storage API:
   
   1. Open DevTools (F12)
   2. Run in Console:
   
      const { storage } = await import('./lib/storageBridge');
      const workspaceIds = await storage.listWorkspaces();
      console.log('Workspaces:', workspaceIds);
      
      // Export individual workspace
      await storage.exportWorkspace(workspaceIds[0], './backup');

📁 EXPORT LOCATION:
   Default: ~/Documents/Raiden/backups/
   Custom: Choose in export dialog

💡 TIP:
   For automated backups, use the app's built-in scheduler
   (Settings → Auto-backup → Enable)

`;

console.log(INSTRUCTIONS);

// Create backup directory structure
try {
    await mkdir(EXPORT_DIR, { recursive: true });
    console.log(`✅ Created backup directory: ${EXPORT_DIR}\n`);
} catch (error) {
    console.error('❌ Failed to create backup directory:', error.message);
}

console.log('ℹ️  This is a placeholder script.');
console.log('   Use the in-app export feature for actual database export.\n');

process.exit(0);
