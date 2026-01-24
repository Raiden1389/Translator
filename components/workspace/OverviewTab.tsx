import React, { useState, useRef, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { generateBookSummary } from "@/lib/gemini";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import {
    Upload, BookOpen, Zap, Users,
    FileText, Database, Sparkles, Loader2
} from "lucide-react";

export const OverviewTab = ({ workspace }: { workspace: any }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
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
                toast.info("Cần ít nhất một chương để tóm tắt.");
                return;
            }

            const modelSetting = await db.settings.get("aiModel");
            const aiModel = (modelSetting?.value as string) || "gemini-2.0-flash-exp";

            const summary = await generateBookSummary(contextText, aiModel);

            await db.workspaces.update(workspace.id, {
                description: summary,
                isAiDescription: true,
                updatedAt: new Date()
            });

        } catch (err) {
            console.error("Failed to generate summary", err);
            toast.error("Lỗi khi tạo tóm tắt.");
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    const processFile = (file: File) => {
        // Limit size? 5MB initial check
        if (file.size > 10 * 1024 * 1024) {
            toast.warning("Ảnh quá lớn (< 10MB)");
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
                        toast.error("Lỗi khi lưu ảnh bìa");
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

    // Stats - Combined query to reduce re-renders (5 queries → 1)
    const stats = useLiveQuery(async () => {
        const [total, translated, terms, chars, usage] = await Promise.all([
            db.chapters.where("workspaceId").equals(workspace.id).count(),
            db.chapters.where("workspaceId").equals(workspace.id).filter(c => c.status === 'translated').count(),
            db.dictionary.where("workspaceId").equals(workspace.id).filter(d => d.type !== 'name').count(),
            db.dictionary.where("workspaceId").equals(workspace.id).filter(d => d.type === 'name').count(),
            db.apiUsage.toArray()
        ]);

        const totalInputTokens = usage.reduce((acc, curr) => acc + (curr.inputTokens || 0), 0);
        const totalOutputTokens = usage.reduce((acc, curr) => acc + (curr.outputTokens || 0), 0);
        const totalCostUSD = usage.reduce((acc, curr) => acc + (curr.totalCost || 0), 0);

        return {
            totalChapters: total,
            translatedChapters: translated,
            termCount: terms,
            charCount: chars,
            totalInputTokens,
            totalOutputTokens,
            totalCostUSD,
            totalCostVND: totalCostUSD * 25400
        };
    }, [workspace.id]) || {
        totalChapters: 0,
        translatedChapters: 0,
        termCount: 0,
        charCount: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCostUSD: 0,
        totalCostVND: 0
    };

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
                                <span className="text-foreground font-bold font-mono text-lg">{stats.totalChapters.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm p-3 rounded-lg bg-background border border-border hover:border-primary/20 transition-colors">
                                <span className="text-muted-foreground">Đã dịch</span>
                                <span className="text-emerald-600 font-bold font-mono text-lg">{stats.translatedChapters.toLocaleString()}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-lg bg-background border border-border text-center">
                                    <div className="text-xs text-muted-foreground mb-1">Thuật ngữ</div>
                                    <div className="text-foreground font-bold">{stats.termCount.toLocaleString()}</div>
                                </div>
                                <div className="p-3 rounded-lg bg-background border border-border text-center">
                                    <div className="text-xs text-muted-foreground mb-1">Nhân vật</div>
                                    <div className="text-foreground font-bold">{stats.charCount.toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-border mt-2 space-y-3">
                                <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Chi Phí API (Tạm tính)</div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center bg-muted/30 p-2 rounded-lg border border-border/50">
                                        <div className="text-xs text-muted-foreground font-medium">Tổng Token</div>
                                        <div className="text-foreground font-bold font-mono text-sm">
                                            {((stats.totalInputTokens + stats.totalOutputTokens) / 1000).toFixed(1)}K
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center bg-primary/5 p-2 rounded-lg border border-primary/10">
                                        <div className="text-xs text-primary/70 font-bold uppercase tracking-tight">Thanh toán</div>
                                        <div className="text-right">
                                            <div className="text-primary font-black font-mono text-lg leading-tight">${stats.totalCostUSD.toFixed(3)}</div>
                                            <div className="text-[10px] text-primary/40 font-bold">~{Math.round(stats.totalCostVND).toLocaleString()} VNĐ</div>
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
                                <AutoResizeTextarea
                                    className="bg-transparent text-foreground text-base w-full border-b border-border focus:border-primary focus:ring-0 focus:outline-none placeholder:text-muted-foreground/20 py-2 transition-all min-h-[40px] resize-none"
                                    defaultValue={workspace.genre?.normalize('NFC')}
                                    placeholder="Chưa phân loại"
                                    onSave={(val) => {
                                        const normalized = val.normalize('NFC');
                                        if (normalized !== workspace.genre) {
                                            db.workspaces.update(workspace.id, { genre: normalized });
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
                            <div className="absolute inset-0 flex items-center justify-center bg-primary/30 z-30 border-2 border-primary border-dashed m-2 rounded-xl">
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
