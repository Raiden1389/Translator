/**
 * Glossary Context Builder
 */

import { db } from "@/lib/db";

/**
 * Build glossary context from workspace
 * CRITICAL: This is used in system instruction!
 */
export async function buildGlossaryContext(workspaceId: string): Promise<string> {
  const allEntries = await db.dictionary.where('workspaceId').equals(workspaceId).toArray();

  const terms = allEntries.filter(e => e.type === 'term');
  const characters = allEntries.filter(e => e.type === 'character');

  if (terms.length === 0 && characters.length === 0) {
    console.log(`📚 [GLOSSARY] No glossary entries for workspace ${workspaceId}`);
    return '';
  }

  let context = '\n[GLOSSARY]:\n';

  // Terms
  if (terms.length > 0) {
    context += 'Thuật ngữ:\n';
    terms.forEach(t => {
      context += `- ${t.original} → ${t.translated}\n`;
    });
  }

  // Characters
  if (characters.length > 0) {
    context += '\nNhân vật:\n';
    characters.forEach(c => {
      context += `- ${c.original} → ${c.translated}`;
      if ('persona' in c && c.persona) {
        context += ` (${c.persona})`;
      }
      context += '\n';
    });
  }

  console.log(`📚 [GLOSSARY] Loaded ${terms.length} terms + ${characters.length} characters`);

  return context;
}
