"use client";

import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, rehydrateFromStorage } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NewWorkspaceDialog } from "@/components/dashboard/NewWorkspaceDialog";
import { BookOpen, Trash2, Search, Clock, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from 'next/link';
import { toast } from "sonner";

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
            className="font-bold text-lg text-foreground leading-tight bg-transparent border-transparent px-0 h-auto focus-visible:ring-0 focus:border-border hover:border-border transition-all p-1 -ml-1 rounded-sm w-full"
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
        <Link href={`/workspace?id=${ws.id}`}>
            <div className="group relative h-full transition-all hover:-translate-y-2 duration-500 active:scale-[0.98]">
                <Card className="h-full border-border bg-card overflow-hidden rounded-3xl shadow-lg transition-all group-hover:border-primary/30 group-hover:shadow-primary/5">
                    <div className={`h-32 p-6 relative flex flex-col justify-between transition-all duration-500 ${!ws.cover && (index % 2 === 0 ? 'bg-gradient-to-r from-orange-500 to-amber-600' : 'bg-gradient-to-r from-purple-600 to-indigo-600')}`}>
                        {ws.cover && (
                            <>
                                <img src={ws.cover} alt={ws.title} className="absolute inset-0 w-full h-full object-cover z-0 transition-transform duration-700 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#2d1b4e] via-[#2d1b4e]/60 to-transparent z-0" />
                            </>
                        )}

                        <div className="flex justify-between items-start relative z-10 w-full">
                            <span className="inline-flex items-center rounded-md bg-background/60 backdrop-blur-none px-2 py-1 text-xs font-medium text-foreground ring-1 ring-inset ring-border">
                                <BookOpen className="mr-1 h-3 w-3" />
                                {ws.author || "N/A"}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-foreground/70 hover:text-foreground hover:bg-background/60 backdrop-blur-none -mt-1 -mr-1"
                                onClick={(e) => onDelete(e, ws.id)}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>

                    <CardContent className="p-5 pt-2 space-y-4 relative z-10 -mt-4">
                        <div>
                            <EditableTitle id={ws.id} initialTitle={ws.title} />
                            <div className="mt-1 flex items-center text-xs text-muted-foreground">
                                <span>Tiếng Trung (中文)</span>
                                <span className="mx-2">→</span>
                                <span>Tiếng Việt</span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Tiến độ</span>
                                <span>{stats ? `${stats.translated}/${stats.total} chương` : 'Đang tính...'}</span>
                            </div>
                            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border">
                            <div className="flex items-center text-[10px] text-muted-foreground bg-secondary px-2 py-1 rounded-full">
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

    useEffect(() => {
        const checkAndRecover = async () => {
            if (workspaces && workspaces.length === 0) {
                // Potential recovery case
                await rehydrateFromStorage();
            }
        };
        checkAndRecover();
    }, [workspaces]);

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

    if (!workspaces) return <div className="p-10 text-center text-muted-foreground">Đang tải dữ liệu...</div>;

    return (
        <div className="space-y-6">
            {/* Action Bar - Floating Dock Style */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-foreground">My Library</h2>

                <div className="flex items-center gap-2 bg-card p-1.5 pl-4 rounded-full border border-border shadow-lg hover:border-primary/20 transition-all">
                    <div className="relative group w-64">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                        <Input
                            placeholder="Tìm kiếm workspace..."
                            className="pl-8 bg-transparent border-none text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-0 pr-0 h-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="h-5 w-px bg-border" />
                    <NewWorkspaceDialog />
                </div>
            </div>

            {workspaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 border border-dashed rounded-xl border-border bg-card text-center">
                    <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                        <Zap className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-xl font-bold text-foreground">Chưa có workspace nào</p>
                    <p className="text-muted-foreground mt-2 max-w-sm">
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
