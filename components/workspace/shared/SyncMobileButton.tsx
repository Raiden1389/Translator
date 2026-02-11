"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, Loader2, CheckCircle2, AlertCircle, Globe } from "lucide-react";

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
  const [tunnelUrl, setTunnelUrl] = useState<string | null>(null);
  const [tunnelStatus, setTunnelStatus] = useState<"idle" | "starting" | "ready" | "error">("idle");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Generate QR code when tunnel URL is available
  useEffect(() => {
    if (!tunnelUrl) { setQrDataUrl(null); return; }

    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(tunnelUrl, {
        width: 256,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      }).then((url: string) => {
        setQrDataUrl(url);
      }).catch(() => {
        setQrDataUrl(null);
      });
    });
  }, [tunnelUrl]);

  const startSync = async () => {
    setStatus("starting");
    setIsOpen(true);
    setTunnelUrl(null);
    setTunnelStatus("idle");
    try {
      const workspace = await db.workspaces.get(workspaceId);
      if (!workspace) throw new Error("Workspace không tồn tại");

      const allChapters = await db.chapters
        .where('workspaceId').equals(workspaceId)
        .sortBy('order');

      const chapters = allChapters.filter(c =>
        c.status === 'translated' || c.content_translated
      );

      const dictionary = await db.dictionary
        .where('workspaceId').equals(workspaceId)
        .toArray();

      const syncData = JSON.stringify({ workspace, chapters, dictionary });

      let info: SyncInfo;
      try {
        info = await invoke<SyncInfo>("start_sync_server", { syncData });
      } catch (firstErr) {
        const errStr = String(firstErr);
        if (errStr.includes("10048") || errStr.includes("address")) {
          console.log("[Sync] Port busy, stopping old server and retrying...");
          await invoke("stop_sync_server").catch(() => { });
          await new Promise(r => setTimeout(r, 1500));
          info = await invoke<SyncInfo>("start_sync_server", { syncData });
        } else {
          throw firstErr;
        }
      }

      setSyncInfo(info);
      setStatus("waiting");

      // Auto-start HTTPS tunnel
      setTunnelStatus("starting");
      try {
        const url = await invoke<string>("start_tunnel", { port: info.port });
        setTunnelUrl(url);
        setTunnelStatus("ready");
        console.log("[Sync] Tunnel ready:", url);
      } catch (tunnelErr) {
        console.warn("[Sync] Tunnel failed (HTTP-only mode):", tunnelErr);
        setTunnelStatus("error");
      }
    } catch (err: unknown) {
      console.error("Failed to start sync server:", err);
      setError(String(err));
      setStatus("error");
      toast.error("Không thể khởi động server đồng bộ");
    }
  };

  const stopSync = async () => {
    try {
      await invoke("stop_tunnel").catch(() => { });
      await invoke("stop_sync_server");
      setSyncInfo(null);
      setStatus("idle");
      setTunnelUrl(null);
      setTunnelStatus("idle");
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to stop sync server:", err);
    }
  };

  // Poll for incoming corrections from mobile while server is active
  useEffect(() => {
    if (status !== "waiting" && status !== "connected") return;

    const interval = setInterval(async () => {
      try {
        const corrections = await invoke<{ oldText: string; newText: string; scope: string; fromChapterOrder: number; dirtyChapters?: { order: number; content_translated: string }[] }[]>("poll_mobile_corrections");
        if (corrections.length === 0) return;

        setStatus("connected");

        let totalApplied = 0;
        for (const c of corrections) {
          if (c.dirtyChapters && c.dirtyChapters.length > 0) {
            for (const dc of c.dirtyChapters) {
              const chapters = await db.chapters
                .where({ workspaceId, order: dc.order })
                .toArray();
              for (const ch of chapters) {
                await db.chapters.update(ch.id!, {
                  content_translated: dc.content_translated,
                });
              }
            }
            totalApplied += c.dirtyChapters.length;
          } else {
            const allChapters = c.scope === 'all'
              ? await db.chapters.where('workspaceId').equals(workspaceId).toArray()
              : await db.chapters.where({ workspaceId, order: c.fromChapterOrder }).toArray();

            for (const ch of allChapters) {
              if (ch.content_translated?.includes(c.oldText)) {
                await db.chapters.update(ch.id!, {
                  content_translated: ch.content_translated.replaceAll(c.oldText, c.newText),
                });
                totalApplied++;
              }
            }
          }
        }

        toast.success(`📱 Nhận ${corrections.length} sửa đổi từ mobile (${totalApplied} chương)`, {
          duration: 5000,
        });
        console.log(`[SyncMobile] Applied ${corrections.length} corrections to ${totalApplied} chapters`);

        for (const c of corrections) {
          const existing = await db.corrections
            .where({ workspaceId })
            .filter(e => e.type === 'replace' && e.from === c.oldText && e.to === c.newText)
            .first();

          if (!existing) {
            await db.corrections.add({
              workspaceId,
              type: 'replace',
              from: c.oldText,
              to: c.newText,
              original: c.oldText,
              replacement: c.newText,
              createdAt: new Date(),
            });
          }
        }
      } catch (err) {
        console.debug("[SyncMobile] Poll error:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [status, workspaceId]);

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
              {tunnelUrl ? "Quét QR bằng camera điện thoại để mở Reader" : "Đang khởi tạo kết nối..."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-4 space-y-4">
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
              <div className="space-y-4 w-full">
                {/* QR Code */}
                {tunnelStatus === "starting" && (
                  <div className="flex flex-col items-center py-6 space-y-3">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <p className="text-xs font-bold text-muted-foreground animate-pulse">Đang tạo HTTPS tunnel...</p>
                  </div>
                )}

                {tunnelStatus === "ready" && qrDataUrl && (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="bg-white p-3 rounded-2xl shadow-lg">
                      <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                      📷 Quét bằng Camera điện thoại
                    </p>
                  </div>
                )}

                {tunnelStatus === "error" && (
                  <div className="text-center py-2">
                    <p className="text-[10px] text-amber-500 font-bold">⚠️ Tunnel không khả dụng — dùng LAN</p>
                  </div>
                )}

                {/* Status */}
                <div className={cn(
                  "flex items-center justify-center gap-3 p-3 rounded-2xl border transition-all",
                  status === "waiting" ? "bg-amber-500/5 border-amber-500/20 text-amber-500" :
                    status === "connected" ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500" : ""
                )}>
                  {status === "waiting" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Đang chờ kết nối...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">📱 Đã kết nối mobile</span>
                    </>
                  )}
                </div>

                {/* URL info */}
                <div className="p-3 bg-muted/30 rounded-2xl border border-border/40 text-center space-y-1.5">
                  {tunnelUrl ? (
                    <>
                      <div className="flex items-center justify-center gap-1.5">
                        <Globe className="h-3 w-3 text-emerald-500" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">HTTPS</p>
                      </div>
                      <p
                        className="text-[11px] font-mono font-bold text-primary cursor-pointer hover:underline truncate"
                        onClick={() => { navigator.clipboard.writeText(tunnelUrl); toast.success("Đã copy URL"); }}
                        title="Click để copy"
                      >
                        {tunnelUrl.replace("https://", "")}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">LAN</p>
                      <p className="text-xs font-mono font-bold text-primary">{syncInfo?.ip}:{syncInfo?.port}</p>
                    </>
                  )}
                </div>

                {/* Stop */}
                <Button
                  variant="destructive"
                  className="w-full rounded-xl h-10 text-xs font-bold"
                  onClick={stopSync}
                >
                  Dừng Sync
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
