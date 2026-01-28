"use client";

import React, { useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import {
    Upload, BookOpen, Zap, Users,
    FileText, Database, Sparkles, Loader2, Image as ImageIcon
} from "lucide-react";
import { useRaiden } from "@/components/theme/RaidenProvider";
import { useOverview } from "./hooks/useOverview";
import { Workspace } from "@/lib/db";

export const OverviewTab = ({ workspace }: { workspace: Workspace }) => {
    const { isRaidenMode } = useRaiden();
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
                    <Card className={cn(
                        "overflow-hidden relative transition-all",
                        isRaidenMode ? "bg-[#1E293B] border-transparent shadow-2xl" : "bg-white border-slate-200 shadow-sm hover:shadow-md"
                    )}>
                        <CardHeader className="pb-2">
                            <CardTitle className={cn("text-base flex items-center gap-2", isRaidenMode ? "text-slate-200" : "text-foreground")}>
                                <Zap className={cn("w-4 h-4", isRaidenMode ? "text-purple-400" : "text-primary")} /> Thống Kê
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className={cn("flex justify-between items-center text-sm p-3 rounded-xl", isRaidenMode ? "bg-slate-900/40" : "bg-slate-50 border border-slate-100")}>
                                <span className={isRaidenMode ? "text-slate-400" : "text-slate-600 font-medium"}>Tổng số chương</span>
                                <span className={cn("font-bold font-mono text-xl", isRaidenMode ? "text-slate-100" : "text-slate-900")}>{stats.totalChapters.toLocaleString()}</span>
                            </div>
                            <div className={cn("flex justify-between items-center text-sm p-3 rounded-xl", isRaidenMode ? "bg-slate-900/40" : "bg-slate-50 border border-slate-100")}>
                                <span className={isRaidenMode ? "text-slate-400" : "text-slate-600 font-medium"}>Đã dịch</span>
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
                            <div className="pt-2 border-t border-border mt-2 space-y-3">
                                <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Chi Phí API (Tạm tính)</div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center bg-muted/30 p-2 rounded-lg border border-border/50">
                                        <div className="text-xs text-muted-foreground font-medium">Tổng Token</div>
                                        <div className="text-foreground font-bold font-mono text-sm">{((stats.totalInputTokens + stats.totalOutputTokens) / 1000).toFixed(1)}K</div>
                                    </div>
                                    <div className={cn("flex justify-between items-center p-3 rounded-xl", isRaidenMode ? "bg-purple-500/10 border border-purple-500/20" : "bg-indigo-50/50 border border-indigo-100")}>
                                        <div className={cn("text-xs font-bold uppercase tracking-tight", isRaidenMode ? "text-purple-400" : "text-indigo-600")}>Chi phí dự kiến</div>
                                        <div className="text-right">
                                            <div className={cn("font-black font-mono text-2xl leading-tight", isRaidenMode ? "text-purple-300" : "text-indigo-700")}>${stats.totalCostUSD.toFixed(3)}</div>
                                            <div className="text-[10px] font-bold text-slate-500">~{Math.round(stats.totalCostVND).toLocaleString()} VNĐ</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={cn("overflow-hidden transition-all", isRaidenMode ? "bg-[#1E293B] border-transparent shadow-2xl" : "bg-white border-slate-200 shadow-sm")}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-foreground text-base flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-primary" /> Thông Tin
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2 group">
                                <label className={cn("text-[10px] uppercase font-bold tracking-widest flex items-center gap-2 transition-colors", isRaidenMode ? "text-slate-500 group-focus-within:text-purple-400" : "text-muted-foreground group-focus-within:text-primary")}>
                                    <Users className="w-3 h-3" /> Tác Giả
                                </label>
                                <input
                                    className={cn("bg-transparent font-bold text-lg w-full border-b focus:ring-0 focus:outline-none placeholder:text-muted-foreground/20 py-2 transition-all", isRaidenMode ? "text-slate-100 border-slate-700 focus:border-purple-500" : "text-foreground border-border focus:border-primary")}
                                    defaultValue={workspace.author?.normalize('NFC')}
                                    placeholder="Chưa rõ tác giả"
                                    onBlur={(e) => handleUpdateField('author', e.target.value.normalize('NFC'))}
                                />
                            </div>
                            <div className="space-y-2 group">
                                <label className={cn("text-[10px] uppercase font-bold tracking-widest flex items-center gap-2 transition-colors", isRaidenMode ? "text-slate-500 group-focus-within:text-purple-400" : "text-muted-foreground group-focus-within:text-primary")}>
                                    <Database className="w-3 h-3" /> Thể Loại
                                </label>
                                <AutoResizeTextarea
                                    className={cn("bg-transparent text-base w-full border-b focus:ring-0 focus:outline-none placeholder:text-muted-foreground/20 py-2 transition-all min-h-[40px] resize-none", isRaidenMode ? "text-slate-200 border-slate-700 focus:border-purple-500" : "text-foreground border-border focus:border-primary")}
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
                        className={cn("shadow-md h-64 flex items-center justify-center relative overflow-hidden group transition-all duration-300", isDragging ? 'border-primary border-2 bg-primary/5' : '', isRaidenMode ? "bg-slate-900 border-transparent shadow-2xl" : "bg-white border-border shadow-md")}
                        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                    >
                        {workspace.cover ? (
                            <div className="absolute inset-0 w-full h-full">
                                <div className="absolute inset-0 bg-cover bg-center blur-2xl opacity-30 scale-110 transition-transform duration-700 group-hover:scale-125" style={{ backgroundImage: `url(${workspace.cover})` }} />
                                <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent opacity-80" />
                                <div className="absolute inset-0 flex items-center justify-center p-6">
                                    <img src={workspace.cover} alt="Cover" className="h-full w-auto object-contain rounded-lg shadow-xl z-10 transition-transform duration-500 group-hover:scale-[1.02]" />
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
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleProcessFile(e.target.files[0])} />
                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-40">
                            <Button variant="secondary" size="sm" className="bg-background/80 text-foreground hover:bg-background border border-border shadow-md" onClick={() => fileInputRef.current?.click()} >
                                <Upload className="h-4 w-4 mr-2" /> {workspace.cover ? "Đổi ảnh" : "Tải ảnh"}
                            </Button>
                        </div>
                    </Card>

                    <Card className={cn("flex-1 flex flex-col overflow-hidden transition-all", isRaidenMode ? "bg-[#1E293B] border-transparent shadow-2xl" : "bg-white border-slate-200 shadow-sm")}>
                        <CardHeader className="pb-2">
                            <CardTitle className={cn("text-base flex items-center justify-between", isRaidenMode ? "text-slate-200" : "text-foreground")}>
                                <div className="flex items-center gap-2">
                                    <FileText className={cn("w-4 h-4", isRaidenMode ? "text-purple-400" : "text-primary")} /> Mô Tả / Tóm Tắt
                                    {workspace.isAiDescription && (
                                        <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter shadow-sm", isRaidenMode ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600")}>
                                            <Sparkles className="w-2.5 h-2.5" /> AI Generated
                                        </div>
                                    )}
                                </div>
                                <Button variant="ghost" size="sm" className={cn("h-7 px-2 transition-all duration-300 rounded-lg group/wand", isRaidenMode ? "text-slate-500 hover:text-purple-400 hover:bg-purple-500/10" : "text-muted-foreground hover:text-primary hover:bg-primary/5", isGeneratingSummary && "animate-pulse")} onClick={handleAutoSummary} disabled={isGeneratingSummary} >
                                    {isGeneratingSummary ? <Loader2 className={cn("w-3.5 h-3.5 animate-spin", isRaidenMode ? "text-purple-400" : "text-primary")} /> : <Sparkles className="w-3.5 h-3.5 group-hover/wand:scale-110 transition-transform" />}
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <AutoResizeTextarea
                                className={cn("transition-colors", isRaidenMode ? "text-slate-300" : "text-foreground")}
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
