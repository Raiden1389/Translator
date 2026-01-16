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
import { AISettingsTab } from "@/components/workspace/AISettingsTab";
import { ExportTab } from "@/components/workspace/ExportTab";





const AutoResizeTextarea = ({ defaultValue, placeholder, onSave }: { defaultValue: string, placeholder: string, onSave: (value: string) => void }) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    React.useEffect(() => {
        const el = textareaRef.current;
        if (el) {
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
        }
    }, []);

    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
        const el = e.currentTarget;
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
    };

    return (
        <textarea
            ref={textareaRef}
            className="bg-transparent text-white/50 text-sm whitespace-pre-wrap w-full border-none focus:ring-0 focus:outline-none resize-none placeholder:text-white/30 hover:bg-white/5 p-1 rounded transition-colors overflow-hidden"
            defaultValue={defaultValue}
            placeholder={placeholder}
            onInput={handleInput}
            onBlur={(e) => onSave(e.target.value)}
            rows={3}
        />
    );
};


const OverviewTab = ({ workspace }: { workspace: any }) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const processFile = (file: File) => {
        // Limit size? 5MB initial check
        if (file.size > 10 * 1024 * 1024) {
            alert("Ảnh quá lớn (< 10MB)");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Resize logic
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // Compress to JPEG 80% quality
                const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.8);

                db.workspaces.update(workspace.id, { cover: optimizedBase64, updatedAt: new Date() })
                    .catch(err => {
                        console.error("Failed to save cover", err);
                        alert("Lỗi khi lưu ảnh");
                    });
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            processFile(file);
        }
    };

    // Paste from Clipboard
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        e.preventDefault();
                        processFile(file);
                    }
                    break;
                }
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, [workspace.id]); // processFile dependency is implicitly handled via closure if defined inside, but better to watch workspace.id to reset binding if needed. 
    // Actually, since processFile is created on every render, and this useEffect depends on 'workspace.id', it might use a stale processFile if workspace updates without id change (unlikely).
    // But since `processFile` depends on `workspace` prop, and `workspace` prop changes on update...
    // To be safe, adding `processFile` to deps or refactoring is better, but here just `workspace.id` is enough as ID shouldn't change. 
    // And `processFile` uses `workspace.id` from closure. Ideally put `processFile` inside useEffect or use ref. 
    // Given the structure, `workspace` prop might update when `cover` updates (live query).
    // If I paste, `processFile` calls `db.update`, which triggers liveQuery update, which triggers re-render.
    // The `useEffect` with `[workspace.id]` will NOT re-run, so `processFile` inside the listener is the Initial Render's closure.
    // If `workspace.id` is constant, `processFile` is constant in functionality (it just uses `workspace.id`).
    // So it works fine.

    // Stats
    const totalChapters = useLiveQuery(
        () => db.chapters.where("workspaceId").equals(workspace.id).count(),
        [workspace.id]
    ) || 0;

    const translatedChapters = useLiveQuery(
        () => db.chapters.where("workspaceId").equals(workspace.id).filter(c => c.status === 'translated').count(),
        [workspace.id]
    ) || 0;

    const termCount = useLiveQuery(
        () => db.dictionary.filter(d => d.type !== 'name').count()
    ) || 0;

    const charCount = useLiveQuery(
        () => db.dictionary.where("type").equals("name").count()
    ) || 0;

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
                            <span className="text-white font-medium">{totalChapters.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-white/50">Đã dịch</span>
                            <span className="text-white font-medium text-emerald-400">{translatedChapters.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-white/50">Thuật ngữ</span>
                            <span className="text-white font-medium">{termCount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-white/50">Nhân vật</span>
                            <span className="text-white font-medium">{charCount.toLocaleString()}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#1e1e2e] border-white/10 shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-white text-base">Thông Tin</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs text-white/50 uppercase font-bold tracking-wider">Tác Giả</label>
                            <input
                                className="bg-transparent text-white/90 italic w-full border-b border-white/10 focus:border-primary focus:ring-0 focus:outline-none placeholder:text-white/20 py-1 transition-colors"
                                defaultValue={workspace.author}
                                placeholder="Chưa rõ tác giả"
                                onBlur={(e) => {
                                    if (e.target.value !== workspace.author) {
                                        db.workspaces.update(workspace.id, { author: e.target.value });
                                    }
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-white/50 uppercase font-bold tracking-wider">Thể Loại</label>
                            <input
                                className="bg-transparent text-white/90 w-full border-b border-white/10 focus:border-primary focus:ring-0 focus:outline-none placeholder:text-white/20 py-1 transition-colors"
                                defaultValue={workspace.genre}
                                placeholder="Chưa phân loại"
                                onBlur={(e) => {
                                    if (e.target.value !== workspace.genre) {
                                        db.workspaces.update(workspace.id, { genre: e.target.value });
                                    }
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#1e1e2e] border-white/10 shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-white text-base">Mô Tả</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <AutoResizeTextarea
                            defaultValue={workspace.description || ""}
                            placeholder="Chưa có mô tả"
                            onSave={(val) => {
                                if (val !== workspace.description) {
                                    db.workspaces.update(workspace.id, { description: val });
                                }
                            }}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Right Column: Cover & Actions */}
            <div className="lg:col-span-2 space-y-6">
                <Card
                    className={`bg-[#1e1e2e] border-white/10 shadow-xl h-52 flex items-center justify-center relative overflow-hidden group transition-all duration-300 ${isDragging ? 'border-primary border-2 bg-primary/10' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {workspace.cover ? (
                        <div className="absolute inset-0">
                            {/* Blurred Background Layer for Atmosphere */}
                            <div
                                className="absolute inset-0 bg-cover bg-center blur-xl opacity-40 scale-110"
                                style={{ backgroundImage: `url(${workspace.cover})` }}
                            />

                            {/* Main Image Layer - Contain to show full image */}
                            <div className="absolute inset-0 flex items-center justify-center p-4">
                                <img
                                    src={workspace.cover}
                                    alt="Cover"
                                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl z-10"
                                />
                            </div>

                            {/* Gradient Overlay for Text Readability at bottom (if needed) but here mostly for depth */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e2e] via-transparent to-transparent opacity-50" />
                        </div>
                    ) : (
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all" />
                    )}

                    {isDragging && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20 backdrop-blur-sm">
                            <p className="text-white text-lg font-bold animate-bounce">Thả ảnh vào đây!</p>
                        </div>
                    )}

                    <div className="z-20">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleCoverUpload}
                        />
                        {/* If cover exists, show small button top-right on hover. If no cover, show big center button */}
                        {workspace.cover ? (
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8 bg-black/60 text-white hover:bg-black/80 backdrop-blur-md border border-white/20 rounded-full"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        fileInputRef.current?.click();
                                    }}
                                    title="Đổi ảnh bìa"
                                >
                                    <Upload className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <Button
                                    variant="outline"
                                    className="pointer-events-auto border-dashed border-white/20 text-white/50 hover:text-white hover:border-white/50 h-24 w-24 rounded-2xl flex flex-col items-center justify-center gap-2 bg-black/20 backdrop-blur-sm"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="h-6 w-6" />
                                    <span className="text-xs">Tải ảnh bìa</span>
                                </Button>
                            </div>
                        )}
                    </div>
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
    const stats = useLiveQuery(async () => {
        const total = await db.chapters.where("workspaceId").equals(id).count();
        const translated = await db.chapters.where("workspaceId").equals(id).filter(c => c.status === 'translated').count();
        return { total, translated };
    }, [id]);

    const progress = stats ? (stats.total > 0 ? (stats.translated / stats.total) * 100 : 0) : 0;

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
                        <div className="flex items-center gap-2 mr-4 bg-black/20 rounded-full px-3 py-1" title={`${stats?.translated || 0}/${stats?.total || 0} chương đã dịch`}>
                            <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="bg-primary h-full transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <span className="text-xs font-mono text-white/70">{Math.round(progress)}%</span>
                        </div>
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
            <div className="max-w-7xl mx-auto p-6 mt-4 max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-hide">
                {activeTab === "overview" && <OverviewTab workspace={workspace} />}
                {activeTab === "chapters" && <ChapterList workspaceId={id} />}
                {activeTab === "dictionary" && <DictionaryTab workspaceId={id} />}
                {activeTab === "characters" && <CharacterTab workspaceId={id} />}
                {activeTab === "relations" && <div className="text-center text-white/30 pt-10">Tính năng Quan hệ đang phát triển...</div>}
                {activeTab === "settings" && (
                    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2">
                        <AISettingsTab />



                        <Card className="border-red-900/30 bg-red-900/5 shadow-xl">
                            <CardHeader>
                                <CardTitle className="text-red-400">Vùng Nguy Hiểm</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-white font-medium">Xóa Workspace</p>
                                        <p className="text-sm text-white/50">Hành động này không thể hoàn tác. Tất cả chương và dữ liệu sẽ bị xóa.</p>
                                    </div>
                                    <Button variant="destructive" className="bg-red-600 hover:bg-red-700">Delete Workspace</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
                {activeTab === "export" && <ExportTab workspaceId={id} />}
            </div>
        </main>
    );
}
