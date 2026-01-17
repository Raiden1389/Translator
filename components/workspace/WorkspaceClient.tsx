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
import { cn } from "@/lib/utils";

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
    }, [workspace.id]);

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
        <div className="max-w-[1800px] mx-auto px-6 lg:px-8 py-6">
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
        </div>
    );
};

export default function WorkspaceClient({ id }: { id: string }) {
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
        <div className="flex h-screen bg-[#0a0514] text-white">
            {/* Desktop Sidebar */}
            <aside className="w-64 border-r border-white/5 bg-[#0d0617]/50 backdrop-blur-xl flex flex-col pt-10 shrink-0 transition-all duration-300">
                <div className="px-6 mb-6">
                    <Link href="/">
                        <Button variant="ghost" size="sm" className="w-full justify-start text-white/40 hover:text-white hover:bg-white/5 -ml-2 gap-2 text-[10px] uppercase font-bold tracking-widest transition-colors group">
                            <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" /> Back to Library
                        </Button>
                    </Link>
                </div>

                <div className="px-6 mb-8 flex flex-col gap-1">
                    <h1 className="text-lg font-black text-white leading-tight tracking-tight font-[var(--font-lora)] italic line-clamp-2">{workspace.title}</h1>
                    <span className="text-[10px] text-white/20 uppercase font-bold tracking-[0.2em]">{workspace.genre || "Uncategorized"}</span>

                    <div className="mt-6 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[9px] text-white/30 font-black uppercase tracking-widest">
                            <span>Neural Progress</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[#6c5ce7] via-[#a29bfe] to-[#6c5ce7] bg-[length:200%_100%] animate-gradient-x transition-all duration-1000"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-3 space-y-1">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all group relative",
                                    isActive
                                        ? "text-white"
                                        : "text-white/40 hover:text-white hover:bg-white/5"
                                )}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-[#6c5ce7]/10 border border-[#6c5ce7]/20 rounded-2xl shadow-[0_0_20px_rgba(108,92,231,0.05)]" />
                                )}
                                <div className={cn(
                                    "p-1.5 rounded-xl transition-all relative z-10",
                                    isActive ? "bg-[#6c5ce7] text-white shadow-lg shadow-[#6c5ce7]/20" : "bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-white"
                                )}>
                                    <Icon className="h-3.5 w-3.5" />
                                </div>
                                <span className="relative z-10">{tab.label}</span>
                                {isActive && (
                                    <div className="ml-auto w-1 h-4 bg-[#6c5ce7] rounded-full relative z-10" />
                                )}
                            </button>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <div className="group flex items-center gap-3 p-4 rounded-3xl bg-gradient-to-br from-white/5 to-transparent border border-white/10 hover:border-[#6c5ce7]/30 transition-all cursor-default">
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#6c5ce7] to-[#fd79a8] flex items-center justify-center text-[10px] font-black text-white shadow-[0_0_15px_rgba(108,92,231,0.2)] group-hover:scale-110 transition-transform">
                            AI
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black text-white/90 tracking-tight">AI Engine v3.0</span>
                            <span className="text-[9px] text-white/40 uppercase font-bold tracking-widest">Gemini 1.5 Pro</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col relative">
                {/* Internal Header for Content - useful for context */}
                <header className="h-20 flex items-center justify-between px-8 pt-4 border-b border-white/5 bg-[#0a0514]/30 backdrop-blur-sm shrink-0">
                    <h2 className="text-sm font-bold text-white/80 capitalize flex items-center gap-2">
                        {tabs.find(t => t.id === activeTab)?.label}
                        <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-white/30 font-mono">WORKSPACE_ID: {id.slice(0, 8)}</span>
                    </h2>

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-8 text-[10px] hover:bg-white/5 text-white/40">Docs</Button>
                        <Button variant="ghost" size="sm" className="h-8 text-[10px] hover:bg-white/5 text-white/40">Support</Button>
                        <div className="h-4 w-px bg-white/5 mx-2" />
                        <Button size="sm" className="h-8 text-[10px] bg-white/5 hover:bg-white/10 text-white border border-white/10">Quick Sync</Button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-6xl mx-auto">
                        {activeTab === "overview" && <OverviewTab workspace={workspace} />}
                        {activeTab === "chapters" && <ChapterList workspaceId={id} />}
                        {activeTab === "dictionary" && <DictionaryTab workspaceId={id} />}
                        {activeTab === "characters" && <CharacterTab workspaceId={id} />}
                        {activeTab === "relations" && <div className="text-center text-white/30 pt-10">Tính năng Quan hệ đang phát triển...</div>}
                        {activeTab === "settings" && (
                            <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-2">
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
                </div>
            </div>
        </div>
    );
}
