import { db, HeuristicTerm } from '@/lib/db';
import { scanWorkspaceHeuristics } from '@/lib/gemini/heuristic/scanner';
import { refineHeuristicTerms } from '@/lib/gemini/heuristic/refiner';
import { toast } from 'sonner';

export function useHeuristic(workspaceId: string) {
    const startScan = async (onProgress?: (current: number, total: number, message: string) => void) => {
        try {
            await scanWorkspaceHeuristics(workspaceId, onProgress);
            toast.success("Hệ thống đã quét xong dữ liệu Heuristic.");
        } catch (error) {
            console.error("Scan failed:", error);
            toast.error("Lỗi khi quét Heuristic.");
        }
    };

    const runAiRefine = async (onLog?: (msg: string) => void) => {
        try {
            await refineHeuristicTerms(workspaceId, onLog);
            toast.success("AI đã lọc và biên tập xong danh sách.");
        } catch (error) {
            console.error("Refine failed:", error);
            toast.error("Lỗi khi dùng AI lọc Heuristic.");
        }
    };

    const approveTerm = async (id: number) => {
        await db.heuristicTerms.update(id, { isApproved: true, updatedAt: new Date() });
    };

    const deleteTerm = async (id: number) => {
        const term = await db.heuristicTerms.get(id);
        if (term) {
            await db.blacklist.put({
                workspaceId,
                word: term.original,
                source: 'heuristic',
                createdAt: new Date()
            });
            await db.heuristicTerms.delete(id);
        }
    };

    const removeFromBlacklist = async (id: number) => {
        await db.blacklist.delete(id);
        toast.success("Đã xóa khỏi Blacklist Heuristic.");
    };

    const clearBlacklist = async () => {
        await db.blacklist
            .where('[workspaceId+source]')
            .equals([workspaceId, 'heuristic'])
            .delete();
        toast.success("Đã xóa sạch bộ nhớ Blacklist Heuristic.");
    };

    const approveAll = async (terms: HeuristicTerm[]) => {
        const ids = terms.map(t => t.id!).filter(id => !!id);
        await db.heuristicTerms.bulkUpdate(ids.map(id => ({
            key: id,
            changes: { isApproved: true, updatedAt: new Date() }
        })));
        toast.success(`Đã duyệt ${ids.length} thuật ngữ.`);
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
