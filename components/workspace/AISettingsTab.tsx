"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Key, Database, Sparkles, Loader2, RefreshCw, CheckCircle, Calculator, Save, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAISettings } from "./hooks/useAISettings";

export function AISettingsTab() {
    const { state, actions } = useAISettings();
    const {
        primaryKey, poolKeys, model, availableModels,
        isLoadingModels, isSaving, checkingKeys, keyStatuses,
        isBackendKeyLoading, isFixingWordCount
    } = state;

    const {
        setPrimaryKey, setPoolKeys, setModel,
        handleSaveAll, handleLoadFromBackend, handleFetchModels,
        handleCheckAllKeys, handleFixWordCounts
    } = actions;

    return (
        <Card className="bg-card border-border shadow-xl">
            <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-400" />
                    Cấu Hình AI & API
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                    Quản lý kết nối Gemini, model dịch thuật thông qua Backend.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Primary Key */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-primary">
                        <Key className="h-4 w-4" /> Primary API Key (Gemini)
                    </Label>
                    <div className="flex gap-2">
                        <Input
                            placeholder="AIzaSy..."
                            value={primaryKey}
                            onChange={(e) => setPrimaryKey(e.target.value)}
                            className="bg-background border-border text-foreground focus-visible:ring-primary flex-1"
                        />
                        <Button
                            variant="outline"
                            onClick={handleLoadFromBackend}
                            disabled={isBackendKeyLoading}
                            className="border-primary/30 hover:bg-primary/5 text-primary gap-2"
                            title="Nạp Key từ file .env (Backend)"
                        >
                            {isBackendKeyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                            <span className="hidden sm:inline">Nạp từ .env</span>
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleFetchModels}
                            disabled={!primaryKey || isLoadingModels}
                            className="border-border hover:bg-muted text-muted-foreground"
                            title="Lấy danh sách Model từ Key này"
                        >
                            {isLoadingModels ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                {/* Model Selection */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-primary">
                        <Sparkles className="h-4 w-4" /> AI Model
                    </Label>
                    <Select value={model} onValueChange={setModel}>
                        <SelectTrigger className="bg-background border-border text-foreground">
                            <SelectValue placeholder="Chọn Model" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border text-popover-foreground">
                            <SelectGroup>
                                {availableModels.map((m) => (
                                    <SelectItem key={m.value} value={m.value} className="focus:bg-accent focus:text-accent-foreground cursor-pointer hover:bg-accent">
                                        {m.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>

                {/* Key Pool */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-primary">
                        <Database className="h-4 w-4" />
                        Key Pool (Dự phòng)
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                            {poolKeys.split(/[\n,;]+/).filter(k => k.trim().length > 10).length} keys
                        </span>
                    </Label>
                    <Textarea
                        placeholder={`AIzaSy...
AIzaSy...`}
                        value={poolKeys}
                        onChange={(e) => setPoolKeys(e.target.value)}
                        className="bg-background border-border text-foreground focus-visible:ring-primary font-mono text-xs h-[150px]"
                    />
                    <p className="text-xs text-muted-foreground">Mỗi dòng một Key. Hệ thống sẽ tự động chuyển Key khi key chính bị lỗi 429.</p>

                    {/* Key Checker */}
                    <div className="pt-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={handleCheckAllKeys}
                            disabled={checkingKeys}
                            className="w-full bg-muted/50 hover:bg-muted text-primary border border-primary/20"
                        >
                            {checkingKeys ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            Kiểm tra tình trạng toàn bộ Key (Qua Backend)
                        </Button>

                        {keyStatuses.length > 0 && (
                            <div className="mt-2 space-y-1 max-h-[200px] overflow-y-auto p-2 bg-muted/30 rounded border border-border custom-scrollbar">
                                {keyStatuses.map((k, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs px-2 py-2 rounded bg-muted/50">
                                        <div className="flex items-center gap-2 truncate max-w-[70%]">
                                            <div className={cn("h-2 w-2 rounded-full flex-shrink-0",
                                                k.status === 'valid' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" :
                                                    k.status === 'invalid' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                                                        "bg-yellow-500 animate-pulse"
                                            )} />
                                            <span className="font-mono text-muted-foreground truncate">{k.key}</span>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            {k.status === 'valid' ? (
                                                <span className="text-green-400 font-mono">{k.ms}ms</span>
                                            ) : k.status === 'invalid' ? (
                                                <span className="text-red-400 text-[10px]">{k.error || "Lỗi"}</span>
                                            ) : (
                                                <span className="text-amber-400">Checking...</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <Button
                    onClick={handleSaveAll}
                    disabled={isSaving}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 text-lg shadow-lg"
                >
                    {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    Lưu Thay Đổi
                </Button>

                {/* Word Count Fix */}
                <div className="space-y-2 pt-4 border-t border-border">
                    <Label className="flex items-center gap-2 text-amber-500">
                        <Calculator className="h-4 w-4" />
                        Sửa lại Word Count
                    </Label>
                    <p className="text-xs text-muted-foreground">Nếu số từ dịch bị sai, bấm nút này để tính lại tất cả.</p>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleFixWordCounts}
                        disabled={isFixingWordCount}
                        className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    >
                        {isFixingWordCount ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
                        {isFixingWordCount ? "Đang sửa..." : "Sửa lại Word Count"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
