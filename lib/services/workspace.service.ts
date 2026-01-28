import { db } from "@/lib/db";
import { storage } from "@/lib/storageBridge";

export interface DeleteWorkspaceResult {
    success: boolean;
    error?: string;
}

/**
 * Xóa sạch dữ liệu Workspace từ DB và Filesystem
 */
export async function deleteWorkspace(id: string): Promise<DeleteWorkspaceResult> {
    try {
        // Transactional Integrity: Đảm bảo tất cả DB operations đi cùng nhau
        await db.transaction('rw', [db.chapters, db.dictionary, db.blacklist, db.corrections, db.workspaces, db.history], async () => {
            await Promise.all([
                db.chapters.where("workspaceId").equals(id).delete(),
                db.dictionary.where("workspaceId").equals(id).delete(),
                db.blacklist.where("workspaceId").equals(id).delete(),
                db.corrections.where("workspaceId").equals(id).delete(),
                db.history.where("workspaceId").equals(id).delete()
            ]);

            // Thư mục workspace (Filesystem) - Xóa sau khi DB đã sạch thông tin Metadata
            // Lưu ý: storage.deleteWorkspace là async nhưng nằm ngoài transaction
            // Tuy nhiên ta gọi nó ngay sau đây
            await db.workspaces.delete(id);
        });

        // Xóa file vật lý
        await storage.deleteWorkspace(id);

        return { success: true };
    } catch (err: any) {
        console.error("Failed to delete workspace:", err);
        return { success: false, error: err?.message || "Lỗi khi xóa Workspace." };
    }
}

/**
 * Cleanup lịch sử phiên làm việc
 */
export async function clearSessionHistory(id: string) {
    try {
        await db.history.where("workspaceId").equals(id).delete();
    } catch (e) {
        console.error("Failed to clear history", e);
    }
}
