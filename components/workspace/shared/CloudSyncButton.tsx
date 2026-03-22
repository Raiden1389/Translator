"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Cloud, CloudOff, Loader2, Check, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import { toast } from "sonner";
import {
  pushAllDirty, hasToken, setToken, listCloudWorkspaces,
  pollAndApplyCloudCorrections,
  type CloudWorkspaceInfo,
} from "@/lib/sync/cloud-sync";

export function CloudSyncButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "syncing" | "done" | "error">("idle");
  const [progress, setProgress] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [cloudList, setCloudList] = useState<CloudWorkspaceInfo[]>([]);

  const tokenSet = hasToken();

  // ── Auto-poll cloud corrections from mobile ──
  useEffect(() => {
    if (!tokenSet) return;

    // Poll once immediately on mount
    pollAndApplyCloudCorrections().then(count => {
      if (count > 0) {
        toast.success(`📱 Nhận ${count} cải chính từ Mobile (cloud)`, { duration: 5000 });
      }
    });

    // Then poll every 30s
    const interval = setInterval(async () => {
      const count = await pollAndApplyCloudCorrections();
      if (count > 0) {
        toast.success(`📱 Nhận ${count} cải chính từ Mobile (cloud)`, { duration: 5000 });
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [tokenSet]);

  // Load cloud workspace list when popover opens
  useEffect(() => {
    if (isOpen && tokenSet) {
      listCloudWorkspaces()
        .then(setCloudList)
        .catch(() => setCloudList([]));
    }
  }, [isOpen, tokenSet]);

  const handleSync = useCallback(async () => {
    if (!tokenSet) {
      setShowTokenInput(true);
      return;
    }
    setStatus("syncing");
    try {
      const result = await pushAllDirty((current, total, wsTitle) => {
        setProgress(`☁️ ${current}/${total} — ${wsTitle}`);
      });

      setStatus("done");
      console.log(`[CloudSync] Done: pushed=${result.pushed}, skipped=${result.skipped}, errors=${result.errors.length}`);

      if (result.pushed > 0) {
        toast.success(`☁️ Synced ${result.pushed} workspace(s) to cloud`);
      } else if (result.skipped > 0 && result.errors.length === 0) {
        toast.info("☁️ Already up to date");
      }
      for (const err of result.errors) {
        console.error(`[CloudSync] Error:`, err);
        toast.error(err, { duration: 10000 });
      }

      // Refresh list
      listCloudWorkspaces().then(setCloudList).catch(() => { });

      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setStatus("error");
      console.error(`[CloudSync] Fatal:`, err);
      toast.error(`Sync failed: ${err instanceof Error ? err.message : String(err)}`, { duration: 10000 });
      setTimeout(() => setStatus("idle"), 2000);
    }
  }, [tokenSet]);

  const handleSaveToken = () => {
    if (!tokenInput.trim()) return;
    setToken(tokenInput.trim());
    setTokenInput("");
    setShowTokenInput(false);
    toast.success("☁️ Token saved");
  };

  const icon = status === "syncing" ? <Loader2 className="h-4 w-4 animate-spin" />
    : status === "done" ? <Check className="h-4 w-4 text-green-400" />
      : tokenSet ? <Cloud className="h-4 w-4" />
        : <CloudOff className="h-4 w-4 text-muted-foreground" />;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative" title="Cloud Sync">
          {icon}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">☁️ Cloud Sync</h4>
            <Button variant="ghost" size="icon" className="h-6 w-6"
              onClick={() => setShowTokenInput(!showTokenInput)}>
              <Settings2 className="h-3 w-3" />
            </Button>
          </div>

          {/* Token setup */}
          {(showTokenInput || !tokenSet) && (
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Sync token..."
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSaveToken()}
                className="flex-1 px-2 py-1 text-xs rounded border bg-background"
              />
              <Button size="sm" variant="outline" onClick={handleSaveToken}
                className="text-xs h-7">Save</Button>
            </div>
          )}

          {/* Cloud status */}
          {tokenSet && (
            <>
              <p className="text-xs text-muted-foreground">
                {cloudList.length > 0
                  ? `${cloudList.length} workspaces on cloud · ${cloudList.reduce((s, w) => s + w.chapterCount, 0)} chapters`
                  : "No workspaces on cloud yet"}
              </p>

              {/* Pull corrections button */}
              <Button className="w-full" size="sm" variant="outline"
                disabled={status === "syncing"}
                onClick={async () => {
                  setStatus("syncing");
                  setProgress("📱 Đang pull corrections...");
                  try {
                    const count = await pollAndApplyCloudCorrections();
                    if (count > 0) {
                      toast.success(`📱 Nhận ${count} cải chính từ Mobile!`, { duration: 5000 });
                      setProgress(`✅ Nhận ${count} cải chính`);
                    } else {
                      toast.info("📱 Không có cải chính mới");
                      setProgress("✅ Không có cải chính mới");
                    }
                    setStatus("done");
                    setTimeout(() => setStatus("idle"), 3000);
                  } catch (err) {
                    toast.error(`Pull failed: ${err instanceof Error ? err.message : String(err)}`);
                    setStatus("error");
                    setTimeout(() => setStatus("idle"), 2000);
                  }
                }}
              >
                {status === "syncing" ? progress : "📱 Pull Corrections từ Mobile"}
              </Button>

              {/* Sync button */}
              <Button className="w-full" size="sm" onClick={handleSync}
                disabled={status === "syncing"}>
                {status === "syncing" ? progress : "☁️ Push All to Cloud"}
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
