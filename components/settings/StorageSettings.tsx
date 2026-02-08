"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, HardDrive, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { appDataDir } from "@tauri-apps/api/path";

export function StorageSettings() {
    const [currentPath, setCurrentPath] = useState<string>("");
    const [isMoving, setIsMoving] = useState(false);

    useEffect(() => {
        const loadCurrentPath = async () => {
            try {
                const path = await appDataDir();
                setCurrentPath(path);
            } catch (e) {
                console.error("Failed to get app data dir:", e);
            }
        };
        loadCurrentPath();
    }, []);

    const handleChangeLocation = async () => {
        try {
            // 1. Open folder picker
            const selected = await open({
                directory: true,
                multiple: false,
                title: "Chọn thư mục lưu dữ liệu mới"
            });

            if (!selected || typeof selected !== 'string') {
                return; // User cancelled
            }

            // 2. Confirm
            const confirm = window.confirm(
                `Bạn muốn chuyển dữ liệu sang:\n${selected}\n\n` +
                `⚠️ Lưu ý:\n` +
                `- App sẽ copy toàn bộ data sang thư mục mới\n` +
                `- Cần quyền Administrator trên Windows\n` +
                `- Quá trình có thể mất vài phút\n\n` +
                `Tiếp tục?`
            );

            if (!confirm) return;

            // 3. Move storage
            setIsMoving(true);
            const toastId = "storage-move";
            toast.loading("Đang di chuyển dữ liệu...", { id: toastId });

            try {
                const result = await invoke<string>("create_storage_symlink", {
                    newPath: selected
                });

                toast.success(result, { id: toastId, duration: 5000 });
                setCurrentPath(selected);

                // 4. Ask to restart
                const restart = window.confirm(
                    "Di chuyển thành công!\n\n" +
                    "Bạn cần khởi động lại app để áp dụng thay đổi.\n" +
                    "Khởi động lại ngay?"
                );

                if (restart) {
                    window.location.reload();
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);

                // Check if it's permission error
                if (msg.includes("Administrator")) {
                    toast.error(
                        "Cần quyền Administrator!\n\n" +
                        "Hãy:\n" +
                        "1. Đóng app\n" +
                        "2. Click phải vào app\n" +
                        "3. Chọn 'Run as Administrator'\n" +
                        "4. Thử lại",
                        { id: toastId, duration: 10000 }
                    );
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
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5" />
                    Vị trí lưu trữ
                </CardTitle>
                <CardDescription>
                    Quản lý nơi lưu trữ dữ liệu của app
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Current Location */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Thư mục hiện tại:</label>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono truncate">
                            {currentPath || "Đang tải..."}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleOpenCurrent}
                            disabled={!currentPath}
                        >
                            <FolderOpen className="w-4 h-4 mr-2" />
                            Mở
                        </Button>
                    </div>
                </div>

                {/* Change Location */}
                <div className="space-y-2">
                    <Button
                        onClick={handleChangeLocation}
                        disabled={isMoving || !currentPath}
                        className="w-full"
                    >
                        {isMoving ? "Đang di chuyển..." : "Đổi thư mục lưu trữ"}
                    </Button>
                </div>

                {/* Warning */}
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-800 dark:text-amber-200">
                        <p className="font-semibold mb-1">Lưu ý quan trọng:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Trên Windows cần quyền Administrator để tạo symlink</li>
                            <li>Dữ liệu sẽ được copy sang thư mục mới (có thể mất vài phút)</li>
                            <li>Sau khi di chuyển, nên khởi động lại app</li>
                            <li>Không xóa thư mục mới sau khi đã di chuyển</li>
                        </ul>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
