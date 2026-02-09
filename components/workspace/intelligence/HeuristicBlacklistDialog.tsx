/**
 * Heuristic Blacklist Dialog
 * Manage blacklist words for heuristic filtering
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Ban, Plus, X, DownloadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { writeTextFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { db, type BlacklistEntry } from '@/lib/db';

interface HeuristicBlacklistDialogProps {
    workspaceId: string;
    blacklist: BlacklistEntry[];
}

export function HeuristicBlacklistDialog({ workspaceId, blacklist }: HeuristicBlacklistDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [newWord, setNewWord] = useState('');

    const handleAddBlacklist = async () => {
        if (!newWord.trim()) {
            toast.error("Vui lòng nhập từ cần blacklist!");
            return;
        }

        const exists = blacklist.some(b => b.word === newWord.trim());
        if (exists) {
            toast.error("Từ này đã có trong blacklist!");
            return;
        }

        try {
            await db.blacklist.add({
                workspaceId,
                word: newWord.trim(),
                source: 'heuristic',
                createdAt: new Date()
            });
            toast.success(`✅ Đã thêm "${newWord.trim()}" vào blacklist`);
            setNewWord('');
        } catch (err) {
            console.error('Add blacklist error:', err);
            toast.error("❌ Lỗi thêm blacklist: " + String(err));
        }
    };

    const handleRemoveBlacklist = async (id: number) => {
        try {
            await db.blacklist.delete(id);
            toast.success("✅ Đã xóa khỏi blacklist");
        } catch (err) {
            console.error('Remove blacklist error:', err);
            toast.error("❌ Lỗi xóa blacklist: " + String(err));
        }
    };

    const handleExportBlacklist = async () => {
        if (!blacklist || blacklist.length === 0) {
            toast.error("Blacklist đang trống!");
            return;
        }
        try {
            const content = blacklist.map(b => b.word).join('\n');
            const filename = `heuristic_blacklist_${new Date().getTime()}.txt`;
            await writeTextFile(filename, content, { baseDir: BaseDirectory.Desktop });
            toast.success(`✅ Đã xuất Blacklist ra Desktop/${filename}`);
        } catch (err) {
            toast.error("❌ Lỗi xuất Blacklist: " + String(err));
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/10 shadow-sm"
                        >
                            <Ban className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Quản lý Blacklist ({blacklist.length})</p>
                </TooltipContent>
            </Tooltip>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Ban className="h-5 w-5 text-destructive" />
                            Blacklist ({blacklist.length} từ)
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                    if (!confirm(`⚠️ Xóa TOÀN BỘ ${blacklist.length} từ trong Blacklist?\n\nHành động này KHÔNG THỂ hoàn tác!`)) {
                                        return;
                                    }
                                    try {
                                        await db.blacklist.where('workspaceId').equals(workspaceId).delete();
                                        toast.success(`✅ Đã xóa sạch ${blacklist.length} từ`);
                                    } catch (err) {
                                        toast.error("❌ Lỗi xóa: " + String(err));
                                    }
                                }}
                                className="gap-2 text-destructive hover:text-destructive/80"
                            >
                                <X className="h-4 w-4" />
                                Xóa tất cả
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportBlacklist}
                                className="gap-2"
                            >
                                <DownloadCloud className="h-4 w-4" />
                                Xuất TXT
                            </Button>
                        </div>
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-auto space-y-4">
                    {/* Add new word */}
                    <div className="flex gap-2">
                        <Input
                            placeholder="Nhập từ cần blacklist..."
                            value={newWord}
                            onChange={(e) => setNewWord(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddBlacklist()}
                            className="flex-1"
                        />
                        <Button onClick={handleAddBlacklist} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Thêm
                        </Button>
                    </div>

                    {/* Blacklist items */}
                    <div className="flex flex-wrap gap-2">
                        {blacklist.length === 0 ? (
                            <div className="text-center text-muted-foreground italic py-8 w-full">
                                Blacklist đang trống
                            </div>
                        ) : (
                            <>
                                <div className="w-full text-[10px] text-muted-foreground italic mb-2 px-1">
                                    💡 Mẹo: Sau khi xóa khỏi đây, sếp hãy chạy lại &quot;START RADAR SCAN&quot; để thuật ngữ xuất hiện lại ở trang Discovery.
                                </div>
                                {blacklist.map((item) => (
                                    <Badge
                                        key={item.id}
                                        variant="secondary"
                                        className="gap-2 px-3 py-1.5 text-sm bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                                    >
                                        {item.word}
                                        <button
                                            onClick={() => handleRemoveBlacklist(item.id!)}
                                            className="hover:text-destructive/80"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
