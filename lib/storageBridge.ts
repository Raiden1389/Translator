import { invoke } from "@tauri-apps/api/tauri";
import { appDataDir, join } from "@tauri-apps/api/path";
import { writeTextFile, readTextFile, exists, createDir, BaseDirectory } from "@tauri-apps/api/fs";

export class StorageBridge {
    private static instance: StorageBridge;
    private isTauri: boolean = false;

    private constructor() {
        this.isTauri = !!(window as any).__TAURI__;
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
            const dataPath = await appDataDir();
            const workspacesPath = await join(dataPath, "workspaces");

            if (!(await exists(workspacesPath))) {
                await createDir(workspacesPath, { recursive: true });
            }
            return workspacesPath;
        } catch (e) {
            console.error("Failed to ensure data dir", e);
        }
    }

    async saveWorkspace(workspaceId: string, data: any) {
        if (!this.isTauri) return;

        const dataPath = await this.ensureDataDir();
        if (!dataPath) return;

        const filePath = await join(dataPath, `${workspaceId}.json`);
        await writeTextFile(filePath, JSON.stringify(data, null, 2));
    }

    async loadWorkspace(workspaceId: string) {
        if (!this.isTauri) return null;

        const dataPath = await this.ensureDataDir();
        if (!dataPath) return null;

        const filePath = await join(dataPath, `${workspaceId}.json`);
        if (!(await exists(filePath))) return null;

        const content = await readTextFile(filePath);
        return JSON.parse(content);
    }

    // Helper to check if running in Tauri environment
    inTauri() {
        return this.isTauri;
    }
}

export const storage = StorageBridge.getInstance();
