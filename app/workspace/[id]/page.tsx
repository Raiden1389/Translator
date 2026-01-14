"use client";

import React, { useState, useEffect, use } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ArrowLeft, Save, Upload, BookOpen,
    Zap, Settings, Users, FileText,
    Share2, Database, LayoutDashboard
} from "lucide-react";
import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
import { ChapterList } from "@/components/workspace/ChapterList";
import { DictionaryTab } from "@/components/workspace/DictionaryTab";
import { CharacterTab } from "@/components/workspace/CharacterTab";


const OverviewTab = ({ workspace }: { workspace: any }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Left Column: Stats */}
            <div className="lg:col-span-1 space-y-6">
                <Card className="bg-[#1e1e2e] border-white/10 shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-white text-base">Thống Kê</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-white/50">Tổng số chương</span>
                            <span className="text-white font-medium">0</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-white/50">Đã dịch</span>
                            <span className="text-white font-medium">0</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-white/50">Thuật ngữ</span>
                            <span className="text-white font-medium">0</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-white/50">Nhân vật</span>
                            <span className="text-white font-medium">0</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#1e1e2e] border-white/10 shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-white text-base">Tác Giả</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-white/70 italic">{workspace.author || "Chưa rõ tác giả"}</p>
                    </CardContent>
                </Card>

                <Card className="bg-[#1e1e2e] border-white/10 shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-white text-base">Mô Tả</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-white/50 text-sm whitespace-pre-wrap">
                            {workspace.description || "Chưa có mô tả"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Right Column: Cover & Actions */}
            <div className="lg:col-span-2 space-y-6">
                <Card className="bg-[#1e1e2e] border-white/10 shadow-xl h-64 flex items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all" />
                    <div className="z-10 text-center space-y-2">
                        <Button variant="outline" className="border-dashed border-white/20 text-white/50 hover:text-white hover:border-white/50 h-24 w-24 rounded-2xl flex flex-col items-center justify-center gap-2">
                            <Upload className="h-6 w-6" />
                            <span className="text-xs">Tải ảnh bìa</span>
                        </Button>
                    </div>
                    <CardHeader className="absolute top-0 left-0">
                        <CardTitle className="text-white text-base">Ảnh bìa</CardTitle>
                    </CardHeader>
                </Card>

                <Card className="bg-gradient-to-br from-[#2d1b4e] to-[#1e1e2e] border-white/10 shadow-xl">
                    <CardContent className="p-8">
                        <h3 className="text-white font-bold text-lg mb-2">Đồng bộ & Xuất bản</h3>
                        <p className="text-white/50 text-sm mb-6">Trạng thái đồng bộ: <span className="text-amber-500 font-medium">Chưa đồng bộ</span></p>
                        <Button className="bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white">
                            <Share2 className="mr-2 h-4 w-4" /> Đồng bộ lên Cloud
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default function WorkspaceDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const searchParams = useSearchParams();
    const activeTabParam = searchParams.get("tab");

    const workspace = useLiveQuery(() => db.workspaces.get(id), [id]);

    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        if (activeTabParam) {
            setActiveTab(activeTabParam);
        }
    }, [activeTabParam]);

    if (workspace === undefined) return <div className="p-10 text-center text-white/50">Loading...</div>;
    if (workspace === null) return notFound();

    const tabs = [
        { id: "overview", label: "Tổng Quan", icon: LayoutDashboard },
        { id: "chapters", label: "Chương", icon: FileText },
        { id: "dictionary", label: "Từ Điển", icon: BookOpen },
        { id: "characters", label: "Nhân Vật", icon: Users },
        { id: "relations", label: "Quan Hệ", icon: Share2 },
        { id: "settings", label: "Cài Đặt", icon: Settings },
        { id: "export", label: "Xuất File", icon: Database },
    ];

    return (
        <main className="min-h-screen bg-[#1a0b2e] text-white pb-20">
            {/* Header Navigation */}
            <div className="bg-[#1e1e2e]/50 backdrop-blur-md border-b border-white/5 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10 rounded-full">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div className="flex flex-col">
                            <h1 className="text-lg font-bold leading-tight">{workspace.title}</h1>
                            <div className="text-xs text-white/50 flex items-center gap-2">
                                <span>{workspace.genre || "Chưa phân loại"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 mr-4 bg-black/20 rounded-full px-3 py-1">
                            <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="bg-primary w-0 h-full" />
                            </div>
                            <span className="text-xs font-mono text-white/70">0%</span>
                        </div>

                        <Button variant="outline" size="sm" className="hidden sm:flex border-white/10 text-white/70 hover:text-white hover:bg-white/10">
                            <Save className="mr-2 h-4 w-4" /> Lưu trữ Local
                        </Button>
                        <Button size="sm" className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0 shadow-lg shadow-orange-500/20">
                            <Zap className="mr-1 h-3 w-3" /> Upgrade
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="max-w-7xl mx-auto px-6 mt-2 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-1 pb-2">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                                        ${isActive
                                            ? "bg-[#2d1b4e] text-primary"
                                            : "text-white/60 hover:text-white hover:bg-white/5"
                                        }
                                    `}
                                >
                                    <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "opacity-70"}`} />
                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto p-6 mt-4">
                {activeTab === "overview" && <OverviewTab workspace={workspace} />}
                {activeTab === "chapters" && <ChapterList workspaceId={id} />}
                {activeTab === "dictionary" && <DictionaryTab workspaceId={id} />}
                {activeTab === "characters" && <CharacterTab workspaceId={id} />}
                {activeTab === "relations" && <div className="text-center text-white/30 pt-10">Tính năng Quan hệ đang phát triển...</div>}
                {activeTab === "settings" && <div className="text-center text-white/30 pt-10">Tính năng Cài đặt Workspace đang phát triển...</div>}
                {activeTab === "export" && <div className="text-center text-white/30 pt-10">Tính năng Xuất File đang phát triển...</div>}
            </div>
        </main>
    );
}
