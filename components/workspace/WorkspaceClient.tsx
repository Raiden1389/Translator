"use client";

import React, { useState, useEffect, use } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ArrowLeft, Save, Upload, BookOpen,
    Zap, Settings, Users, FileText,
    Database, LayoutDashboard, Swords,
    Sparkles, Loader2
} from "lucide-react";
import { generateBookSummary } from "@/lib/gemini";
import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
import { ChapterList } from "@/components/workspace/ChapterList";
import { DictionaryTab } from "@/components/workspace/DictionaryTab";
import { CharacterTab } from "@/components/workspace/CharacterTab";
import { AISettingsTab } from "@/components/workspace/AISettingsTab";
import { ExportTab } from "@/components/workspace/ExportTab";
import { PromptLab } from "@/components/workspace/PromptLab";
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
            className="bg-transparent text-foreground text-sm whitespace-pre-wrap w-full border-none focus:ring-0 focus:outline-none resize-none placeholder:text-muted-foreground/30 hover:bg-muted/50 p-1 rounded transition-colors overflow-hidden"
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
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

    const handleAutoSummary = async () => {
        try {
            setIsGeneratingSummary(true);

            // 1. Fetch First 5 chapters
            const firstChapters = await db.chapters
                .where("workspaceId")
                .equals(workspace.id)
                .limit(5)
                .toArray();

            // 2. Fetch Latest Translated Chapter
            const latestChapter = await db.chapters
                .where("workspaceId")
                .equals(workspace.id)
                .filter(c => c.status === 'translated')
                .reverse()
                .limit(1)
                .toArray();

            const contextText = [...firstChapters, ...latestChapter]
                .map(c => `Chapter: ${c.title}\n${c.content_original.slice(0, 1000)}...`)
                .join("\n\n---\n\n");

            if (!contextText.trim()) {
                alert("Cần ít nhất một chương để tóm tắt.");
                return;
            }

            const modelSetting = await db.settings.get("aiModel");
            const aiModel = modelSetting?.value || "gemini-3-flash-preview";

            const summary = await generateBookSummary(contextText, aiModel);

            await db.workspaces.update(workspace.id, {
                description: summary,
                isAiDescription: true,
                updatedAt: new Date()
            });

        } catch (err) {
            console.error("Failed to generate summary", err);
            alert("Lỗi khi tạo tóm tắt.");
        } finally {
            setIsGeneratingSummary(false);
        }
    };

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
        () => db.dictionary.where("workspaceId").equals(workspace.id).filter(d => d.type !== 'name').count(),
        [workspace.id]
    ) || 0;

    const charCount = useLiveQuery(
        () => db.dictionary.where("workspaceId").equals(workspace.id).filter(d => d.type === 'name').count(),
        [workspace.id]
    ) || 0;

    const apiUsage = useLiveQuery(() => db.apiUsage.toArray()) || [];
    const totalInputTokens = apiUsage.reduce((acc, curr) => acc + (curr.inputTokens || 0), 0);
    const totalOutputTokens = apiUsage.reduce((acc, curr) => acc + (curr.outputTokens || 0), 0);
    const totalCostUSD = apiUsage.reduce((acc, curr) => acc + (curr.totalCost || 0), 0);
    const totalCostVND = totalCostUSD * 25400; // Hardcoded exchange rate for now

    return (
        <div className="max-w-[1800px] mx-auto px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Left Column: Stats & Info */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="bg-card border-border shadow-md overflow-hidden relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CardHeader className="pb-2">
                            <CardTitle className="text-foreground text-base flex items-center gap-2">
                                <Zap className="w-4 h-4 text-primary" />
                                Thống Kê
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-sm p-3 rounded-lg bg-background border border-border hover:border-primary/20 transition-colors">
                                <span className="text-muted-foreground">Tổng số chương</span>
                                <span className="text-foreground font-bold font-mono text-lg">{totalChapters.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm p-3 rounded-lg bg-background border border-border hover:border-primary/20 transition-colors">
                                <span className="text-muted-foreground">Đã dịch</span>
                                <span className="text-emerald-600 font-bold font-mono text-lg">{translatedChapters.toLocaleString()}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-lg bg-background border border-border text-center">
                                    <div className="text-xs text-muted-foreground mb-1">Thuật ngữ</div>
                                    <div className="text-foreground font-bold">{termCount.toLocaleString()}</div>
                                </div>
                                <div className="p-3 rounded-lg bg-background border border-border text-center">
                                    <div className="text-xs text-muted-foreground mb-1">Nhân vật</div>
                                    <div className="text-foreground font-bold">{charCount.toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-border mt-2 space-y-3">
                                <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Chi Phí API (Tạm tính)</div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center bg-muted/30 p-2 rounded-lg border border-border/50">
                                        <div className="text-xs text-muted-foreground font-medium">Tổng Token</div>
                                        <div className="text-foreground font-bold font-mono text-sm">
                                            {((totalInputTokens + totalOutputTokens) / 1000).toFixed(1)}K
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center bg-primary/5 p-2 rounded-lg border border-primary/10">
                                        <div className="text-xs text-primary/70 font-bold uppercase tracking-tight">Thanh toán</div>
                                        <div className="text-right">
                                            <div className="text-primary font-black font-mono text-lg leading-tight">${totalCostUSD.toFixed(3)}</div>
                                            <div className="text-[10px] text-primary/40 font-bold">~{Math.round(totalCostVND).toLocaleString()} VNĐ</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border shadow-md overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-foreground text-base flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-primary" />
                                Thông Tin
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2 group">
                                <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest flex items-center gap-2 group-focus-within:text-primary transition-colors">
                                    <Users className="w-3 h-3" /> Tác Giả
                                </label>
                                <input
                                    className="bg-transparent text-foreground font-bold text-lg w-full border-b border-border focus:border-primary focus:ring-0 focus:outline-none placeholder:text-muted-foreground/20 py-2 transition-all"
                                    defaultValue={workspace.author?.normalize('NFC')}
                                    placeholder="Chưa rõ tác giả"
                                    onBlur={(e) => {
                                        const val = e.target.value.normalize('NFC');
                                        if (val !== workspace.author) {
                                            db.workspaces.update(workspace.id, { author: val });
                                        }
                                    }}
                                />
                            </div>
                            <div className="space-y-2 group">
                                <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest flex items-center gap-2 group-focus-within:text-primary transition-colors">
                                    <Database className="w-3 h-3" /> Thể Loại
                                </label>
                                <input
                                    className="bg-transparent text-foreground text-base w-full border-b border-border focus:border-primary focus:ring-0 focus:outline-none placeholder:text-muted-foreground/20 py-2 transition-all"
                                    defaultValue={workspace.genre?.normalize('NFC')}
                                    placeholder="Chưa phân loại"
                                    onBlur={(e) => {
                                        const val = e.target.value.normalize('NFC');
                                        if (val !== workspace.genre) {
                                            db.workspaces.update(workspace.id, { genre: val });
                                        }
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Cover & Description */}
                <div className="lg:col-span-2 space-y-6 flex flex-col h-full">
                    <Card
                        className={`bg-card border-border shadow-md h-64 flex items-center justify-center relative overflow-hidden group transition-all duration-300 ${isDragging ? 'border-primary border-2 bg-primary/5' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        {workspace.cover ? (
                            <div className="absolute inset-0 w-full h-full">
                                {/* Blurred Background Layer */}
                                <div
                                    className="absolute inset-0 bg-cover bg-center blur-2xl opacity-30 scale-110 transition-transform duration-700 group-hover:scale-125"
                                    style={{ backgroundImage: `url(${workspace.cover})` }}
                                />

                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />

                                <div className="absolute inset-0 flex items-center justify-center p-6">
                                    <img
                                        src={workspace.cover}
                                        alt="Cover"
                                        className="h-full w-auto object-contain rounded-lg shadow-xl z-10 transition-transform duration-500 group-hover:scale-[1.02]"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/20 group-hover:bg-muted/40 transition-colors gap-4">
                                <div className="p-4 rounded-full bg-background border border-border group-hover:scale-110 transition-transform duration-300">
                                    <Upload className="h-8 w-8 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                                </div>
                                <p className="text-muted-foreground/40 text-sm font-medium">Kéo thả hoặc tải ảnh bìa</p>
                            </div>
                        )}

                        {isDragging && (
                            <div className="absolute inset-0 flex items-center justify-center bg-primary/20 z-30 backdrop-blur-sm border-2 border-primary border-dashed m-2 rounded-xl">
                                <p className="text-white text-lg font-bold animate-pulse">Thả ảnh vào đây!</p>
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
                            {workspace.cover ? (
                                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="bg-background/80 text-foreground hover:bg-background border border-border shadow-md"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            fileInputRef.current?.click();
                                        }}
                                    >
                                        <Upload className="h-4 w-4 mr-2" /> Đổi ảnh
                                    </Button>
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <Button
                                        variant="ghost"
                                        className="pointer-events-auto opacity-0" // Hidden but clickable via the parent container click usually, doing verify explicit click below
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        Hidden Trigger
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card className="bg-card border-border shadow-md flex-1 flex flex-col">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-foreground text-base flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-primary" />
                                    Mô Tả / Tóm Tắt
                                    {workspace.isAiDescription && (
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[9px] text-emerald-600 font-black uppercase tracking-tighter shadow-sm animate-in fade-in zoom-in duration-300">
                                            <Sparkles className="w-2.5 h-2.5" />
                                            AI Generated
                                        </div>
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        "h-7 px-2 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-300 rounded-lg group/wand",
                                        isGeneratingSummary && "animate-pulse"
                                    )}
                                    onClick={handleAutoSummary}
                                    disabled={isGeneratingSummary}
                                    title="Tự động tóm tắt bằng AI"
                                >
                                    {isGeneratingSummary ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                    ) : (
                                        <Sparkles className="w-3.5 h-3.5 group-hover/wand:scale-110 transition-transform" />
                                    )}
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <AutoResizeTextarea
                                defaultValue={workspace.description || ""}
                                placeholder="Nhập mô tả hoặc tóm tắt truyện tại đây..."
                                onSave={(val) => {
                                    if (val !== workspace.description) {
                                        db.workspaces.update(workspace.id, {
                                            description: val,
                                            isAiDescription: false // Reset flag if manually edited
                                        });
                                    }
                                }}
                            />
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

    if (workspace === undefined) return <div className="p-10 text-center text-muted-foreground">Loading...</div>;
    if (workspace === null) return notFound();

    const tabs = [
        { id: "overview", label: "Tổng Quan", icon: LayoutDashboard },
        { id: "chapters", label: "Chương", icon: FileText },
        { id: "dictionary", label: "Từ Điển", icon: BookOpen },
        { id: "characters", label: "Nhân Vật", icon: Users },
        { id: "promptLab", label: "Prompt Lab", icon: Swords },

        { id: "settings", label: "Cài Đặt", icon: Settings },
        { id: "export", label: "Xuất File", icon: Database },
    ];

    return (
        <div className="flex h-full w-full bg-background text-foreground overflow-hidden">
            {/* Desktop Sidebar */}
            <aside className="w-64 border-r border-sidebar-border bg-sidebar flex flex-col pt-10 shrink-0 h-full overflow-hidden transition-all duration-300">
                <div className="px-6 mb-6">
                    <Link href="/">
                        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-sidebar-accent -ml-2 gap-2 text-[10px] uppercase font-bold tracking-widest transition-colors group">
                            <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" /> Back to Library
                        </Button>
                    </Link>
                </div>

                <div className="px-6 mb-8 flex flex-col gap-1">
                    <h1 className="text-lg font-bold text-foreground leading-tight tracking-tight line-clamp-2">{workspace.title?.normalize('NFC')}</h1>
                    <span className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em]">{workspace.genre || "Uncategorized"}</span>

                    <div className="mt-6 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[9px] text-muted-foreground font-black uppercase tracking-widest">
                            <span>Neural Progress</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full h-1 bg-border rounded-full overflow-hidden relative">
                            <div
                                className="h-full bg-primary transition-all duration-1000 will-change-[width] relative"
                                style={{ width: `${progress}%` }}
                            >
                                {/* Shimmer Overlay - Only run when active (1-99%) to save GPU on idle */}
                                {progress > 0 && progress < 100 && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer-fast w-full" />
                                )}
                            </div>
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
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                                )}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-primary/5 border border-primary/20 rounded-2xl shadow-sm" />
                                )}
                                <div className={cn(
                                    "p-1.5 rounded-xl transition-all relative z-10",
                                    isActive ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground group-hover:bg-muted/80 group-hover:text-foreground"
                                )}>
                                    <Icon className="h-3.5 w-3.5" />
                                </div>
                                <span className="relative z-10">{tab.label}</span>
                                {isActive && (
                                    <div className="ml-auto w-1 h-4 bg-primary rounded-full relative z-10" />
                                )}
                            </button>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-sidebar-border">
                    <div className="group flex items-center gap-3 p-4 rounded-3xl bg-gradient-to-br from-muted/50 to-transparent border border-sidebar-border hover:border-primary/30 transition-all cursor-default text-sidebar-foreground">
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-[10px] font-black text-white shadow-xl group-hover:scale-110 transition-transform">
                            AI
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black opacity-90 tracking-tight">AI Engine v3.0</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Content Area */}
            <div className="flex-1 min-w-0 overflow-hidden flex flex-col relative h-full">
                {/* Internal Header for Content - useful for context */}
                <header className="h-20 flex items-center justify-between px-8 pt-4 border-b border-border bg-background shrink-0">
                    <h2 className="text-sm font-bold text-foreground capitalize flex items-center gap-2">
                        {tabs.find(t => t.id === activeTab)?.label}
                        <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground font-mono font-black">WORKSPACE_ID: {id.slice(0, 8)}</span>
                    </h2>

                    <div className="flex items-center gap-2">
                        {/* Placeholder buttons removed based on user feedback */}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-6xl mx-auto">
                        {activeTab === "overview" && <OverviewTab workspace={workspace} />}
                        {activeTab === "chapters" && <ChapterList workspaceId={id} />}
                        {activeTab === "dictionary" && <DictionaryTab workspaceId={id} />}
                        {activeTab === "characters" && <CharacterTab workspaceId={id} />}
                        {activeTab === "promptLab" && <PromptLab workspaceId={id} />}

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
                                                <p className="text-foreground font-medium">Xóa Workspace</p>
                                                <p className="text-sm text-muted-foreground">Hành động này không thể hoàn tác. Tất cả chương và dữ liệu sẽ bị xóa.</p>
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
