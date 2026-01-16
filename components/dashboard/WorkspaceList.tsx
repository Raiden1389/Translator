"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NewWorkspaceDialog } from "@/components/dashboard/NewWorkspaceDialog";
import { BookOpen, Trash2, Search, Clock, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from 'next/link';

const EditableTitle = ({ id, initialTitle }: { id: string, initialTitle: string }) => {
    const [title, setTitle] = useState(initialTitle);

    // Sync with external changes if needed (optional, keeping it simple for now)
    // If the DB updates from elsewhere, this local state might be stale, but it prevents cursor jumping.

    const handleBlur = () => {
        if (title !== initialTitle) {
            db.workspaces.update(id, { title });
        }
    };

    return (
        <Input
            className="font-bold text-lg text-white leading-tight bg-transparent border-transparent px-0 h-auto focus-visible:ring-0 focus:border-white/20 hover:border-white/10 transition-all p-1 -ml-1 rounded-sm w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
        />
    );
};

const WorkspaceCard = ({ ws, index, onDelete }: { ws: any, index: number, onDelete: (e: React.MouseEvent, id: string) => void }) => {
    const stats = useLiveQuery(async () => {
        const total = await db.chapters.where("workspaceId").equals(ws.id).count();
        const translated = await db.chapters.where("workspaceId").equals(ws.id).and(c => c.status === 'translated').count();
        return { total, translated };
    }, [ws.id]);

    const progress = stats ? (stats.total > 0 ? (stats.translated / stats.total) * 100 : 0) : 0;

    return (
        <Link href={`/workspace/${ws.id}`}>
            <div className="group relative h-full transition-transform hover:-translate-y-1 duration-300">
                <Card className="h-full border-0 bg-[#2d1b4e] overflow-hidden rounded-2xl shadow-lg ring-1 ring-white/10 hover:ring-primary/50">
                    <div className={`h-32 p-6 relative flex flex-col justify-between transition-all duration-500 ${!ws.cover && (index % 2 === 0 ? 'bg-gradient-to-r from-orange-500 to-amber-600' : 'bg-gradient-to-r from-purple-600 to-indigo-600')}`}>
                        {ws.cover && (
                            <>
                                <img src={ws.cover} alt={ws.title} className="absolute inset-0 w-full h-full object-cover z-0 transition-transform duration-700 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#2d1b4e] via-[#2d1b4e]/60 to-transparent z-0" />
                            </>
                        )}

                        <div className="flex justify-between items-start relative z-10 w-full">
                            <span className="inline-flex items-center rounded-md bg-black/40 backdrop-blur-md px-2 py-1 text-xs font-medium text-white ring-1 ring-inset ring-white/20">
                                <BookOpen className="mr-1 h-3 w-3" />
                                {ws.author || "N/A"}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-white/70 hover:text-white hover:bg-black/40 backdrop-blur-sm -mt-1 -mr-1"
                                onClick={(e) => onDelete(e, ws.id)}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>

                    <CardContent className="p-5 pt-2 space-y-4 relative z-10 -mt-4">
                        <div>
                            <EditableTitle id={ws.id} initialTitle={ws.title} />
                            <div className="mt-1 flex items-center text-xs text-white/50">
                                <span>Tiếng Trung (中文)</span>
                                <span className="mx-2">→</span>
                                <span>Tiếng Việt</span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-white/50">
                                <span>Tiến độ</span>
                                <span>{stats ? `${stats.translated}/${stats.total} chương` : 'Đang tính...'}</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                            <div className="flex items-center text-[10px] text-white/40 bg-white/5 px-2 py-1 rounded-full">
                                <Clock className="mr-1 h-3 w-3" />
                                {ws.updatedAt.toLocaleDateString()}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Link>
    );
};

export function WorkspaceList() {
    const workspaces = useLiveQuery(() => db.workspaces.orderBy("updatedAt").reverse().toArray());
    const [search, setSearch] = useState("");

    const deleteWorkspace = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm("Xóa bộ này nhé?")) {
            await db.workspaces.delete(id);
            const chapters = await db.chapters.where("workspaceId").equals(id).primaryKeys();
            await db.chapters.bulkDelete(chapters);
        }
    }

    const filtered = workspaces?.filter(w => w.title.toLowerCase().includes(search.toLowerCase()));

    if (!workspaces) return <div className="p-10 text-center text-white/50">Đang tải dữ liệu...</div>;

    return (
        <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                    <Input
                        placeholder="Tìm kiếm workspace..."
                        className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-primary/50 rounded-full"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <NewWorkspaceDialog />
            </div>

            {workspaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 border border-dashed rounded-xl border-white/10 bg-white/5 text-center">
                    <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
                        <Zap className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-xl font-bold text-white">Chưa có workspace nào</p>
                    <p className="text-white/50 mt-2 max-w-sm">
                        Tạo workspace mới để bắt đầu dịch truyện với sức mạnh của AI.
                    </p>
                    <div className="mt-6">
                        <NewWorkspaceDialog />
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filtered?.map((ws, i) => (
                        <WorkspaceCard key={ws.id} ws={ws} index={i} onDelete={deleteWorkspace} />
                    ))}
                </div>
            )}
        </div>
    );
}
