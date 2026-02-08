#!/usr/bin/env node

/**
 * DB Reset UI Preferences Script
 * Clears UI preferences table (for testing UI Polish features)
 * Usage: pnpm run db:reset:ui
 */

console.log('🔄 Resetting UI preferences...\n');

const INSTRUCTIONS = `
🧹 RESET UI PREFERENCES

This script clears the UI preferences table in IndexedDB.
Useful for testing UI Polish features with clean state.

⚠️  IMPORTANT:
   - This script must be run from the Raiden app itself (not CLI)
   - IndexedDB is only accessible in browser context
   - Use DevTools Console instead

🎯 HOW TO RESET UI PREFERENCES:

   METHOD 1: DevTools Console (Recommended)
   
   1. Open Raiden app (pnpm dev)
   2. Open DevTools (F12)
   3. Go to Console tab
   4. Run:
   
      const { db } = await import('./lib/db');
      await db.uiPreferences.clear();
      console.log('✅ UI preferences cleared');
      location.reload();

   METHOD 2: Application Tab
   
   1. Open DevTools (F12)
   2. Go to Application tab
   3. Expand IndexedDB → AITranslatorDB
   4. Click "uiPreferences" table
   5. Right-click → "Clear object store"
   6. Reload app (Ctrl+R)

   METHOD 3: In-App Settings (Future)
   
   1. Go to Settings → Advanced
   2. Click "Reset UI Preferences"
   3. Confirm
   
   (This feature will be added in v2.7.0)

💡 WHAT GETS RESET:
   - Command palette settings
   - Keyboard shortcuts customization
   - Reader preferences (font, spacing, etc.)
   - Focus mode state
   - Workflow presets (if stored in UI prefs)

⚠️  WHAT STAYS INTACT:
   - Workspaces
   - Chapters
   - Dictionary
   - Translation settings
   - All other data

🔧 ADVANCED: Reset Specific Preference

   const { db } = await import('./lib/db');
   
   // Reset specific key
   await db.uiPreferences.delete('commandPalette.lastCommand');
   
   // Reset all keys matching pattern
   await db.uiPreferences
     .where('key')
     .startsWith('reader.')
     .delete();
   
   console.log('✅ Specific preferences cleared');

`;

console.log(INSTRUCTIONS);

console.log('ℹ️  This is a placeholder script.');
console.log('   Use DevTools Console for actual reset (see instructions above).\n');

console.log('📝 Quick Copy-Paste:');
console.log('   const { db } = await import("./lib/db");');
console.log('   await db.uiPreferences.clear();');
console.log('   location.reload();\n');

process.exit(0);
