import { invoke } from "@tauri-apps/api/core";
import { writeTextFile, readTextFile, exists, mkdir, BaseDirectory, readDir, remove, rename } from "@tauri-apps/plugin-fs";

export class StorageBridge {
    private static instance: StorageBridge;
    private isTauri: boolean = false;

    private constructor() {
        if (typeof window !== 'undefined') {
            this.isTauri = !!(window as any).__TAURI__;
        }
    }

    static getInstance() {
        if (!StorageBridge.instance) {
            StorageBridge.instance = new StorageBridge();
        }
        return StorageBridge.instance;
    }

    private async ensureDir(path: string) {
        if (!this.isTauri) return;
        try {
            if (!(await exists(path, { baseDir: BaseDirectory.AppData }))) {
                await mkdir(path, { baseDir: BaseDirectory.AppData, recursive: true });
            }
        } catch (e) {
            console.error(`StorageBridge: Failed to create directory ${path}`, e);
        }
    }

    /**
     * Internal Atomic Write: .tmp -> rename
     * Prevents file corruption during crashes
     */
    private async saveAtomic(filePath: string, data: any) {
        if (!this.isTauri) return;
        try {
            const content = JSON.stringify(data);
            const tmpPath = `${filePath}.tmp`;

            // 1. Write to temp file
            await writeTextFile(tmpPath, content, {
                baseDir: BaseDirectory.AppData
            });

            // 2. Rename to target (Atomic on most OS)
            await rename(tmpPath, filePath, {
                newPathBaseDir: BaseDirectory.AppData,
                oldPathBaseDir: BaseDirectory.AppData
            });
        } catch (e) {
            console.error(`StorageBridge: Atomic save failed for ${filePath}`, e);
            // Attempt to cleanup tmp file?
            try { await remove(`${filePath}.tmp`, { baseDir: BaseDirectory.AppData }); } catch { }
        }
    }

    async saveMetadata(workspaceId: string, metadata: any) {
        const wsDir = `workspaces/${workspaceId}`;
        await this.ensureDir(wsDir);
        await this.saveAtomic(`${wsDir}/metadata.json`, metadata);
    }

    async saveChapter(workspaceId: string, chapterId: number, data: any) {
        const chapDir = `workspaces/${workspaceId}/chapters`;
        await this.ensureDir(chapDir);
        await this.saveAtomic(`${chapDir}/${chapterId}.json`, data);
    }

    async saveDictionary(workspaceId: string, data: any[]) {
        const wsDir = `workspaces/${workspaceId}`;
        await this.ensureDir(wsDir);
        await this.saveAtomic(`${wsDir}/dictionary.json`, data);
    }

    async loadWorkspaceData(workspaceId: string) {
        if (!this.isTauri) return null;

        const wsDir = `workspaces/${workspaceId}`;
        try {
            if (!(await exists(wsDir, { baseDir: BaseDirectory.AppData }))) return null;

            // Load Metadata
            const metadataStr = await readTextFile(`${wsDir}/metadata.json`, { baseDir: BaseDirectory.AppData }).catch(() => null);
            const metadata = metadataStr ? JSON.parse(metadataStr) : null;

            // Load Dictionary
            const dictStr = await readTextFile(`${wsDir}/dictionary.json`, { baseDir: BaseDirectory.AppData }).catch(() => null);
            const dictionary = dictStr ? JSON.parse(dictStr) : [];

            // Load Chapters
            const chapters: any[] = [];
            const chapDir = `${wsDir}/chapters`;
            if (await exists(chapDir, { baseDir: BaseDirectory.AppData })) {
                const entries = await readDir(chapDir, { baseDir: BaseDirectory.AppData });
                for (const entry of entries) {
                    if (entry.isFile && entry.name.endsWith('.json')) {
                        const content = await readTextFile(`${chapDir}/${entry.name}`, { baseDir: BaseDirectory.AppData });
                        chapters.push(JSON.parse(content));
                    }
                }
            }

            return { workspace: metadata, dictionary, chapters };
        } catch (e) {
            console.error("StorageBridge: Failed to load workspace data", e);
            return null;
        }
    }

    async listWorkspaces() {
        if (!this.isTauri) return [];
        try {
            const path = "workspaces";
            if (!(await exists(path, { baseDir: BaseDirectory.AppData }))) return [];
            const entries = await readDir(path, { baseDir: BaseDirectory.AppData });
            return entries.filter(e => e.isDirectory).map(e => e.name);
        } catch (e) {
            console.error("StorageBridge: Failed to list workspaces", e);
            return [];
        }
    }

    async deleteWorkspace(workspaceId: string) {
        if (!this.isTauri) return;
        try {
            const wsDir = `workspaces/${workspaceId}`;
            if (await exists(wsDir, { baseDir: BaseDirectory.AppData })) {
                await remove(wsDir, { baseDir: BaseDirectory.AppData, recursive: true });
            }
        } catch (e) {
            console.error("StorageBridge: Failed to delete workspace directory:", e);
        }
    }

    inTauri() { return this.isTauri; }
}

export const storage = StorageBridge.getInstance();
