// Debug script - Save HTML to file
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function saveHTMLForDebug(html: string, filename: string) {
    const path = join(process.cwd(), 'debug', filename);
    await writeFile(path, html, 'utf-8');
    console.log(`[Debug] Saved HTML to: ${path}`);
}
