import { db, HeuristicTerm } from '@/lib/db';
import { scanWorkspaceHeuristics } from '@/lib/gemini/heuristic/scanner';
import { refineHeuristicTerms } from '@/lib/gemini/heuristic/refiner';
import { toast } from 'sonner';

export function useHeuristic(workspaceId: string) {
    // ✅ FIX #1: Accept AbortSignal for timeout control
    const startScan = async (
        onProgress?: (current: number, total: number, message: string) => void,
        abortSignal?: AbortSignal
    ) => {
        try {
            // Check if already aborted
            if (abortSignal?.aborted) {
                throw new DOMException('Scan aborted', 'AbortError');
            }

            await scanWorkspaceHeuristics(workspaceId, onProgress, abortSignal);
            toast.success("Hệ thống đã quét xong dữ liệu Heuristic.");
        } catch (error) {
            // ✅ FIX #2: Distinguish abort vs actual error
            if (error instanceof DOMException && error.name === 'AbortError') {
                console.warn("[useHeuristic] Scan aborted by user/timeout");
                // Don't show error toast for abort
                return;
            }

            console.error("[useHeuristic] Scan failed:", error);
            toast.error("Lỗi khi quét Heuristic: " + ((error as Error)?.message || "Unknown error"));
            // Re-throw only for critical errors, don't swallow
            throw error;
        }
    };

    const runAiRefine = async (onLog?: (msg: string) => void) => {
        try {
            await refineHeuristicTerms(workspaceId, onLog);
            toast.success("AI đã lọc và biên tập xong danh sách.");
        } catch (error) {
            console.error("[useHeuristic] Refine failed:", error);
            toast.error("Lỗi khi dùng AI lọc Heuristic: " + ((error as Error)?.message || "Unknown error"));
            throw error;
        }
    };

    const approveTerm = async (id: number) => {
        try {
            await db.heuristicTerms.update(id, { isApproved: true, updatedAt: new Date() });
        } catch (error) {
            console.error("[useHeuristic] Approve term failed:", error);
            toast.error("Lỗi khi duyệt thuật ngữ");
            throw error;
        }
    };

    const deleteTerm = async (id: number) => {
        try {
            const term = await db.heuristicTerms.get(id);
            if (term) {
                await db.blacklist.put({
                    workspaceId,
                    word: term.original,
                    source: 'heuristic',
                    createdAt: new Date()
                });
                await db.heuristicTerms.delete(id);
                toast.success("✅ Đã xóa và thêm vào blacklist");
            }
        } catch (error) {
            console.error("[useHeuristic] Delete term failed:", error);
            toast.error("Lỗi khi xóa thuật ngữ");
            throw error;
        }
    };

    const removeFromBlacklist = async (id: number) => {
        try {
            await db.blacklist.delete(id);
            toast.success("Đã xóa khỏi Blacklist Heuristic.");
        } catch (error) {
            console.error("[useHeuristic] Remove from blacklist failed:", error);
            toast.error("Lỗi khi xóa khỏi blacklist");
            throw error;
        }
    };

    const clearBlacklist = async () => {
        try {
            await db.blacklist
                .where('[workspaceId+source]')
                .equals([workspaceId, 'heuristic'])
                .delete();
            toast.success("Đã xóa sạch bộ nhớ Blacklist Heuristic.");
        } catch (error) {
            console.error("[useHeuristic] Clear blacklist failed:", error);
            toast.error("Lỗi khi xóa blacklist");
            throw error;
        }
    };

    const approveAll = async (terms: HeuristicTerm[]) => {
        try {
            const ids = terms.map(t => t.id!).filter(id => !!id);
            if (ids.length === 0) {
                toast.warning("Không có thuật ngữ nào để duyệt");
                return;
            }

            await db.heuristicTerms.bulkUpdate(ids.map(id => ({
                key: id,
                changes: { isApproved: true, updatedAt: new Date() }
            })));
            toast.success(`✅ Đã duyệt ${ids.length} thuật ngữ.`);
        } catch (error) {
            console.error("[useHeuristic] Approve all failed:", error);
            toast.error("Lỗi khi duyệt hàng loạt");
            throw error;
        }
    };

    return {
        startScan,
        runAiRefine,
        approveTerm,
        deleteTerm,
        approveAll,
        removeFromBlacklist,
        clearBlacklist
    };
}
