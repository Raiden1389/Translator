"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Key, Database, Sparkles, Loader2, RefreshCw, Save, ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAISettings } from "./hooks/useAISettings";
import { getAIProviderLabel, getVertexAuthModeLabel, VERTEX_LOCATION_OPTIONS } from "@/lib/ai-provider";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GeminiOAuthSettings } from "@/components/settings/GeminiOAuthSettings";
import { StorageSettings } from "@/components/settings/StorageSettings";

function maskKeyTail(key: string) {
    const trimmed = key.trim();
    if (!trimmed) return "";
    if (trimmed.length <= 4) return `••••${trimmed}`;
    return `••••${trimmed.slice(-4)}`;
}

export default function AISettingsTab() {

    const { state, actions } = useAISettings();
    const {
        provider, primaryKey, vertexKey, vertexAuthMode, vertexServiceAccountPath, vertexProjectId, vertexLocation, poolKeys, model, availableModels,
        isLoadingModels, isSaving, checkingKeys, keyStatuses,
        isBackendKeyLoading
    } = state;

    const {
        setProvider, setPrimaryKey, setVertexKey, setVertexAuthMode, setVertexServiceAccountPath, setVertexProjectId, setVertexLocation, setPoolKeys, setModel,
        handleSaveAll, handleLoadFromBackend, handleFetchModels,
        handleCheckAllKeys
    } = actions;
    const isVertexProvider = provider === "vertex";
    const isVertexServiceAccount = isVertexProvider && vertexAuthMode === "serviceAccount";
    const activePrimaryKey = isVertexProvider
        ? (isVertexServiceAccount ? vertexServiceAccountPath : vertexKey)
        : primaryKey;
    const providerLabel = getAIProviderLabel(provider);
    const activePoolKeys = poolKeys.split(/[\n,;]+/).map((key) => key.trim()).filter((key) => key.length > 10);

    return (
        <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8 space-y-1 px-1">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                    <Sparkles className="h-6 w-6 text-primary" />
                    Cấu hình Trí tuệ nhân tạo
                </h2>
                <p className="text-muted-foreground text-sm">Quản lý các kết nối AI, mô hình ngôn ngữ và kho khóa dự phòng.</p>
            </div>

            <div className="grid gap-6">
                {/* SECTION: Connection & Primary Key */}
                <Card className="border-none shadow-xl overflow-hidden bg-card">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                            <Key className="h-4 w-4" />
                            Kết nối chính (Primary)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <Label className="text-xs font-bold text-foreground/70 uppercase">AI Provider</Label>
                            <Select value={provider} onValueChange={(value) => setProvider(value as "gemini" | "vertex")}>
                                <SelectTrigger className="bg-muted/30 border-border/50 h-10 font-bold">
                                    <SelectValue placeholder="Chọn Provider" />
                                </SelectTrigger>
                                <SelectContent className="backdrop-blur-xl">
                                    <SelectGroup>
                                        <SelectItem value="gemini">Gemini API</SelectItem>
                                        <SelectItem value="vertex">Vertex AI</SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground italic">
                                Provider hiện tại: {providerLabel}
                            </p>
                        </div>

                        {isVertexProvider && (
                            <div className="space-y-3">
                                <Label className="text-xs font-bold text-foreground/70 uppercase">Vertex Auth Mode</Label>
                                <Select value={vertexAuthMode} onValueChange={(value) => setVertexAuthMode(value as "apiKey" | "serviceAccount")}>
                                    <SelectTrigger className="bg-muted/30 border-border/50 h-10 font-bold">
                                        <SelectValue placeholder="Chọn kiểu xác thực Vertex" />
                                    </SelectTrigger>
                                    <SelectContent className="backdrop-blur-xl">
                                        <SelectGroup>
                                            <SelectItem value="apiKey">API Key (Express Mode)</SelectItem>
                                            <SelectItem value="serviceAccount">Service Account (Full Vertex)</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                                <p className="text-[10px] text-muted-foreground italic">
                                    Chế độ hiện tại: {getVertexAuthModeLabel(vertexAuthMode)}
                                </p>
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-foreground/70 uppercase">
                                    {isVertexProvider
                                        ? (isVertexServiceAccount ? "Service Account JSON Path" : "Vertex AI API Key")
                                        : "Google Gemini API Key"}
                                </Label>
                                <span className="text-[10px] bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full font-bold">Encrypted</span>
                            </div>
                            <div className="flex gap-2">
                                <div className="relative flex-1 group">
                                    <Input
                                        type={isVertexServiceAccount ? "text" : "password"}
                                        placeholder={isVertexProvider
                                            ? (isVertexServiceAccount
                                                ? "C:\\...\\service-account.json"
                                                : "AIzaSy... hoặc Google Cloud API Key cho Vertex Express Mode")
                                            : "AIzaSy... (Dán key của bạn vào đây)"}
                                        value={activePrimaryKey}
                                        onChange={(e) => isVertexProvider
                                            ? (isVertexServiceAccount ? setVertexServiceAccountPath(e.target.value) : setVertexKey(e.target.value))
                                            : setPrimaryKey(e.target.value)}
                                        className="bg-muted/30 border-border/50 h-10 px-4 focus-visible:ring-primary focus-visible:bg-muted/50 transition-all font-mono"
                                    />
                                    {!activePrimaryKey && (
                                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                            <span className="text-[10px] text-destructive font-bold animate-pulse">Chưa có key</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground italic">
                                {isVertexProvider
                                    ? (isVertexServiceAccount
                                        ? "Phase 2A dùng Full Vertex bằng Service Account JSON. Có thể mở Gemini 3 qua global/project flow."
                                        : "Phase 1 dùng Vertex AI Express Mode bằng API key. Bấm Refresh để lấy danh sách model từ Vertex.")
                                    : "Phím tắt: Bấm Refresh bên dưới để cập nhật danh sách model sau khi dán key."}
                            </p>
                            {isVertexProvider && !isVertexServiceAccount && (
                                <p className="text-[10px] text-amber-600/80 italic">
                                    Gemini 3 Preview hiện chưa mở cho flow Vertex API key/Express Mode của app này, nên danh sách model Vertex sẽ ẩn các model Gemini 3 để tránh lỗi 404.
                                </p>
                            )}
                        </div>

                        {isVertexServiceAccount && (
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-foreground/70 uppercase">Project ID</Label>
                                    <Input
                                        value={vertexProjectId}
                                        onChange={(e) => setVertexProjectId(e.target.value)}
                                        placeholder="my-gcp-project"
                                        className="bg-muted/30 border-border/50 h-10 px-4"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-foreground/70 uppercase">Vertex Location</Label>
                                    <Select value={vertexLocation} onValueChange={setVertexLocation}>
                                        <SelectTrigger className="bg-muted/30 border-border/50 h-10 font-bold">
                                            <SelectValue placeholder="Chọn location Vertex" />
                                        </SelectTrigger>
                                        <SelectContent className="backdrop-blur-xl">
                                            <SelectGroup>
                                                {VERTEX_LOCATION_OPTIONS.map((location) => (
                                                    <SelectItem key={location.value} value={location.value}>
                                                        {location.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-muted-foreground italic">
                                        Gemini 3 nên dùng Global; Gemini 2.5 Flash mặc định hợp với Asia (Singapore).
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3 pt-2 border-t border-border/50">
                            <Label className="text-xs font-bold text-foreground/70 uppercase flex items-center gap-2">
                                Mô hình AI
                                {isLoadingModels && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                            </Label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Select value={model} onValueChange={setModel}>
                                        <SelectTrigger className="bg-muted/30 border-border/50 h-10 font-bold">
                                            <SelectValue placeholder="Chọn Model" />
                                        </SelectTrigger>
                                        <SelectContent className="backdrop-blur-xl">
                                            <SelectGroup>
                                                {availableModels.map((m) => (
                                                    <SelectItem key={m.value} value={m.value} className="cursor-pointer font-medium">
                                                        {m.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={handleFetchModels}
                                            disabled={!activePrimaryKey || isLoadingModels}
                                            className="h-10 w-10 border-border/50 hover:bg-muted"
                                        >
                                            <RefreshCw className={cn("h-4 w-4", isLoadingModels && "animate-spin")} />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Lấy danh sách Model mới nhất từ provider hiện tại</TooltipContent>
                                </Tooltip>
                            </div>
                        </div>

                        {isVertexProvider && (
                            <div className="pt-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCheckAllKeys}
                                            disabled={checkingKeys || !activePrimaryKey}
                                            className="w-full h-10 border-border/50 hover:bg-muted font-bold text-xs"
                                        >
                                            {checkingKeys ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                            {isVertexServiceAccount ? "Kiểm tra Service Account" : "Kiểm tra Vertex API Key"}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {isVertexServiceAccount
                                            ? "Kiểm tra Service Account hiện tại có gọi được Vertex AI không"
                                            : "Kiểm tra trạng thái của Vertex API key hiện tại"}
                                    </TooltipContent>
                                </Tooltip>

                                {keyStatuses.length > 0 && (
                                    <div className="mt-4 grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto p-2 custom-scrollbar">
                                        {keyStatuses.map((k, i) => (
                                            <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border/30 hover:bg-muted/40 transition-colors">
                                                <div className="flex items-center gap-2 truncate pr-2">
                                                    <div className={cn("h-2 w-2 rounded-full shrink-0",
                                                        k.status === 'valid' ? "bg-emerald-500" :
                                                            k.status === 'invalid' ? "bg-rose-500" :
                                                                "bg-amber-500 animate-pulse"
                                                    )} />
                                                    <span className="font-mono text-[10px] text-muted-foreground truncate">{maskKeyTail(k.key)}</span>
                                                </div>
                                                <div className="shrink-0">
                                                    {k.status === 'valid' ? (
                                                        <span className="text-emerald-500 font-bold text-[10px]">{k.ms}ms</span>
                                                    ) : k.status === 'invalid' ? (
                                                        <span className="text-rose-500 font-bold text-[10px]">FAILED</span>
                                                    ) : (
                                                        <span className="text-amber-500 text-[10px] animate-pulse">...</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* SECTION: Key Pool */}
                {!isVertexProvider && (
                <Card className="border-none shadow-xl overflow-hidden bg-card">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                Kho Key dự phòng (Pool)
                            </CardTitle>
                            <div className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-lg border border-primary/20">
                                {activePoolKeys.length} KEYS ACTIVE
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            placeholder={`AIzaSy... (Key 1)\nAIzaSy... (Key 2)`}
                            value={poolKeys}
                            onChange={(e) => setPoolKeys(e.target.value)}
                            className="bg-muted/30 border-border/50 text-foreground focus-visible:ring-primary font-mono text-xs h-[120px] resize-none px-4 py-3"
                        />
                        {activePoolKeys.length > 0 && (
                            <div className="rounded-xl border border-border/40 bg-muted/20 px-4 py-3 space-y-1.5">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Preview key pool</div>
                                <div className="space-y-1">
                                    {activePoolKeys.map((key, index) => (
                                        <div key={`${key}-${index}`} className="text-[11px] font-mono text-muted-foreground">
                                            Key {index + 1}: <span className="font-bold text-foreground">{maskKeyTail(key)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                            <div className="bg-amber-500/20 p-1.5 rounded-lg">
                                <ShieldCheck className="h-4 w-4 text-amber-500" />
                            </div>
                            <p className="text-[11px] text-amber-600/80 leading-relaxed font-medium">
                                <strong>Thông minh:</strong> Hệ thống sẽ tự động xoay tua (Rotation) key trong pool nếu key chính gặp lỗi giới hạn (429). Nhập mỗi dòng một key.
                            </p>
                        </div>

                        {/* Status Check Board */}
                        <div className="pt-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCheckAllKeys}
                                        disabled={checkingKeys}
                                        className="w-full h-10 border-border/50 hover:bg-muted font-bold text-xs"
                                    >
                                        {checkingKeys ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                        Kiểm tra Sức khỏe toàn bộ kho Key
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Kiểm tra trạng thái hoạt động của tất cả các Key</TooltipContent>
                            </Tooltip>

                            {keyStatuses.length > 0 && (
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto p-2 custom-scrollbar">
                                    {keyStatuses.map((k, i) => (
                                        <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border/30 hover:bg-muted/40 transition-colors">
                                            <div className="flex items-center gap-2 truncate pr-2">
                                                <div className={cn("h-2 w-2 rounded-full shrink-0",
                                                    k.status === 'valid' ? "bg-emerald-500" :
                                                        k.status === 'invalid' ? "bg-rose-500" :
                                                            "bg-amber-500 animate-pulse"
                                                )} />
                                                <span className="font-mono text-[10px] text-muted-foreground truncate">{maskKeyTail(k.key)}</span>
                                            </div>
                                            <div className="shrink-0">
                                                {k.status === 'valid' ? (
                                                    <span className="text-emerald-500 font-bold text-[10px]">{k.ms}ms</span>
                                                ) : k.status === 'invalid' ? (
                                                    <span className="text-rose-500 font-bold text-[10px]">FAILED</span>
                                                ) : (
                                                    <span className="text-amber-500 text-[10px] animate-pulse">...</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
                )}

                {/* SECTION: OAuth Authentication */}
                {!isVertexProvider && <GeminiOAuthSettings />}

                {/* SECTION: Storage Settings Group */}
                <div className="bg-white/40 dark:bg-black/20 border border-black/[0.05] dark:border-white/[0.05] rounded-xl overflow-hidden shadow-xs">
                    <StorageSettings />
                </div>

                {/* Native macOS Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 mt-2">
                    <Button
                        onClick={handleLoadFromBackend}
                        disabled={isBackendKeyLoading || isVertexProvider}
                        variant="outline"
                        className="h-8 px-4 rounded-md border-black/10 bg-white/50 hover:bg-white text-black hover:text-black dark:text-white dark:hover:text-white transition-all text-[13px] font-medium"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5 mr-2", isBackendKeyLoading && "animate-spin")} />
                        {isVertexProvider ? "Chỉ hỗ trợ Gemini .env" : "Nạp từ .env"}
                    </Button>

                    <Button
                        onClick={handleSaveAll}
                        disabled={isSaving}
                        className="h-8 px-6 rounded-md bg-[#007AFF] hover:bg-[#007AFF]/90 text-white text-[13px] font-medium shadow-sm transition-all shadow-[#007AFF]/20"
                    >
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Save className="h-3.5 w-3.5 mr-2" />}
                        Lưu cài đặt
                    </Button>
                </div>
            </div>
        </div>
    );
}
