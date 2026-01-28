"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ArrowLeft, BookOpen,
    Settings, Users, FileText,
    Database, LayoutDashboard, Swords, Sparkles, Zap
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChapterList } from "@/components/workspace/ChapterList";
import { DictionaryTab } from "@/components/workspace/DictionaryTab";
import { CorrectionsView } from "@/components/workspace/dictionary/tabs/CorrectionsView";
import { CharacterTab } from "@/components/workspace/CharacterTab";
import { PromptLab } from "@/components/workspace/PromptLab";
import { AISettingsTab } from "./AISettingsTab";
import { ExportTab } from "./ExportTab";
import { OverviewTab } from "./OverviewTab";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { cn } from "@/lib/utils";
import { useTranslation } from "./hooks/TranslationProvider";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useWorkspace } from "./hooks/useWorkspace";
import { ReviewDialog } from "./ReviewDialog";

export default function WorkspaceClient({ id }: { id: string }) {
    const { state, actions } = useWorkspace(id);
    const { startBatchTranslate } = useTranslation();

    const {
        workspace, activeTab, progress, isRaidenMode, reviewData
    } = state;

    const {
        changeTab, toggleRaidenMode, handleDeleteWorkspace, handleReviewSave, setReviewData
    } = actions;

    if (workspace === undefined) return <div className="p-10 text-center text-muted-foreground">Loading...</div>;
    if (workspace === null) return notFound();

    const tabs = [
        { id: "overview", label: "Tổng Quan", icon: LayoutDashboard },
        { id: "chapters", label: "Chương", icon: FileText },
        { id: "dictionary", label: "Từ Điển", icon: BookOpen },
        { id: "characters", label: "Nhân Vật", icon: Users },
        { id: "corrections", label: "Cải Chính", icon: Sparkles },
        { id: "promptLab", label: "Prompt Lab", icon: Swords },
        { id: "settings", label: "Cài Đặt", icon: Settings },
        { id: "export", label: "Xuất File", icon: Database },
    ];

    return (
        <div className={cn("flex h-full w-full overflow-hidden transition-colors duration-500",
            isRaidenMode ? "bg-[#0F172A] text-slate-300" : "bg-background text-foreground")}>

            {/* Desktop Sidebar */}
            <aside className={cn(
                "w-64 border-r flex flex-col pt-10 shrink-0 h-full overflow-hidden transition-all duration-300",
                isRaidenMode ? "bg-[#0A0F1E] border-slate-800" : "bg-sidebar border-sidebar-border"
            )}>
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
                                {progress > 0 && progress < 100 && (
                                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/40 to-transparent animate-shimmer-fast w-full" />
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
                                onClick={() => changeTab(tab.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 transition-all group relative",
                                    isActive
                                        ? (isRaidenMode ? "text-slate-100 bg-slate-400/5" : "text-indigo-700 bg-indigo-50/80")
                                        : (isRaidenMode ? "text-slate-500 hover:text-slate-300 hover:bg-slate-400/10" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50")
                                )}
                            >
                                {isActive && (
                                    <div className={cn(
                                        "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full transition-all duration-300",
                                        isRaidenMode ? "bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.6)]" : "bg-indigo-600"
                                    )} />
                                )}
                                <Icon className={cn(
                                    "h-4 w-4 transition-colors",
                                    isActive
                                        ? (isRaidenMode ? "text-purple-400" : "text-indigo-600")
                                        : (isRaidenMode ? "text-slate-600 group-hover:text-slate-400" : "text-slate-400 group-hover:text-slate-600")
                                )} />
                                <span className="font-semibold tracking-tight text-sm">{tab.label}</span>
                            </button>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-sidebar-border">
                    <div className="group flex items-center gap-3 p-4 rounded-3xl bg-linear-to-br from-muted/50 to-transparent border border-sidebar-border hover:border-primary/30 transition-all cursor-default text-sidebar-foreground">
                        <div className="w-9 h-9 rounded-2xl bg-linear-to-br from-primary to-primary/60 flex items-center justify-center text-[10px] font-black text-white shadow-xl group-hover:scale-110 transition-transform">
                            AI
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black opacity-90 tracking-tight">AI Engine v3.0</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleRaidenMode}
                            className={cn(
                                "ml-auto w-8 h-8 rounded-xl transition-all duration-300",
                                isRaidenMode
                                    ? "bg-[#bc13fe33] text-[#bc13fe] shadow-[0_0_15px_rgba(188,19,254,0.3)]"
                                    : "text-muted-foreground hover:text-[#bc13fe] hover:bg-[#bc13fe1a]"
                            )}
                            title="Toggle Raiden Mode"
                        >
                            <Zap className={cn("w-4 h-4", isRaidenMode && "fill-[#bc13fe] animate-pulse")} />
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Content Area */}
            <div className="flex-1 min-w-0 overflow-hidden flex flex-col relative h-full text-foreground bg-background">
                <header className="h-20 flex items-center justify-between px-8 pt-4 border-b border-border bg-background shrink-0">
                    <h2 className="text-sm font-bold capitalize flex items-center gap-2">
                        {tabs.find(t => t.id === activeTab)?.label}
                        <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground font-mono font-black">WS_ID: {id.slice(0, 8)}</span>
                    </h2>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-6xl mx-auto">
                        <ErrorBoundary name="WorkspaceTabContent">
                            {activeTab === "overview" && <OverviewTab workspace={workspace} />}
                            {activeTab === "chapters" && <ChapterList workspaceId={id} onTranslate={startBatchTranslate} />}
                            {activeTab === "dictionary" && <DictionaryTab workspaceId={id} />}
                            {activeTab === "characters" && <CharacterTab workspaceId={id} />}
                            {activeTab === "corrections" && <CorrectionsView workspaceId={id} />}
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
                                                    <p className="font-medium">Xóa Workspace</p>
                                                    <p className="text-sm text-muted-foreground">Hành động này không thể hoàn tác.</p>
                                                </div>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="destructive" className="bg-red-600 hover:bg-red-700">Delete Workspace</Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="bg-[#1a0b2e] border-white/10 text-white">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-white/50">
                                                                Xóa vĩnh viễn dữ liệu khỏi ổ đĩa.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-white font-bold">Hủy</AlertDialogCancel>
                                                            <AlertDialogAction onClick={handleDeleteWorkspace} className="bg-red-600 hover:bg-red-700 text-white border-none font-bold">Xác nhận xóa</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                            {activeTab === "export" && <ExportTab workspaceId={id} />}
                        </ErrorBoundary>
                    </div>
                </div>
            </div>

            <ReviewDialog
                open={!!reviewData}
                onOpenChange={(v) => !v && setReviewData(null)}
                characters={reviewData?.chars || []}
                terms={reviewData?.terms || []}
                onSave={handleReviewSave}
            />
        </div >
    );
}
