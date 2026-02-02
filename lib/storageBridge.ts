import { writeTextFile, readTextFile, exists, mkdir, BaseDirectory, readDir, remove, rename } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";
import type { Workspace, Chapter, DictionaryEntry } from "./db";

export class StorageBridge {
    private static instance: StorageBridge;

    private constructor() { }

    static getInstance() {
        if (!StorageBridge.instance) {
            StorageBridge.instance = new StorageBridge();
        }
        return StorageBridge.instance;
    }

    private isDev() {
        if (typeof window === 'undefined') return false;
        return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    }

    private getWsRoot() {
        return this.isDev() ? "workspaces_dev" : "workspaces";
    }

    private getExportRoot() {
        return this.isDev() ? "TRUYEN_DEV" : "TRUYEN_DA_DICH";
    }

    private async ensureDir(path: string) {
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
    private async saveAtomic(filePath: string, data: unknown) {
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

    private sanitizeFilename(name: string): string {
        return name.replace(/[<>:"/\\|?*]/g, '_').trim();
    }

    /**
     * Tự động dàn trang: Đảm bảo có dòng trống giữa các đoạn văn
     */
    private formatTxtContent(text: string): string {
        if (!text) return "";
        // 1. Chuẩn hóa xuống dòng và tách đoạn
        const paragraphs = text
            .replace(/\r\n/g, '\n')
            .split('\n')
            .map(p => p.trim())
            .filter(p => p.length > 0);

        // 2. Nối lại với 2 dấu xuống dòng (tạo dòng trống giữa các đoạn)
        return paragraphs.join('\n\n');
    }

    async saveMetadata(workspaceId: string, metadata: Workspace) {
        const folderName = `${this.sanitizeFilename(metadata.title || 'Untitled')}_${workspaceId.slice(0, 4)}`;
        const wsDir = `${this.getWsRoot()}/${folderName}`;
        await this.ensureDir(wsDir);
        await this.saveAtomic(`${wsDir}/metadata.json`, metadata);
    }

    async saveChapter(workspaceId: string, title: string, chapterId: number, data: Chapter) {
        const folderName = `${this.sanitizeFilename(title)}_${workspaceId.slice(0, 4)}`;
        const chapDir = `${this.getWsRoot()}/${folderName}/chapters`;
        await this.ensureDir(chapDir);
        await this.saveAtomic(`${chapDir}/${chapterId}.json`, data);
    }

    async saveDictionary(workspaceId: string, title: string, data: DictionaryEntry[]) {
        const folderName = `${this.sanitizeFilename(title)}_${workspaceId.slice(0, 4)}`;
        const wsDir = `${this.getWsRoot()}/${folderName}`;
        await this.ensureDir(wsDir);
        await this.saveAtomic(`${wsDir}/dictionary.json`, data);
    }

    async loadWorkspaceData(folderName: string) {
        if (!this.inTauri()) return null;

        const wsDir = `${this.getWsRoot()}/${folderName}`;
        try {
            if (!(await exists(wsDir, { baseDir: BaseDirectory.AppData }))) return null;

            // Load Metadata
            const metadataStr = await readTextFile(`${wsDir}/metadata.json`, { baseDir: BaseDirectory.AppData }).catch(() => null);
            const metadata: Workspace | null = metadataStr ? JSON.parse(metadataStr) : null;

            // Load Dictionary
            const dictStr = await readTextFile(`${wsDir}/dictionary.json`, { baseDir: BaseDirectory.AppData }).catch(() => null);
            const dictionary: DictionaryEntry[] = dictStr ? JSON.parse(dictStr) : [];

            // Load Chapters
            const chapters: Chapter[] = [];
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
        if (!this.inTauri()) return [];
        try {
            const path = this.getWsRoot();
            if (!(await exists(path, { baseDir: BaseDirectory.AppData }))) return [];
            const entries = await readDir(path, { baseDir: BaseDirectory.AppData });
            return entries.filter(e => e.isDirectory).map(e => e.name);
        } catch (e) {
            console.error("StorageBridge: Failed to list workspaces", e);
            return [];
        }
    }

    async syncFullStory(workspaceId: string, title: string, chapters: Chapter[]) {
        try {
            const folderName = `${this.sanitizeFilename(title)}_${workspaceId.slice(0, 4)}`;
            const wsDir = `${this.getWsRoot()}/${folderName}`;
            await this.ensureDir(wsDir);

            // Sắp xếp chương theo thứ tự
            const sorted = [...chapters].sort((a, b) => (a.order || 0) - (b.order || 0));

            let fullText = `${title}\n\n`;
            let translatedCount = 0;

            for (const chap of sorted) {
                const hasContent = chap.content_translated && chap.content_translated.trim().length > 0;
                if (chap.status === 'translated' || hasContent) {
                    const formattedContent = this.formatTxtContent(chap.content_translated || "");

                    fullText += `\n\n==================================================\n`;
                    fullText += `${chap.title_translated || chap.title}\n`;
                    fullText += `==================================================\n\n`;
                    fullText += `${formattedContent}\n`;
                    translatedCount++;
                }
            }

            const cleanTitle = this.sanitizeFilename(title) || "Full_Story";
            const internalPath = `${wsDir}/${cleanTitle}.txt`;

            // 1. Save internal backup
            await writeTextFile(internalPath, fullText, { baseDir: BaseDirectory.AppData });

            // 2. Save to global EXPORT folder for easy access
            const exportDir = this.getExportRoot();
            await this.ensureDir(exportDir);
            const exportPath = `${exportDir}/${cleanTitle}.txt`;
            await writeTextFile(exportPath, fullText, { baseDir: BaseDirectory.AppData });

            console.log(`✅ [Storage] TXT Mirror: ${title} (${translatedCount} chaps) | ENV: ${this.isDev() ? 'DEV' : 'PROD'}`);
            console.log(`📍 [Internal]: ${internalPath}`);
            console.log(`🚀 [Export]: ${exportPath}`);
        } catch (e) {
            console.error("StorageBridge: Failed to sync full story TXT", e);
        }
    }

    /**
     * FORCE SYNC: Đổ toàn bộ DB ra Disk (Dùng khi folder trống)
     */
    async syncAllWorkspaces(dbSource: unknown, toastId: string) {
        const db = dbSource as { workspaces: { toArray: () => Promise<Workspace[]> }; dictionary: { where: (key: string) => { equals: (val: string) => { toArray: () => Promise<DictionaryEntry[]> } } }; chapters: { where: (key: string) => { equals: (val: string) => { toArray: () => Promise<Chapter[]> } } } };
        toast.loading("Đang quét Database...", { id: toastId });
        try {
            const workspaces = await db.workspaces.toArray();
            console.log(`📂 [Storage] Found ${workspaces.length} workspaces in DB.`);

            if (workspaces.length === 0) {
                toast.error("Không có dữ liệu truyện trong máy để đồng bộ.", { id: toastId });
                return;
            }

            toast.loading(`Đang đồng bộ ${workspaces.length} bộ truyện...`, { id: toastId });

            for (const ws of workspaces) {
                const folderName = `${this.sanitizeFilename(ws.title)}_${ws.id.slice(0, 4)}`;
                const wsDir = `${this.getWsRoot()}/${folderName}`;

                // Kiểm tra xem folder đã tồn tại chưa để tránh ghi đè JSON mất thời gian
                const folderExists = await exists(wsDir, { baseDir: BaseDirectory.AppData });

                if (!folderExists) {
                    console.log(`⏳ [Storage] Creating NEW backup for: ${ws.title}`);
                    // 1. Metadata
                    await this.saveMetadata(ws.id, ws);
                    // 2. Dictionary
                    const dict = await db.dictionary.where('workspaceId').equals(ws.id).toArray();
                    await this.saveDictionary(ws.id, ws.title, dict);
                    // 3. Chapters JSON
                    const chapters = await db.chapters.where('workspaceId').equals(ws.id).toArray();
                    for (const chap of chapters) {
                        await this.saveChapter(ws.id, ws.title, chap.id!, chap);
                    }
                } else {
                    console.log(`⏩ [Storage] Skipping JSON sync for ${ws.title} (Already exists)`);
                }

                // 4. LUÔN LUÔN tạo/cập nhật file TXT (vì nó quan trọng)
                const chapters = await db.chapters.where('workspaceId').equals(ws.id).toArray();
                await this.syncFullStory(ws.id, ws.title, chapters);
            }

            toast.success(`Hệ thống đã đồng bộ toàn bộ dữ liệu ${this.isDev() ? '(DEV)' : '(PROD)'}!`, { id: toastId });
        } catch (e) {
            console.error("❌ [Storage] Force sync failed:", e);
            toast.error("Đồng bộ thất bại. Vui lòng kiểm tra Console.", { id: toastId });
        }
    }

    async deleteWorkspace(workspaceId: string) {
        try {
            // Cần tìm folder dựa trên ID vì folder name có chứa Title
            const root = this.getWsRoot();
            if (!(await exists(root, { baseDir: BaseDirectory.AppData }))) return;
            const entries = await readDir(root, { baseDir: BaseDirectory.AppData });
            const target = entries.find(e => e.isDirectory && e.name.endsWith(`_${workspaceId.slice(0, 4)}`));

            if (target) {
                await remove(`${this.getWsRoot()}/${target.name}`, { baseDir: BaseDirectory.AppData, recursive: true });
            }
        } catch (e) {
            console.error("StorageBridge: Failed to delete workspace directory:", e);
        }
    }

    inTauri() {
        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) return true;
        return false;
    }
}
export const storage = StorageBridge.getInstance();
