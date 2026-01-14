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
                        <Link href={`/workspace/${ws.id}`} key={ws.id}>
                            {/* Card Design matching screenshot: Solid Header + Info Body */}
                            <div className="group relative h-full transition-transform hover:-translate-y-1 duration-300">
                                <Card className="h-full border-0 bg-[#2d1b4e] overflow-hidden rounded-2xl shadow-lg ring-1 ring-white/10 hover:ring-primary/50">
                                    {/* Header Color - Alternating for visual interest or based on status */}
                                    <div className={`h-24 p-6 relative flex flex-col justify-between ${i % 2 === 0 ? 'bg-gradient-to-r from-orange-500 to-amber-600' : 'bg-gradient-to-r from-purple-600 to-indigo-600'}`}>
                                        <div className="flex justify-between items-start">
                                            <span className="inline-flex items-center rounded-md bg-black/20 px-2 py-1 text-xs font-medium text-white ring-1 ring-inset ring-white/20">
                                                <BookOpen className="mr-1 h-3 w-3" />
                                                {ws.author || "N/A"}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-white/70 hover:text-white hover:bg-black/20 -mt-1 -mr-1"
                                                onClick={(e) => deleteWorkspace(e, ws.id)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>

                                    <CardContent className="p-5 pt-4 space-y-4">
                                        <div>
                                            <h3 className="font-bold text-lg text-white leading-tight line-clamp-2 min-h-[3.5rem]">
                                                {ws.title}
                                            </h3>
                                            <div className="mt-2 flex items-center text-xs text-muted-foreground">
                                                <span>Tiếng Trung (中文)</span>
                                                <span className="mx-2">→</span>
                                                <span>Tiếng Việt</span>
                                            </div>
                                        </div>

                                        {/* Progress Placeholder */}
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-xs text-white/50">
                                                <span>Tiến độ</span>
                                                <span>0 chương</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-primary w-[2%]" />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                            <div className="flex items-center text-[10px] text-white/40 bg-white/5 px-2 py-1 rounded-full">
                                                <Clock className="mr-1 h-3 w-3" />
                                                {ws.updatedAt.toLocaleDateString()}
                                            </div>
                                            <span className="text-[10px] text-primary font-medium bg-primary/10 px-2 py-1 rounded-full border border-primary/20">
                                                Đã đồng bộ
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
