import { db, Chapter } from "@/lib/db";

/**
 * Xuất dữ liệu bản sao lưu JSON (Sách + Toàn bộ chương)
 */
export async function exportToJSON(workspaceId: string, selectedChapterIds?: number[]): Promise<void> {
    const ws = await db.workspaces.get(workspaceId);
    if (!ws) throw new Error("Không tìm thấy Workspace");

    const chs = selectedChapterIds && selectedChapterIds.length > 0
        ? await db.chapters.bulkGet(selectedChapterIds)
        : await db.chapters.where("workspaceId").equals(workspaceId).toArray();

    const exportData = {
        book: {
            title: ws.title,
            author: ws.author || "Chưa rõ",
            cover: ws.cover || "",
            description: ws.description || "",
            genre: ws.genre || "Khác",
            language: ws.sourceLang || "Chinese (中文)"
        },
        chapters: chs.filter(Boolean) as Chapter[]
    };

    const fileName = `raiden-export-${ws.title.replace(/\s+/g, '_') || 'unnamed'}-${new Date().getTime()}.json`;
    const content = JSON.stringify(exportData, null, 2);

    // Xử lý lưu file (Tauri hoặc Browser)
    const tauri = (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
    if (typeof window !== 'undefined' && tauri) {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeTextFile } = await import("@tauri-apps/plugin-fs");
        const path = await save({ defaultPath: fileName, filters: [{ name: 'JSON', extensions: ['json'] }] });
        if (path) await writeTextFile(path, content);
    } else {
        const blob = new Blob([content], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    }
}
