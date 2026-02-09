"use client";

import React, { useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import {
    Upload, BookOpen, Zap, Users,
    FileText, Database, Sparkles, Loader2,
    Search, Link as LinkIcon
} from "lucide-react";
import { useOverview } from "./hooks/useOverview";
import { Workspace } from "@/lib/db";

export const OverviewTab = ({ workspace }: { workspace: Workspace }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { state, actions } = useOverview(workspace);

    const { stats, isDragging, isGeneratingSummary } = state;
    const { setIsDragging, handleProcessFile, handleAutoSummary, handleUpdateField } = actions;

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
            handleProcessFile(file);
        }
    };

    return (
        <div className="max-w-[1800px] mx-auto px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Left Column: Stats & Info */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="overflow-hidden relative transition-all bg-card border-border shadow-sm hover:shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2 text-foreground">
                                <Zap className="w-4 h-4 text-primary" /> Thống Kê
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center text-sm p-3 rounded-xl bg-muted/30 border border-border/50">
                                <span className="text-muted-foreground font-medium">Tổng số chương</span>
                                <span className="font-bold font-mono text-xl text-foreground">{stats.totalChapters.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm p-3 rounded-xl bg-muted/30 border border-border/50">
                                <span className="text-muted-foreground font-medium">Đã dịch</span>
                                <span className="text-emerald-500 font-bold font-mono text-xl">{stats.translatedChapters.toLocaleString()}</span>
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
                            <div className="pt-2 border-t border-border mt-2">
                                <Tooltip>
                                    <TooltipTrigger className="w-full">
                                        <div className="flex justify-between items-center p-3 rounded-lg cursor-help transition-all hover:bg-muted/50 bg-background border border-border">
                                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Translation Cost</div>
                                            <div className="text-right">
                                                <div className="font-bold font-mono text-lg leading-tight text-foreground">${stats.totalCostUSD.toFixed(2)}</div>
                                                <div className="text-[10px] font-medium text-muted-foreground">{stats.translatedChapters} chapters</div>
                                            </div>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-xs">
                                        <div className="space-y-1">
                                            <div className="font-bold">Cost Breakdown</div>
                                            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                                                <div className="text-muted-foreground">Chapters:</div>
                                                <div className="font-mono">{stats.translatedChapters}</div>

                                                <div className="text-muted-foreground">Total tokens:</div>
                                                <div className="font-mono">{((stats.totalInputTokens + stats.totalOutputTokens) / 1000).toFixed(1)}K</div>

                                                <div className="text-muted-foreground">Avg/chapter:</div>
                                                <div className="font-mono">${(stats.totalCostUSD / Math.max(stats.translatedChapters, 1)).toFixed(4)}</div>
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden transition-all bg-card border-border shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-foreground text-base flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-primary" /> Thông Tin
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2 group">
                                <label className="text-[10px] uppercase font-bold tracking-widest flex items-center gap-2 transition-colors text-muted-foreground group-focus-within:text-primary">
                                    <Users className="w-3 h-3" /> Tác Giả
                                </label>
                                <input
                                    className="bg-transparent font-bold text-lg w-full border-b focus:ring-0 focus:outline-none placeholder:text-muted-foreground/20 py-2 transition-all text-foreground border-border focus:border-primary"
                                    defaultValue={workspace.author?.normalize('NFC')}
                                    placeholder="Chưa rõ tác giả"
                                    onBlur={(e) => handleUpdateField('author', e.target.value.normalize('NFC'))}
                                />
                            </div>
                            <div className="space-y-2 group">
                                <label className="text-[10px] uppercase font-bold tracking-widest flex items-center gap-2 transition-colors text-muted-foreground group-focus-within:text-primary">
                                    <Database className="w-3 h-3" /> Thể Loại
                                </label>
                                <AutoResizeTextarea
                                    className="bg-transparent text-base w-full border-b focus:ring-0 focus:outline-none placeholder:text-muted-foreground/20 py-2 transition-all min-h-[40px] resize-none text-foreground border-border focus:border-primary"
                                    defaultValue={workspace.genre?.normalize('NFC') || ""}
                                    placeholder="Chưa phân loại"
                                    onSave={(val) => handleUpdateField('genre', val.normalize('NFC'))}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Cover & Description */}
                <div className="lg:col-span-2 space-y-6 flex flex-col h-full">
                    <Card
                        className={cn("h-64 flex items-center justify-center relative overflow-hidden group transition-all duration-300 bg-card border-border shadow-md", isDragging && 'border-primary border-2 bg-primary/5')}
                        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                                navigator.clipboard.readText().then(text => {
                                    if (text.startsWith('http')) handleUpdateField('cover', text);
                                }).catch(() => { });
                            }
                        }}
                    >
                        {workspace.cover ? (
                            <div className="absolute inset-0 w-full h-full">
                                <img
                                    src={workspace.cover}
                                    alt=""
                                    referrerPolicy="no-referrer"
                                    className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-30 scale-110 transition-transform duration-700 group-hover:scale-125"
                                />
                                <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent opacity-80" />
                                <div className="absolute inset-0 flex items-center justify-center p-6">
                                    <img src={workspace.cover} alt="Cover" referrerPolicy="no-referrer" loading="lazy" className="h-full w-auto object-contain rounded-lg shadow-xl z-10 transition-transform duration-500 group-hover:scale-[1.02]" />
                                </div>
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/20 group-hover:bg-muted/40 transition-colors gap-4">
                                <div className="p-4 rounded-full bg-background border border-border group-hover:scale-110 transition-transform duration-300">
                                    <Upload className="h-8 w-8 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                                </div>
                                <p className="text-muted-foreground/40 text-sm font-medium">Kéo thả hoặc tải ảnh bìa</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-[10px] gap-1.5 bg-background/50 border-dashed hover:bg-background hover:text-primary transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const query = `${workspace.title} ${workspace.author || ""} novel cover`;
                                            window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`, '_blank');
                                        }}
                                    >
                                        <Search className="w-3 h-3" /> Tìm ảnh
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-[10px] gap-1.5 bg-background/50 border-dashed hover:bg-background hover:text-primary transition-colors"
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                                const text = await navigator.clipboard.readText();
                                                if (text && text.startsWith('http')) {
                                                    handleUpdateField('cover', text);
                                                } else {
                                                    alert("Clipboard không chứa link hợp lệ! Hãy thử copy link ảnh rồi dán lại.");
                                                }
                                            } catch (err) {
                                                console.error("Clipboard read failed:", err);
                                                const manualPaste = prompt("Trình duyệt chặn đọc clipboard tự động. Vui lòng dán link ảnh vào đây:");
                                                if (manualPaste && manualPaste.startsWith('http')) {
                                                    handleUpdateField('cover', manualPaste);
                                                }
                                            }
                                        }}
                                    >
                                        <LinkIcon className="w-3 h-3" /> Dán Link
                                    </Button>
                                </div>
                            </div>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleProcessFile(e.target.files[0])} />
                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-40 flex flex-col gap-2">
                            {workspace.cover && (
                                <div className="flex gap-2">
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="h-8 w-8 bg-background/80 text-foreground hover:bg-background border border-border shadow-md rounded-full"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const query = `${workspace.title} ${workspace.author || ""} novel cover`;
                                            window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`, '_blank');
                                        }}
                                        title="Tìm ảnh khác trên Google"
                                    >
                                        <Search className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="h-8 w-8 bg-background/80 text-foreground hover:bg-background border border-border shadow-md rounded-full"
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                                const text = await navigator.clipboard.readText();
                                                if (text && text.startsWith('http')) {
                                                    handleUpdateField('cover', text);
                                                } else {
                                                    alert("Clipboard không chứa link hợp lệ! Hãy thử copy link ảnh rồi dán lại.");
                                                }
                                            } catch (err) {
                                                console.error("Clipboard read failed:", err);
                                                // Fallback: Ask user to paste manually
                                                const manualPaste = prompt("Trình duyệt chặn đọc clipboard tự động. Vui lòng dán link ảnh vào đây:");
                                                if (manualPaste && manualPaste.startsWith('http')) {
                                                    handleUpdateField('cover', manualPaste);
                                                }
                                            }
                                        }}
                                        title="Dán link ảnh mới"
                                    >
                                        <LinkIcon className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}

                            <Button variant="secondary" size="sm" className="bg-background/80 text-foreground hover:bg-background border border-border shadow-md" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} >
                                <Upload className="h-4 w-4 mr-2" /> {workspace.cover ? "Đổi ảnh" : "Tải ảnh"}
                            </Button>
                        </div>
                    </Card>

                    <Card className="flex-1 flex flex-col overflow-hidden transition-all bg-card border-border shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center justify-between text-foreground">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-primary" /> Mô Tả / Tóm Tắt
                                    {workspace.isAiDescription && (
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter shadow-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                            <Sparkles className="w-2.5 h-2.5" /> AI Generated
                                        </div>
                                    )}
                                </div>
                                <Button variant="ghost" size="sm" className={cn("h-7 px-2 transition-all duration-300 rounded-lg group/wand text-muted-foreground hover:text-primary hover:bg-primary/5", isGeneratingSummary && "animate-pulse")} onClick={handleAutoSummary} disabled={isGeneratingSummary} >
                                    {isGeneratingSummary ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <Sparkles className="w-3.5 h-3.5 group-hover/wand:scale-110 transition-transform" />}
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <AutoResizeTextarea
                                className="transition-colors text-foreground"
                                defaultValue={workspace.description || ""}
                                placeholder="Nhập mô tả hoặc tóm tắt truyện tại đây..."
                                onSave={(val) => handleUpdateField('description', val)}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
