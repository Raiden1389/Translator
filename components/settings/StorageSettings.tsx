"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, HardDrive, AlertTriangle, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { appDataDir } from "@tauri-apps/api/path";
import { cn } from "@/lib/utils";

export function StorageSettings() {
    const [currentPath, setCurrentPath] = useState<string>("");
    const [isMoving, setIsMoving] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => { loadCurrentPath(); }, []);

    const loadCurrentPath = async () => {
        try {
            const path = await appDataDir();
            setCurrentPath(path);
        } catch (e) {
            console.error("Failed to get app data dir:", e);
        }
    };

    const handleChangeLocation = async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
                title: "Chọn thư mục lưu dữ liệu mới"
            });

            if (!selected || typeof selected !== 'string') return;

            const confirm = window.confirm(
                `Bạn muốn chuyển dữ liệu sang:\n${selected}\n\n` +
                `⚠️ Lưu ý:\n` +
                `- App sẽ copy toàn bộ data sang thư mục mới\n` +
                `- Cần quyền Administrator trên Windows\n` +
                `- Quá trình có thể mất vài phút\n\n` +
                `Tiếp tục?`
            );

            if (!confirm) return;

            setIsMoving(true);
            const toastId = "storage-move";
            toast.loading("Đang di chuyển dữ liệu...", { id: toastId });

            try {
                const result = await invoke<string>("create_storage_symlink", {
                    newPath: selected
                });

                toast.success(result, { id: toastId, duration: 5000 });
                setCurrentPath(selected);

                const restart = window.confirm(
                    "Di chuyển thành công!\n\n" +
                    "Bạn cần khởi động lại app để áp dụng thay đổi.\n" +
                    "Khởi động lại ngay?"
                );

                if (restart) window.location.reload();
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                if (msg.includes("Administrator")) {
                    toast.error("Cần quyền Administrator! Thử lại bằng cách Run as Administrator.", { id: toastId, duration: 10000 });
                } else {
                    toast.error(`Lỗi: ${msg}`, { id: toastId });
                }
            } finally {
                setIsMoving(false);
            }
        } catch (err) {
            console.error("Failed to change storage location:", err);
            toast.error("Không thể mở hộp thoại chọn thư mục");
        }
    };

    const handleOpenCurrent = async () => {
        try {
            await invoke("open_folder", { path: currentPath });
        } catch (err) {
            console.error("Failed to open folder:", err);
            toast.error("Không thể mở thư mục");
        }
    };

    return (
        <div className="bg-transparent">
            {/* Header: Click to Toggle */}
            <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer group hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-all"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-sm">
                        <HardDrive className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-[13px] font-semibold text-foreground leading-none">Vị trí lưu trữ</h3>
                        <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">Quản lý nơi lưu trữ dữ liệu của app</p>
                    </div>
                </div>
                <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-300", isOpen ? "rotate-180" : "")} />
            </div>

            {isOpen && (
                <div className="px-4 pb-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 border-t border-black/[0.05] dark:border-white/[0.05] pt-4 bg-black/[0.01] dark:bg-white/[0.01]">
                    {/* Current Location */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1.5 flex-1">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 ml-0.5">Thư mục hiện tại</label>
                            <div className="px-3 py-2 bg-white/50 dark:bg-black/20 border border-black/[0.08] dark:border-white/[0.08] rounded-lg text-[11px] font-mono truncate text-foreground/70 lowercase">
                                {currentPath || "Đang tải..."}
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleOpenCurrent}
                            disabled={!currentPath}
                            className="h-8 px-4 rounded-md border-black/[0.1] dark:border-white/[0.1] bg-white dark:bg-black/20 text-[12px] mt-4"
                        >
                            <FolderOpen className="w-3.5 h-3.5 mr-2 opacity-60" />
                            Mở
                        </Button>
                    </div>

                    {/* Change Action Row */}
                    <div className="flex items-center justify-between py-3 border-t border-black/[0.03] dark:border-white/[0.03]">
                        <div className="flex-1">
                            <p className="text-[12px] font-semibold text-foreground">Di chuyển dữ liệu</p>
                            <p className="text-[11px] text-muted-foreground">Copy database và file sang ổ đĩa khác</p>
                        </div>
                        <Button
                            onClick={handleChangeLocation}
                            disabled={isMoving || !currentPath}
                            className="bg-[#007AFF] hover:bg-[#007AFF]/90 text-white shadow-sm rounded-md px-4 h-7 text-[11px] font-medium"
                        >
                            {isMoving ? "Đang di chuyển..." : "Thay đổi..."}
                        </Button>
                    </div>

                    {/* Warning Box (macOS Style Info) */}
                    <div className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600 mt-0.5 shrink-0" />
                        <div className="text-[10px] leading-relaxed text-red-900/70 dark:text-red-400/70">
                            <p className="font-bold uppercase tracking-tight mb-0.5 text-red-600">⚠️ Administrator Required</p>
                            <p>Tauri cần quyền admin để tạo **Symlink**. Nếu lỗi, hãy chạy app bằng quyền Admin và thử lại.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
