import { invoke } from "@tauri-apps/api/core";
import { writeTextFile, readTextFile, exists, mkdir, BaseDirectory, readDir } from "@tauri-apps/plugin-fs";

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

    async ensureDataDir() {
        if (!this.isTauri) return;

        try {
            // In Tauri v2, we check/create relative to AppData base directory
            if (!(await exists("workspaces", { baseDir: BaseDirectory.AppData }))) {
                await mkdir("workspaces", { baseDir: BaseDirectory.AppData, recursive: true });
            }
        } catch (e) {
            // Silently fail - non-critical operation
        }
    }

    async saveWorkspace(workspaceId: string, data: any) {
        if (!this.isTauri) return;

        await this.ensureDataDir();

        try {
            const fileName = `workspaces/${workspaceId}.json`;
            await writeTextFile(fileName, JSON.stringify(data, null, 2), {
                baseDir: BaseDirectory.AppData
            });
        } catch (e) {
            // Silently fail - non-critical operation
        }
    }

    async loadWorkspace(workspaceId: string) {
        if (!this.isTauri) return null;

        await this.ensureDataDir();

        try {
            const fileName = `workspaces/${workspaceId}.json`;
            if (!(await exists(fileName, { baseDir: BaseDirectory.AppData }))) return null;

            const content = await readTextFile(fileName, {
                baseDir: BaseDirectory.AppData
            });
            return JSON.parse(content);
        } catch (e) {
            // Silently fail - return null
            return null;
        }
    }

    async listWorkspaces() {
        if (!this.isTauri) return [];

        await this.ensureDataDir();

        try {
            const entries = await readDir("workspaces", { baseDir: BaseDirectory.AppData });
            return entries
                .filter(e => e.isFile && e.name.endsWith('.json'))
                .map(e => e.name.replace('.json', ''));
        } catch (e) {
            // Silently fail - return empty array
            return [];
        }
    }

    // Helper to check if running in Tauri environment
    inTauri() {
        return this.isTauri;
    }
}

export const storage = StorageBridge.getInstance();
