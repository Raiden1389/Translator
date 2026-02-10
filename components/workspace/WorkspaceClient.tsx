"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ArrowLeft,
    Settings, FileText,
    Database, LayoutDashboard, Swords,
    BrainCircuit
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChapterList } from "@/components/workspace/chapter-list/ChapterList";
import { PromptLab } from "@/components/workspace/PromptLab";
import AISettingsTab from "./AISettingsTab";
import { ExportTab } from "./ExportTab";
import { OverviewTab } from "./OverviewTab";
import { IntelligenceHub } from "./intelligence/IntelligenceHub";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { cn } from "@/lib/utils";
import { useTranslation } from "./hooks/TranslationProvider.v2";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
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
import { ReviewDialog } from "./shared/ReviewDialog";

export default function WorkspaceClient({ id }: { id: string }) {
    const { state, actions } = useWorkspace(id);
    const { startBatchTranslate } = useTranslation();

    const {
        workspace, activeTab, progress, reviewData
    } = state;

    const {
        changeTab, handleDeleteWorkspace, handleReviewSave, setReviewData
    } = actions;

    if (workspace === undefined) return <div className="p-10 text-center text-muted-foreground">Loading...</div>;
    if (workspace === null) return notFound();

    const tabs = [
        { id: "overview", label: "Tổng Quan", icon: LayoutDashboard },
        { id: "chapters", label: "Chương", icon: FileText },
        { id: "intelligence", label: "Raiden Hub", icon: BrainCircuit },
        { id: "promptLab", label: "Prompt Lab", icon: Swords },
        { id: "settings", label: "Cài Đặt", icon: Settings },
        { id: "export", label: "Xuất File", icon: Database },
    ];

    return (
        <div className="flex h-full w-full overflow-hidden transition-colors duration-500 bg-background text-foreground">

            {/* Desktop Sidebar */}
            <aside className="w-64 border-r flex flex-col pt-10 shrink-0 h-full overflow-hidden transition-all duration-300 bg-sidebar/50 backdrop-blur-xl border-border/50">
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
                                    "w-full flex items-center gap-3 px-4 py-2.5 transition-all group relative rounded-lg",
                                    isActive
                                        ? "text-primary bg-primary/10 shadow-[inset_0_0_0_1px_hsl(from_var(--primary)_h_s_l/0.1)]"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                                )}
                            >
                                <Icon className={cn(
                                    "h-4 w-4 transition-colors",
                                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                )} />
                                <span className={cn("tracking-tight text-sm", isActive ? "font-bold" : "font-medium")}>{tab.label}</span>
                            </button>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-sidebar-border mt-auto">
                    <div className="group flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-sidebar-border/50 hover:border-primary/30 transition-all cursor-default text-sidebar-foreground">
                        <div className="w-8 h-8 rounded-xl bg-linear-to-br from-primary to-primary/60 flex items-center justify-center text-[10px] font-black text-white shadow-lg group-hover:scale-110 transition-transform">
                            AI
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black opacity-90 tracking-tight">AI Engine v3.0</span>
                        </div>
                        <div className="ml-auto">
                            <ThemeSwitcher />
                        </div>
                    </div>
                </div>
            </aside>

            {/* Content Area */}
            <div className="flex-1 min-w-0 overflow-hidden flex flex-col relative h-full transition-colors duration-500 bg-background text-foreground">
                {activeTab !== "intelligence" && (
                    <header className="h-20 flex items-center justify-between px-8 pt-4 border-b shrink-0 transition-colors duration-500 bg-background/80 backdrop-blur-md border-border">
                        <h2 className="text-sm font-bold capitalize flex items-center gap-2">
                            {tabs.find(t => t.id === activeTab)?.label}
                            <span className="text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground font-mono font-black">WS_ID: {id.slice(0, 8)}</span>
                        </h2>
                    </header>
                )}

                <div className={cn(
                    "flex-1 overflow-hidden transition-all duration-300",
                    activeTab === "intelligence" ? "p-0" : "p-8 overflow-y-auto"
                )}>
                    <div className={cn("mx-auto h-full flex flex-col", activeTab === "intelligence" ? "max-w-none" : "max-w-6xl")}>
                        <ErrorBoundary name="WorkspaceTabContent">
                            {activeTab === "overview" && <OverviewTab workspace={workspace} />}
                            {activeTab === "chapters" && <ChapterList workspaceId={id} onTranslate={startBatchTranslate} onShowScanResults={(data) => setReviewData(data)} />}
                            {activeTab === "intelligence" && (
                                <IntelligenceHub
                                    workspaceId={id}
                                    onClose={() => changeTab("chapters", { openReader: "true" })}
                                />
                            )}
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
                                                        <Button variant="destructive" size="sm" className="bg-destructive hover:bg-destructive/90">Xóa Workspace</Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="bg-card border-border text-card-foreground">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Bạn có chắc chắn?</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-muted-foreground">
                                                                Xóa vĩnh viễn dữ liệu khỏi ổ đĩa.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="bg-muted border-border hover:bg-accent text-foreground font-bold">Hủy</AlertDialogCancel>
                                                            <AlertDialogAction onClick={handleDeleteWorkspace} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground border-none font-bold">Xác nhận xóa</AlertDialogAction>
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
