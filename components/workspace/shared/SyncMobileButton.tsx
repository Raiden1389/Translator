"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

import { QRCodeSVG } from "qrcode.react";
import { invoke } from "@tauri-apps/api/core";
import { db } from "@/lib/db";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SyncInfo {
  ip: string;
  port: number;
  token: string;
}

export function SyncMobileButton({ workspaceId }: { workspaceId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [syncInfo, setSyncInfo] = useState<SyncInfo | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "waiting" | "connected" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const startSync = async () => {
    setStatus("starting");
    setIsOpen(true);
    try {
      // 1. Load workspace data from Dexie IndexedDB
      const workspace = await db.workspaces.get(workspaceId);
      if (!workspace) throw new Error("Workspace không tồn tại");

      const allChapters = await db.chapters
        .where('workspaceId').equals(workspaceId)
        .sortBy('order');

      // Only sync chapters that have been translated
      const chapters = allChapters.filter(c =>
        c.status === 'translated' || c.content_translated
      );

      const dictionary = await db.dictionary
        .where('workspaceId').equals(workspaceId)
        .toArray();

      // 2. Serialize and pass to Rust sync server
      const syncData = JSON.stringify({
        workspace,
        chapters,
        dictionary,
      });

      const info = await invoke<SyncInfo>("start_sync_server", { syncData });
      setSyncInfo(info);
      setStatus("waiting");
    } catch (err: unknown) {
      console.error("Failed to start sync server:", err);
      setError(String(err));
      setStatus("error");
      toast.error("Không thể khởi động server đồng bộ");
    }
  };

  const stopSync = async () => {
    try {
      await invoke("stop_sync_server");
      setSyncInfo(null);
      setStatus("idle");
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to stop sync server:", err);
    }
  };

  // Auto-stop when component unmounts
  useEffect(() => {
    return () => {
      invoke("stop_sync_server").catch(() => { });
    };
  }, []);

  const qrValue = syncInfo
    ? `raiden://sync?ip=${syncInfo.ip}&port=${syncInfo.port}&token=${syncInfo.token}&workspaceId=${workspaceId}`
    : "";

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-xl hover:bg-background hover:shadow-primary/20 text-indigo-400 hover:text-indigo-500 transition-all active:scale-95 group"
        onClick={startSync}
      >
        <Smartphone className="h-4 w-4 group-hover:scale-110 transition-transform" />
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => !open && stopSync()}>
        <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-border/40 shadow-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Smartphone className="h-5 w-5 text-primary" />
              Đồng bộ Mobile
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-muted-foreground">
              Scan mã QR bên dưới bằng điện thoại để bắt đầu đồng bộ.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-6 space-y-6">
            {status === "starting" ? (
              <div className="flex flex-col items-center py-12 space-y-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-sm font-bold animate-pulse">Đang khởi tạo server...</p>
              </div>
            ) : status === "error" ? (
              <div className="flex flex-col items-center py-12 space-y-4 text-center">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <p className="text-sm font-bold text-destructive">Lỗi khởi động server</p>
                <p className="text-xs text-muted-foreground max-w-[240px]">{error}</p>
                <Button size="sm" onClick={startSync} variant="outline" className="mt-4">Thử lại</Button>
              </div>
            ) : (
              <>
                <div className="p-4 bg-white rounded-2xl shadow-inner border-8 border-primary/10">
                  <QRCodeSVG
                    value={qrValue}
                    size={200}
                    level="H"
                    includeMargin={false}
                    imageSettings={{
                      src: "/logo.png",
                      x: undefined,
                      y: undefined,
                      height: 40,
                      width: 40,
                      excavate: true,
                    }}
                  />
                </div>

                <div className="space-y-4 w-full">
                  <div className={cn(
                    "flex items-center justify-center gap-3 p-3 rounded-2xl border transition-all",
                    status === "waiting" ? "bg-amber-500/5 border-amber-500/20 text-amber-500" :
                      status === "connected" ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500" : ""
                  )}>
                    {status === "waiting" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-xs font-black uppercase tracking-widest">Đang chờ kết nối...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs font-black uppercase tracking-widest">Đã kết nối mobile</span>
                      </>
                    )}
                  </div>

                  <div className="p-3 bg-muted/30 rounded-2xl border border-border/40 text-center space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Địa chỉ mạng nội bộ</p>
                    <p className="text-xs font-mono font-bold text-primary">
                      {syncInfo?.ip}:{syncInfo?.port}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl h-10 text-xs font-bold"
                      onClick={() => {
                        navigator.clipboard.writeText(qrValue);
                        toast.success("Đã copy mã đồng bộ");
                      }}
                    >
                      Copy Link
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 rounded-xl h-10 text-xs font-bold"
                      onClick={stopSync}
                    >
                      Dừng Sync
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
