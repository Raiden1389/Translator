"use client";

import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { ReviewData, GlossaryCharacter, GlossaryTerm } from "@/lib/types"; // Import types
import { ReviewDialog } from "./ReviewDialog"; // Import ReviewDialog
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ArrowLeft, BookOpen,
    Settings, Users, FileText,
    Database, LayoutDashboard, Swords, Sparkles, Zap
} from "lucide-react";
import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
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
import { toast } from "sonner";
import { storage } from "@/lib/storageBridge";
import { useBatchTranslate } from "./hooks/useBatchTranslate";
import { TranslationProgressOverlay } from "./TranslationProgressOverlay";
import { useRaiden } from "@/components/theme/RaidenProvider";
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
import { useRouter } from "next/navigation";



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

    const router = useRouter();
    const activeTab = activeTabParam || "overview";

    // Scan Results State (Lifted from ChapterList)
    const [reviewData, setReviewData] = useState<ReviewData | null>(null);

    // Batch Translate State (Lifted from ChapterList)
    const { isTranslating, batchProgress, handleBatchTranslate } = useBatchTranslate();
    const { isRaidenMode, toggleRaidenMode } = useRaiden();

    const handleReviewSave = async (saveChars: GlossaryCharacter[], saveTerms: GlossaryTerm[], blacklistChars: GlossaryCharacter[], blacklistTerms: GlossaryTerm[]) => {
        // Save to Dictionary
        const allSave = [...saveChars, ...saveTerms].map(item => ({ ...item, workspaceId: id, createdAt: new Date() }));
        if (allSave.length > 0) {
            await db.dictionary.bulkAdd(allSave);
        }

        // Save to Blacklist
        const allBlacklist = [...blacklistChars, ...blacklistTerms];
        for (const item of allBlacklist) {
            // Check existing before adding to avoid key constraint errors
            const existing = await db.blacklist.where({ word: item.original, workspaceId: id }).first();
            if (!existing) {
                await db.blacklist.add({
                    workspaceId: id,
                    word: item.original,
                    translated: item.translated,
                    source: 'manual',
                    createdAt: new Date()
                });
            }
        }

        toast.success(`Đã lưu: ${allSave.length} từ vào từ điển, ${allBlacklist.length} từ vào blacklist.`, { duration: 10000 });
        setReviewData(null);
    };

    const handleDeleteWorkspace = async () => {
        try {
            // Transactional Integrity: Ensure all DB operations succeed together
            await db.transaction('rw', [db.chapters, db.dictionary, db.blacklist, db.corrections, db.workspaces, db.history], async () => {
                await Promise.all([
                    db.chapters.where("workspaceId").equals(id).delete(),
                    db.dictionary.where("workspaceId").equals(id).delete(),
                    db.blacklist.where("workspaceId").equals(id).delete(),
                    db.corrections.where("workspaceId").equals(id).delete(),
                    db.history.where("workspaceId").equals(id).delete()
                ]);

                // Delete workspace itself last in the same transaction
                await db.workspaces.delete(id);
            });

            // External Storage (Filesystem) - Run after successful DB transaction
            await storage.deleteWorkspace(id);

            toast.success("Đã xóa Workspace thành công!");
            router.push("/");
        } catch (err) {
            console.error("Failed to delete workspace:", err);
            toast.error("Lỗi khi xóa Workspace.");
        }
    };

    // Auto-cleanup hook for session history when unmounting or leaving
    useEffect(() => {
        return () => {
            db.history.where("workspaceId").equals(id).delete().catch(e => console.error("Failed to clear history", e));
        };
    }, [id]);

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
        <div className="flex h-full w-full bg-background text-foreground overflow-hidden">
            {/* Desktop Sidebar */}
            <aside className={cn(
                "w-64 border-r bg-sidebar flex flex-col pt-10 shrink-0 h-full overflow-hidden transition-all duration-300",
                isRaidenMode ? "bg-[#000000] border-[#bc13fe33]" : "border-sidebar-border"
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
                                onClick={() => {
                                    const params = new URLSearchParams(searchParams.toString());
                                    params.set("tab", tab.id);
                                    router.push(`?${params.toString()}`, { scroll: false });
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all group relative",
                                    isActive
                                        ? (isRaidenMode ? "text-[#bc13fe]" : "text-primary")
                                        : (isRaidenMode ? "text-[#a0a0a0] hover:text-white hover:bg-[#1a0b2e]" : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent")
                                )}
                            >
                                {isActive && (
                                    <div className={cn(
                                        "absolute inset-0 border rounded-2xl shadow-sm",
                                        isRaidenMode ? "bg-[#bc13fe0d] border-[#bc13fe33]" : "bg-primary/5 border-primary/20"
                                    )} />
                                )}
                                <div className={cn(
                                    "p-1.5 rounded-xl transition-all relative z-10",
                                    isActive
                                        ? (isRaidenMode ? "bg-[#bc13fe] text-white shadow-[0_0_10px_#bc13fe66]" : "bg-primary text-primary-foreground shadow-md")
                                        : (isRaidenMode ? "bg-[#1a0b2e] text-[#a0a0a0] group-hover:bg-[#bc13fe1a] group-hover:text-white" : "bg-muted text-muted-foreground group-hover:bg-muted/80 group-hover:text-foreground")
                                )}>
                                    <Icon className="h-3.5 w-3.5" />
                                </div>
                                <span className={cn("relative z-10", isActive && isRaidenMode && "text-[#bc13fe]")}>{tab.label}</span>
                                {isActive && (
                                    <div className={cn(
                                        "ml-auto w-1 h-4 rounded-full relative z-10",
                                        isRaidenMode ? "bg-[#bc13fe] shadow-[0_0_8px_#bc13fe]" : "bg-primary"
                                    )} />
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
                        <ErrorBoundary name="WorkspaceTabContent">
                            {activeTab === "overview" && <OverviewTab workspace={workspace} />}
                            {activeTab === "chapters" && <ChapterList workspaceId={id} onShowScanResults={setReviewData} onTranslate={handleBatchTranslate} />}
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
                                                    <p className="text-foreground font-medium">Xóa Workspace</p>
                                                    <p className="text-sm text-muted-foreground">Hành động này không thể hoàn tác. Tất cả chương và dữ liệu sẽ bị xóa.</p>
                                                </div>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="destructive" className="bg-red-600 hover:bg-red-700">Delete Workspace</Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="bg-[#1a0b2e] border-white/10 text-white">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Bạn có tuyệt đối chắc chắn?</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-white/50">
                                                                Hành động này không thể hoàn tác. Toàn bộ dữ liệu của Workspace này bao gồm các chương, từ điển và lịch sử dịch sẽ bị xóa vĩnh viễn khỏi ổ đĩa.
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

            <TranslationProgressOverlay isTranslating={isTranslating} progress={batchProgress} />
        </div >
    );
}
