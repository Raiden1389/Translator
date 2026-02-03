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
import { db, type HeuristicBlacklist } from '@/lib/db';

interface HeuristicBlacklistDialogProps {
    workspaceId: string;
    blacklist: HeuristicBlacklist[];
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
            await db.heuristicBlacklist.add({
                workspaceId,
                word: newWord.trim(),
                createdAt: Date.now()
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
            await db.heuristicBlacklist.delete(id);
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
                            className="h-9 w-9 bg-red-50 border-red-200 text-red-600 hover:bg-red-100 shadow-sm"
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
                            <Ban className="h-5 w-5 text-red-500" />
                            Blacklist ({blacklist.length} từ)
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportBlacklist}
                            className="gap-2"
                        >
                            <DownloadCloud className="h-4 w-4" />
                            Xuất TXT
                        </Button>
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
                            <div className="text-center text-slate-400 italic py-8 w-full">
                                Blacklist đang trống
                            </div>
                        ) : (
                            blacklist.map((item) => (
                                <Badge
                                    key={item.id}
                                    variant="secondary"
                                    className="gap-2 px-3 py-1.5 text-sm bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                >
                                    {item.word}
                                    <button
                                        onClick={() => handleRemoveBlacklist(item.id!)}
                                        className="hover:text-red-900"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
