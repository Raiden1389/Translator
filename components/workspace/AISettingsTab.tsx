"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Key, Database, Sparkles, Loader2, RefreshCw, Settings, CheckCircle, XCircle, AlertTriangle, Calculator, Save } from "lucide-react";
import { AI_MODELS, DEFAULT_MODEL, migrateModelId } from "@/lib/ai-models";
import { GoogleGenAI } from "@google/genai";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function AISettingsTab() {
    const [primaryKey, setPrimaryKey] = useState("");
    const [poolKeys, setPoolKeys] = useState("");
    const [model, setModel] = useState(DEFAULT_MODEL); // Default safe fallback
    const [availableModels, setAvailableModels] = useState<{ value: string, label: string }[]>(AI_MODELS);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Key Check State
    const [checkingKeys, setCheckingKeys] = useState(false);
    const [keyStatuses, setKeyStatuses] = useState<{ key: string, status: 'valid' | 'invalid' | 'checking', ms?: number, error?: string }[]>([]);

    // Word Count Fix State
    const [isFixingWordCount, setIsFixingWordCount] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const k1 = await db.settings.get("apiKeyPrimary");
        const k2 = await db.settings.get("apiKeyPool");
        const m = await db.settings.get("aiModel");

        if (k1) setPrimaryKey(k1.value);
        if (k2) setPoolKeys(k2.value);
        if (m) setModel(migrateModelId(m.value));
    };

    const handleSavePrimary = (val: string) => {
        setPrimaryKey(val);
    };

    const handleSavePool = (val: string) => {
        setPoolKeys(val);
    };

    const handleSaveModel = (val: string) => {
        setModel(val);
    };

    const handleSaveAll = async () => {
        setIsSaving(true);
        try {
            await db.settings.put({ key: "apiKeyPrimary", value: primaryKey });
            await db.settings.put({ key: "apiKeyPool", value: poolKeys });
            await db.settings.put({ key: "aiModel", value: model });
            toast.success("Đã lưu cấu hình thành công!");
        } catch (e) {
            console.error(e);
            toast.error("Lỗi khi lưu cấu hình.");
        } finally {
            setIsSaving(false);
        }
    };

    const fetchModels = async () => {
        if (!primaryKey) return;
        setIsLoadingModels(true);
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${primaryKey}`);
            const data = await response.json();
            if (data.models) {
                const models = data.models
                    .map((m: any) => {
                        const id = m.name.replace("models/", "");
                        return { value: id, label: id };
                    })
                    .filter((m: { value: string }) => m.value.includes("gemini"));
                setAvailableModels(models);
            } else {
                alert("Failed to fetch models. Check your API Key.");
            }
        } catch (e) {
            console.error(e);
            alert("Network error fetching models.");
        } finally {
            setIsLoadingModels(false);
        }
    };

    const checkAllKeys = async () => {
        setCheckingKeys(true);
        const keysToCheck: string[] = [];
        if (primaryKey) keysToCheck.push(primaryKey);
        if (poolKeys) {
            keysToCheck.push(...poolKeys.split(/[\n,;]+/).map(k => k.trim()).filter(k => k.length > 10));
        }

        const uniqueKeys = Array.from(new Set(keysToCheck));

        // Init status
        setKeyStatuses(uniqueKeys.map(k => ({ key: k, status: 'checking' })));

        const results = await Promise.all(uniqueKeys.map(async (key) => {
            const start = Date.now();
            try {
                const ai = new GoogleGenAI({ apiKey: key });
                const modelToUse = model || "gemini-1.5-flash";
                await ai.models.generateContent({
                    model: modelToUse,
                    contents: { role: 'user', parts: [{ text: "hi" }] } // Correct SDK format
                });
                // Note: The @google/genai SDK format might differ slightly between versions. 
                // SettingsDialog used `contents: "hi"` which is valid for some versions/abstractions.
                // Reverting to match SettingsDialog implementation structure for safety if SDK is specific.

                return { key, status: 'valid' as const, ms: Date.now() - start };
            } catch (e: any) {
                console.warn("Key Check Failed:", e);
                // Simple retry or specific error parsing
                let errorMsg = "Error";
                if (e.message) errorMsg = e.message;
                return { key, status: 'invalid' as const, error: errorMsg };
            }
        }));

        setKeyStatuses(results);
        setCheckingKeys(false);
    };

    // Re-check fetch logic in SettingsDialog used `contents: "hi"`
    // Using strict match to SettingsDialog for safety
    const checkAllKeysSafe = async () => {
        setCheckingKeys(true);
        const keysToCheck: string[] = [];
        if (primaryKey) keysToCheck.push(primaryKey);
        if (poolKeys) {
            keysToCheck.push(...poolKeys.split(/[\n,;]+/).map(k => k.trim()).filter(k => k.length > 10));
        }

        const uniqueKeys = Array.from(new Set(keysToCheck));
        setKeyStatuses(uniqueKeys.map(k => ({ key: k, status: 'checking' })));

        const results = await Promise.all(uniqueKeys.map(async (key) => {
            const start = Date.now();
            try {
                // Use legacy format if that's what's installed, or safe format
                // Assuming existing SettingsDialog logic works, I'll copy the payload structure
                // But wait, SettingsDialog imported `GoogleGenAI` from `@google/genai`.
                // Let's verify the `generateContent` call signature in SettingsDialog.
                // It used `contents: "hi"`.

                const ai = new GoogleGenAI({ apiKey: key });
                const modelToUse = model || "gemini-1.5-flash";
                await ai.models.generateContent({
                    model: modelToUse,
                    contents: "hi" // Simple string content
                });

                return { key, status: 'valid' as const, ms: Date.now() - start };
            } catch (e: any) {
                let errorMsg = e.message || "Unknown error";
                // Check specifically for known errors like Quota
                if (errorMsg.includes("429") || errorMsg.includes("Quota")) errorMsg = "Hết hạn mức (Quota)";
                if (errorMsg.includes("expired")) errorMsg = "Key hết hạn";

                return { key, status: 'invalid' as const, error: errorMsg };
            }
        }));

        setKeyStatuses(results);
        setCheckingKeys(false);
    };

    const fixAllWordCounts = async () => {
        setIsFixingWordCount(true);
        try {
            const allChapters = await db.chapters.toArray();
            let fixed = 0;

            for (const chapter of allChapters) {
                if (chapter.content_translated) {
                    const correctWordCount = chapter.content_translated.split(/\s+/).filter(w => w.length > 0).length;
                    await db.chapters.update(chapter.id!, { wordCountTranslated: correctWordCount });
                    fixed++;
                }
            }

            alert(`Đã sửa ${fixed} chương!`);
        } catch (e) {
            console.error(e);
            alert("Lỗi: " + e);
        } finally {
            setIsFixingWordCount(false);
        }
    };

    return (
        <Card className="bg-card border-border shadow-xl">
            <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-400" />
                    Cấu Hình AI & API
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                    Quản lý kết nối Gemini, model dịch thuật.
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
                            onChange={(e) => handleSavePrimary(e.target.value)}
                            className="bg-background border-border text-foreground focus-visible:ring-primary flex-1"
                        />
                        <Button
                            variant="outline"
                            onClick={fetchModels}
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
                    <Select value={model} onValueChange={handleSaveModel}>
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
                    <p className="text-xs text-muted-foreground">Model sẽ được dùng cho cả dịch và check key.</p>
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
                        onChange={(e) => handleSavePool(e.target.value)}
                        className="bg-background border-border text-foreground focus-visible:ring-primary font-mono text-xs h-[150px]"
                    />
                    <p className="text-xs text-muted-foreground">Mỗi dòng một Key. Hệ thống sẽ tự động chuyển Key khi key chính bị lỗi 429.</p>

                    {/* Key Checker */}
                    <div className="pt-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={checkAllKeysSafe}
                            disabled={checkingKeys}
                            className="w-full bg-muted/50 hover:bg-muted text-primary border border-primary/20"
                        >
                            {checkingKeys ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            Kiểm tra tình trạng toàn bộ Key
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
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 text-lg shadow-lg hover:shadow-primary/25 transition-all mb-6"
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
                    <p className="text-xs text-muted-foreground">Nếu số từ dịch bị sai (14k thay vì 3k), bấm nút này để tính lại tất cả.</p>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={fixAllWordCounts}
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
