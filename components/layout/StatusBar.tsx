"use client";

import React from "react";
import { Cpu, Database, Activity, Layout } from "lucide-react";
import packageJson from "@/package.json";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { toast } from "sonner";

export function StatusBar() {
    // 1. Fetch AI Engine from settings
    const aiModelSetting = useLiveQuery(() => db.settings.get("aiModel"));
    const currentModel = (aiModelSetting?.value as string) || "Gemini 2.0 Flash";

    // 2. Fetch Global Stats
    const totalChapters = useLiveQuery(() => db.chapters.count()) || 0;
    const totalWorkspaces = useLiveQuery(() => db.workspaces.count()) || 0;

    // 3. Storage Usage Tracking
    const [storageUsage, setStorageUsage] = React.useState<string>("0 B");

    React.useEffect(() => {
        const updateStorage = async () => {
            if (navigator.storage && navigator.storage.estimate) {
                const { usage } = await navigator.storage.estimate();
                if (usage !== undefined) {
                    if (usage > 1024 * 1024) {
                        setStorageUsage(`${(usage / (1024 * 1024)).toFixed(1)} MB`);
                    } else if (usage > 1024) {
                        setStorageUsage(`${(usage / 1024).toFixed(0)} KB`);
                    } else {
                        setStorageUsage(`${usage} B`);
                    }
                }
            }
        };
        updateStorage();
        const interval = setInterval(updateStorage, 10000); // 10s
        return () => clearInterval(interval);
    }, []);

    return (
        <footer className="h-7 w-full bg-sidebar border-t border-sidebar-border flex items-center justify-between px-4 select-none shrink-0 text-[10px] text-sidebar-foreground/40 font-mono">
            {/* LEFT: Engine & Version */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 group cursor-default">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">v</span>
                    <span className="font-bold text-sidebar-foreground/60">{packageJson.version}</span>
                </div>

                <div className="h-3 w-px bg-sidebar-border/50" />

                <div className="flex items-center gap-1.5 text-primary/60 hover:text-primary transition-colors cursor-default">
                    <Cpu className="w-3 h-3" />
                    <span className="font-black uppercase tracking-tighter">{currentModel}</span>
                </div>
            </div>

            {/* MIDDLE: Global Progress / Placeholder for active tasks */}
            <div className="hidden md:flex items-center gap-2 px-3 py-0.5 rounded-full bg-muted/20 border border-border/5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="font-black uppercase tracking-widest text-[8px] opacity-60">Neural Pulse Active</span>
            </div>

            {/* RIGHT: Stats & Status */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 hover:text-sidebar-foreground/60 transition-colors cursor-default">
                    <Layout className="w-3 h-3 opacity-50" />
                    <span>{totalWorkspaces} WS</span>
                </div>

                <div className="h-3 w-px bg-sidebar-border/50" />

                <div className="flex items-center gap-1.5 hover:text-sidebar-foreground/60 transition-colors cursor-default">
                    <Database className="w-3 h-3 opacity-50" />
                    <span>{totalChapters.toLocaleString()} Chaps</span>
                </div>

                <div className="h-3 w-px bg-sidebar-border/50" />

                <button
                    onClick={async () => {
                        const toastId = "manual-save";
                        toast.loading("Đang lưu vào ổ đĩa...", { id: toastId });
                        try {
                            const { manualSaveAllWorkspaces } = await import("@/lib/db");
                            const result = await manualSaveAllWorkspaces();

                            if (result.errors.length > 0) {
                                console.error("Save errors:", result.errors);
                                toast.error(`Lưu một phần: ${result.saved} items. Có ${result.errors.length} lỗi.`, { id: toastId });
                            } else if (result.saved === 0) {
                                toast.success("Không có gì cần lưu!", { id: toastId });
                            } else {
                                toast.success(`Đã lưu ${result.saved} items vào ổ đĩa!`, { id: toastId });
                            }

                            // Open folder after save
                            toast.loading("Đang mở thư mục dữ liệu...", { id: toastId });
                            const { appDataDir } = await import("@tauri-apps/api/path");
                            const { invoke } = await import("@tauri-apps/api/core");
                            const baseDir = await appDataDir();
                            await invoke("open_folder", { path: baseDir });
                            toast.success("Đã mở thư mục!", { id: toastId });
                        } catch (err: unknown) {
                            const msg = err instanceof Error ? err.message : String(err);
                            console.error("Manual save failed:", err);
                            toast.error(`Lỗi: ${msg || "Không thể truy cập"}`, { id: toastId });
                        }
                    }}
                    className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer group"
                >
                    <Activity className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <span>{storageUsage} DATA</span>
                </button>

                <div className="h-3 w-px bg-sidebar-border/50" />

                <div className="flex items-center gap-1.5 group cursor-default">
                    <span className="font-black text-emerald-600/60 group-hover:text-emerald-500 transition-colors">IO_READY</span>
                </div>
            </div>
        </footer>
    );
}
