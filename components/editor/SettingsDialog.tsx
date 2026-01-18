"use client"

import { useState, useEffect } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Settings, Key, Database, Sparkles, Loader2, RefreshCw, BookA, Trash2, Download, Search, Plus } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AI_MODELS } from "@/lib/ai-models"
import { GoogleGenAI } from "@google/genai"
import { cn } from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SettingsDialogProps {
    workspaceId?: string;
    defaultTab?: string;
    trigger?: React.ReactNode;
}

export function SettingsDialog({ workspaceId, defaultTab = "ai", trigger }: SettingsDialogProps) {
    const [open, setOpen] = useState(false)
    const [primaryKey, setPrimaryKey] = useState("")
    const [poolKeys, setPoolKeys] = useState("")
    const [model, setModel] = useState("gemini-2.0-flash") // Default safe fallback
    const [availableModels, setAvailableModels] = useState<{ value: string, label: string }[]>(AI_MODELS);
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    // Key Check State
    const [checkingKeys, setCheckingKeys] = useState(false);
    const [keyStatuses, setKeyStatuses] = useState<{ key: string, status: 'valid' | 'invalid' | 'checking', ms?: number, error?: string }[]>([]);

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

    // ...

    // ...

    const [dicEntries, setDicEntries] = useState<any[]>([]);
    const [searchText, setSearchText] = useState("");
    const [newOriginal, setNewOriginal] = useState("");
    const [newTranslated, setNewTranslated] = useState("");

    // Load settings on open
    useEffect(() => {
        if (open) {
            loadSettings()
            loadDic()
        }
    }, [open])

    const loadSettings = async () => {
        const k1 = await db.settings.get("apiKeyPrimary")
        const k2 = await db.settings.get("apiKeyPool")
        const m = await db.settings.get("aiModel")

        if (k1) setPrimaryKey(k1.value)
        if (k2) setPoolKeys(k2.value)
        if (m) setModel(m.value)
    }

    const loadDic = async () => {
        const entries = await db.dictionary.toArray();
        setDicEntries(entries.reverse()); // Show newest first
    };

    const handleDeleteDic = async (id: number) => {
        await db.dictionary.delete(id);
        loadDic();
    }

    const handleAddDic = async () => {
        if (!newOriginal || !newTranslated) return;

        // Find a valid workspaceId if not provided (fallback to first available)
        let targetWsId = workspaceId;
        if (!targetWsId) {
            const firstWs = await db.workspaces.limit(1).toArray();
            if (firstWs.length > 0) {
                targetWsId = firstWs[0].id;
            }
        }

        if (!targetWsId) {
            alert("No workspace found to add dictionary entry.");
            return;
        }

        try {
            const existing = await db.dictionary.where("original").equals(newOriginal).first();
            if (existing) {
                await db.dictionary.update(existing.id!, { translated: newTranslated, createdAt: new Date() });
            } else {
                await db.dictionary.add({
                    workspaceId: targetWsId,
                    original: newOriginal,
                    translated: newTranslated,
                    type: 'term',
                    createdAt: new Date()
                });
            }
            setNewOriginal("");
            setNewTranslated("");
            loadDic();
        } catch (e) {
            console.error("Failed to add", e);
        }
    };

    const handleExportDic = async () => {
        const entries = await db.dictionary.toArray();
        const text = entries.map(e => `${e.original}=${e.translated}`).join("\n");
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "vp.txt";
        a.click();
        URL.revokeObjectURL(url);
    }



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
                // Use a lightweight model for checking
                const ai = new GoogleGenAI({ apiKey: key });

                // Use the selected model for checking, or fallback to a known stable model if empty
                const modelToUse = model || "gemini-2.0-flash-exp";
                await ai.models.generateContent({
                    model: modelToUse,
                    contents: "hi"
                });

                return { key, status: 'valid' as const, ms: Date.now() - start };
            } catch (e: any) {
                console.warn("Key Check Failed:", e);
                let errorMsg = e.message || e.toString();

                // Check specifically for expired keys to give a better message
                const isQuota = (e.status === 429) ||
                    (e.error?.code === 429) ||
                    errorMsg.includes("quota") ||
                    errorMsg.includes("RESOURCE_EXHAUSTED");

                if (isQuota) {
                    errorMsg = "Hết hạn mức (Quota Exceeded)";
                } else if (errorMsg.includes("API key expired") || (e.error && e.error.message && e.error.message.includes("API key expired")) || JSON.stringify(e).includes("API key expired")) {
                    errorMsg = "Key đã hết hạn";
                } else if (e.status) {
                    errorMsg = `${e.status} - ${e.statusText || errorMsg}`;
                }

                return { key, status: 'invalid' as const, error: errorMsg };
            }
        }));

        setKeyStatuses(results);
        setCheckingKeys(false);
    };

    const handleSave = async () => {
        await db.settings.put({ key: "apiKeyPrimary", value: primaryKey })
        await db.settings.put({ key: "apiKeyPool", value: poolKeys })
        await db.settings.put({ key: "aiModel", value: model })
        setOpen(false)
    }

    // Filter dictionary
    const filteredDic = dicEntries.filter(entry =>
        entry.original.toLowerCase().includes(searchText.toLowerCase()) ||
        entry.translated.toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
                        <Settings className="h-5 w-5" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] bg-[#1a0b2e] border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        Cài đặt Hệ thống
                    </DialogTitle>
                    <DialogDescription className="text-white/50">
                        Quản lý API Key, Model AI và các cấu hình dịch thuật.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue={defaultTab} className="w-full mt-4">
                    <TabsList className="grid w-full grid-cols-3 bg-[#2b2b40]">
                        <TabsTrigger value="ai" className="data-[state=active]:bg-primary data-[state=active]:text-white">AI / API Keys</TabsTrigger>
                        <TabsTrigger value="dic" className="data-[state=active]:bg-primary data-[state=active]:text-white">Từ điển ({dicEntries.length})</TabsTrigger>
                        <TabsTrigger value="general" className="data-[state=active]:bg-primary data-[state=active]:text-white">Cấu hình chung</TabsTrigger>
                    </TabsList>

                    <TabsContent value="ai" className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-indigo-300">
                                <Key className="h-4 w-4" /> Primary API Key (Gemini)
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="AIzaSy..."
                                    value={primaryKey}
                                    onChange={(e) => setPrimaryKey(e.target.value)}
                                    className="bg-[#2b2b40] border-white/10 text-white focus-visible:ring-primary flex-1"
                                />
                                <Button
                                    variant="outline"
                                    onClick={fetchModels}
                                    disabled={!primaryKey || isLoadingModels}
                                    className="border-white/10 hover:bg-white/10"
                                    title="Fetch Models"
                                    type="button"
                                >
                                    {isLoadingModels ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-white/40">Key chính dùng để khởi tạo và lấy danh sách Model.</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-indigo-300">
                                <Database className="h-4 w-4" />
                                Key Pool (Dự phòng)
                                <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-white/70">
                                    {poolKeys.split(/[\n,;]+/).filter(k => k.trim().length > 10).length} keys
                                </span>
                            </Label>
                            <Textarea
                                placeholder={`AIzaSy...
AIzaSy...`}
                                value={poolKeys}
                                onChange={(e) => setPoolKeys(e.target.value)}
                                className="bg-[#2b2b40] border-white/10 text-white focus-visible:ring-primary font-mono text-xs h-[150px]"
                            />
                            <p className="text-xs text-white/40">Mỗi dòng một Key. Hệ thống sẽ tự động chuyển Key khi hết quota (429 Error).</p>

                            {/* Key Checker UI */}
                            <div className="pt-2">
                                <Button size="sm" variant="secondary" onClick={checkAllKeys} disabled={checkingKeys} className="w-full bg-white/5 hover:bg-white/10 text-indigo-300 border border-indigo-500/20">
                                    {checkingKeys ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 h-4 w-4" />}
                                    Kiểm tra tình trạng toàn bộ Key
                                </Button>

                                {keyStatuses.length > 0 && (
                                    <div className="mt-2 space-y-1 max-h-[150px] overflow-y-auto p-2 bg-black/20 rounded border border-white/5">
                                        {keyStatuses.map((k, i) => (
                                            <div key={i} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-white/5">
                                                <div className="flex items-center gap-2 truncate max-w-[70%]">
                                                    <div className={cn("h-2 w-2 rounded-full",
                                                        k.status === 'valid' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" :
                                                            k.status === 'invalid' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                                                                "bg-yellow-500 animate-pulse"
                                                    )} />
                                                    <span className="font-mono text-white/70">{k.key.substring(0, 8)}...{k.key.substring(k.key.length - 4)}</span>
                                                </div>
                                                <div className="text-right max-w-[40%]">
                                                    {k.status === 'valid' ? (
                                                        <span className="text-green-400 font-mono">{k.ms}ms</span>
                                                    ) : k.status === 'invalid' ? (
                                                        <span className="text-red-400 text-[10px] break-all block leading-tight">{k.error || "Lỗi không xác định"}</span>
                                                    ) : (
                                                        <span className="text-YELLOW-400">...</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-indigo-300">
                                <Sparkles className="h-4 w-4" /> AI Model
                            </Label>
                            <Select value={model} onValueChange={setModel}>
                                <SelectTrigger className="bg-[#2b2b40] border-white/10 text-white">
                                    <SelectValue placeholder="Chọn Model" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#2b2b40] border-white/10 text-white">
                                    <SelectGroup>
                                        {availableModels.map((m) => (
                                            <SelectItem key={m.value} value={m.value} className="focus:bg-white/10 focus:text-white cursor-pointer hover:bg-white/10">
                                                {m.label}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>
                    </TabsContent>

                    <TabsContent value="dic" className="space-y-4 py-4 min-h-[400px]">
                        {/* Actions Row */}
                        <div className="flex gap-2 items-center">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-white/40" />
                                <Input
                                    className="pl-9 bg-[#2b2b40] border-white/10 text-white"
                                    placeholder="Tìm kiếm từ..."
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                />
                            </div>
                            <Button
                                variant="outline"
                                className="border-white/10 text-white/70 hover:bg-white/10"
                                onClick={handleExportDic}
                            >
                                <Download className="mr-2 h-4 w-4" /> Export
                            </Button>
                        </div>

                        {/* Quick Add Row */}
                        <div className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                            <div className="col-span-5">
                                <Input
                                    placeholder="Từ gốc (Trung)"
                                    className="bg-[#1a0b2e] border-white/10 text-white h-8 text-sm font-serif"
                                    value={newOriginal}
                                    onChange={(e) => setNewOriginal(e.target.value)}
                                />
                            </div>
                            <div className="col-span-5">
                                <Input
                                    placeholder="Nghĩa (Việt)"
                                    className="bg-[#1a0b2e] border-white/10 text-white h-8 text-sm font-bold"
                                    value={newTranslated}
                                    onChange={(e) => setNewTranslated(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddDic()}
                                />
                            </div>
                            <div className="col-span-2">
                                <Button
                                    size="sm"
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                                    onClick={handleAddDic}
                                >
                                    <Plus className="h-4 w-4" /> Thêm
                                </Button>
                            </div>
                        </div>

                        {/* List Header */}
                        <div className="grid grid-cols-12 gap-2 text-xs font-bold text-white/40 px-3 uppercase tracking-wider">
                            <div className="col-span-5">Original (Trung)</div>
                            <div className="col-span-6">Translated (Viet)</div>
                            <div className="col-span-1 text-right">Delete</div>
                        </div>

                        <ScrollArea className="h-[300px] w-full rounded-md border border-white/10 bg-[#2b2b40] p-4">
                            {filteredDic.length === 0 ? (
                                <div className="text-center text-white/30 text-sm italic pt-10">
                                    {dicEntries.length === 0 ? "Chưa có dữ liệu từ điển" : "Không tìm thấy kết quả"}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredDic.map((entry) => (
                                        <div key={entry.id} className="grid grid-cols-12 gap-2 items-center text-sm group hover:bg-white/5 p-2 rounded transition-colors">
                                            <div className="col-span-5 text-white font-medium font-serif select-all">{entry.original}</div>
                                            <div className="col-span-6 text-emerald-400 font-medium select-all">{entry.translated}</div>
                                            <div className="col-span-1 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-white/20 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                                    onClick={() => handleDeleteDic(entry.id!)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="general" className="py-10 text-center text-white/30">
                        Tính năng đang phát triển...
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} className="border-white/10 text-white/70 bg-transparent hover:bg-white/5 hover:text-white">Đóng</Button>
                    <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white">Lưu Cấu Hình</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
