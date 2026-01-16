"use client";

import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DictionaryEntry, BlacklistEntry } from "@/lib/db"; // Assuming BlacklistEntry exists
import { categorizeTerms, translateTerms } from "@/lib/gemini";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Trash2, Download, Upload, Sparkles, Filter, ShieldBan, RotateCcw, User, Save, FileText, MoreHorizontal } from "lucide-react";
import { ReviewDialog } from "./ReviewDialog";
import { extractGlossary } from "@/lib/gemini";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "lucide-react"; // Wait, Badge is usually a component, let's check if I have it. I'll use div for now.

const DIC_TYPES = [
    { value: "general", label: "Chung", color: "bg-slate-500" },
    { value: "name", label: "Tên riêng", color: "bg-blue-500" },
    { value: "location", label: "Vị trí", color: "bg-amber-600" },
    { value: "item", label: "Vật phẩm", color: "bg-purple-600" },
    { value: "beast", label: "Yêu thú", color: "bg-orange-600" },
    { value: "plant", label: "Dược thảo", color: "bg-green-600" },
    { value: "skill", label: "Kỹ năng", color: "bg-rose-600" },
    { value: "cultivation", label: "Cấp bậc", color: "bg-cyan-600" },
    { value: "organization", label: "Tổ chức", color: "bg-indigo-600" },
    { value: "correction", label: "Sửa lỗi", color: "bg-red-500" },
    { value: "other", label: "Khác", color: "bg-slate-600" },
];

export function DictionaryTab({ workspaceId }: { workspaceId: string }) {
    const dictionary = useLiveQuery(() => db.dictionary.toArray()) || [];
    const blacklist = useLiveQuery(() => db.blacklist.toArray()) || [];
    const corrections = useLiveQuery(() => db.corrections.toArray()) || [];

    // Tab State
    const [activeTab, setActiveTab] = useState("dictionary");

    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState<string>("all");
    const [blacklistSearch, setBlacklistSearch] = useState("");
    const [selectedBlacklist, setSelectedBlacklist] = useState<number[]>([]);

    // Correction State
    const [correctionSearch, setCorrectionSearch] = useState("");
    const [newWrong, setNewWrong] = useState("");
    const [newRight, setNewRight] = useState("");

    // New Entry State
    const [isAdding, setIsAdding] = useState(false);
    const [newOriginal, setNewOriginal] = useState("");
    const [newTranslated, setNewTranslated] = useState("");
    const [newType, setNewType] = useState("general");

    const [selectedEntries, setSelectedEntries] = useState<number[]>([]);

    const filteredDic = dictionary
        .filter(d => d.type !== 'name') // Exclude characters
        .filter(d => filterType === "all" || d.type === filterType)
        .filter(d =>
            d.original.toLowerCase().includes(search.toLowerCase()) ||
            d.translated.toLowerCase().includes(search.toLowerCase())
        );

    // Sorting: Oldest first (Ascending ID)
    filteredDic.sort((a, b) => (a.id || 0) - (b.id || 0));

    const handleBulkDelete = async () => {
        if (!selectedEntries.length) return;
        if (confirm(`Xóa ${selectedEntries.length} mục đã chọn?`)) {
            await db.dictionary.bulkDelete(selectedEntries);
            setSelectedEntries([]);
        }
    };

    const handleBulkUpdateType = async (type: string) => {
        if (!selectedEntries.length) return;
        await db.dictionary.where('id').anyOf(selectedEntries).modify({ type: type as any });
    };

    const handleBulkAICategorize = async () => {
        if (!selectedEntries.length) return;
        setIsExtracting(true); // Reuse loading state
        try {
            const entries = await db.dictionary.where('id').anyOf(selectedEntries).toArray();
            const terms = entries.map(e => e.original);

            // Chunking if too many (e.g., 50 per request)
            const chunkSize = 50;
            for (let i = 0; i < terms.length; i += chunkSize) {
                const chunk = terms.slice(i, i + chunkSize);
                const results = await categorizeTerms(chunk);

                // Update DB
                for (const res of results) {
                    if (res.category === 'trash') {
                        const entry = await db.dictionary.where('original').equals(res.original).first();
                        await db.blacklist.add({
                            word: res.original,
                            translated: entry?.translated || res.original, // Use existing translation if available
                            source: 'ai',
                            createdAt: new Date()
                        });
                        await db.dictionary.where('original').equals(res.original).delete();
                    } else {
                        await db.dictionary.where('original').equals(res.original).modify({ type: res.category as any });
                    }
                }
            }
            setSelectedEntries([]); // Optional: clear selection on success
        } catch (error) {
            console.error(error);
            toast.error("Lỗi AI phân loại");
        } finally {
            setIsExtracting(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedEntries.length === filteredDic.length) {
            setSelectedEntries([]);
        } else {
            setSelectedEntries(filteredDic.map(d => d.id!));
        }
    };

    const handleAdd = async () => {
        if (!newOriginal || !newTranslated) return;
        try {
            // Check existing
            const existing = await db.dictionary.where("original").equals(newOriginal).first();
            if (existing) {
                await db.dictionary.update(existing.id!, {
                    translated: newTranslated,
                    type: newType as any,
                    createdAt: new Date()
                });
            } else {
                await db.dictionary.add({
                    original: newOriginal,
                    translated: newTranslated,
                    type: newType as any,
                    createdAt: new Date()
                });
            }
            // Reset
            setNewOriginal("");
            setNewTranslated("");
            setNewType("general");
            setIsAdding(false);
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdateType = async (id: number, type: string) => {
        await db.dictionary.update(id, { type: type as any });
    }

    const handleDelete = async (id: number) => {
        try {
            const item = await db.dictionary.get(id);
            if (item) {
                // Auto-add to Blacklist (Manual Source)
                await db.blacklist.add({
                    word: item.original,
                    translated: item.translated,
                    source: 'manual',
                    createdAt: new Date()
                });
                await db.dictionary.delete(id);
            }
        } catch (e) {
            console.error("Delete failed:", e);
        }
    }


    // Blacklist Logic
    const filteredBlacklist = blacklist.filter(b =>
        b.word.toLowerCase().includes(blacklistSearch.toLowerCase()) ||
        (b.translated && b.translated.toLowerCase().includes(blacklistSearch.toLowerCase()))
    );
    filteredBlacklist.sort((a, b) => (b.id || 0) - (a.id || 0)); // Newest first

    const handleRestoreBlacklist = async (id: number) => {
        const item = blacklist.find(b => b.id === id);
        if (!item) return;

        await db.blacklist.delete(id);

        // Quick Restore: Add back to dictionary if not duplicates
        const existing = await db.dictionary.where("original").equals(item.word).first();
        if (!existing) {
            await db.dictionary.add({
                original: item.word,
                translated: item.translated || item.word,
                type: 'general',
                createdAt: new Date()
            });
        }
    };

    const handleBulkRestoreBlacklist = async () => {
        if (!selectedBlacklist.length) return;
        if (confirm(`Khôi phục (Bỏ chặn) ${selectedBlacklist.length} từ?`)) {
            const itemsToRestore = blacklist.filter(b => selectedBlacklist.includes(b.id!));
            await db.blacklist.bulkDelete(selectedBlacklist);

            // Bulk Restore to Dictionary
            const now = new Date();
            for (const item of itemsToRestore) {
                const existing = await db.dictionary.where("original").equals(item.word).first();
                if (!existing) {
                    await db.dictionary.add({
                        original: item.word,
                        translated: item.translated || item.word,
                        type: 'general',
                        createdAt: now
                    });
                }
            }
            setSelectedBlacklist([]);
        }
    };

    const handleTranslateBlacklist = async () => {
        // Find items in blacklist that have no translation or translation is same as word (Chinese)
        const missingMeanings = blacklist.filter(b => !b.translated || b.translated === b.word);
        if (missingMeanings.length === 0) {
            toast.info("Tất cả các mục đều đã có nghĩa dịch.");
            return;
        }

        setIsExtracting(true); // Reuse loading state
        try {
            const termsToTranslate = missingMeanings.map(b => b.word);
            // Chunk by 50
            const chunkSize = 50;
            for (let i = 0; i < termsToTranslate.length; i += chunkSize) {
                const chunk = termsToTranslate.slice(i, i + chunkSize);
                const results = await translateTerms(chunk);

                // Update DB
                for (const res of results) {
                    const item = missingMeanings.find(b => b.word === res.original);
                    if (item) {
                        await db.blacklist.update(item.id!, { translated: res.translated });
                    }
                }
            }
            toast.success(`Đã cập nhật nghĩa cho ${missingMeanings.length} mục trong Blacklist.`);
        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi dịch Blacklist");
        } finally {
            setIsExtracting(false);
        }
    };

    const handleBlacklistExport = () => {
        // Prepare data with translated field
        const data = blacklist.map(e => ({
            word: e.word,
            translated: e.translated,
            source: e.source,
            createdAt: e.createdAt
        }));
        const text = data.map(e => JSON.stringify(e)).join("\n");
        const blob = new Blob([text], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "blacklist.json";
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleBlacklistImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            const lines = text.split(/\r?\n/);
            let added = 0;
            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const entry = JSON.parse(line);
                    const exists = await db.blacklist.where('word').equals(entry.word).first();
                    if (!exists) {
                        await db.blacklist.add({
                            word: entry.word,
                            translated: entry.translated, // Added translated
                            source: entry.source || 'manual',
                            createdAt: new Date(entry.createdAt || Date.now())
                        });
                        added++;
                    }
                } catch (err) { }
            }
            toast.success(`Đã import ${added} từ vào Blacklist.`);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleExport = async () => {
        const text = dictionary.map(e => `${e.original}=${e.translated}`).join("\n");
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "vp.txt";
        a.click();
        URL.revokeObjectURL(url);
    }

    // AI Extraction State
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractDialogOpen, setExtractDialogOpen] = useState(false);

    // Pending Review State
    const [pendingCharacters, setPendingCharacters] = useState<any[]>([]);
    const [pendingTerms, setPendingTerms] = useState<any[]>([]);
    const [isReviewOpen, setIsReviewOpen] = useState(false);

    const [extractSource, setExtractSource] = useState<"latest" | "current" | "select">("latest");

    const handleAIExtract = async (source: "latest" | "current" | "select") => {
        if (!workspaceId) return;
        setIsExtracting(true);
        try {
            const chapters = await db.chapters.where("workspaceId").equals(workspaceId).toArray();
            if (chapters.length === 0) {
                toast.warning("Chưa có chương nào để phân tích!");
                setIsExtracting(false);
                return;
            }

            let targetChapter: any;
            if (source === "latest") {
                chapters.sort((a, b) => b.order - a.order);
                targetChapter = chapters[0];
            } else if (source === "current") {
                // Heuristic for current: the one with the latest updatedAt or just the one with max ID
                // Ideally we'd have a 'lastVisitedChapterId' in workspace but let's use max ID for now
                chapters.sort((a, b) => b.id! - a.id!);
                targetChapter = chapters[0];
            }

            // For 'select', we'd need another step, but let's implement the logic for the chosen chapter
            if (!targetChapter) {
                toast.error("Không tìm thấy chương để quét.");
                setIsExtracting(false);
                return;
            }

            toast.info(`Đang quét: ${targetChapter.title}...`);
            const result = await extractGlossary(targetChapter.content_original, (log: string) => console.log(log));

            if (result) {
                const existingOriginals = new Set(dictionary.map(d => d.original));

                const newChars = result.characters.map((c: any) => ({
                    ...c,
                    isExisting: existingOriginals.has(c.original)
                }));

                const newTerms = result.terms.map((t: any) => ({
                    ...t,
                    isExisting: existingOriginals.has(t.original)
                }));

                setPendingCharacters(newChars);
                setPendingTerms(newTerms);
                setIsReviewOpen(true);
            } else {
                toast.info("AI không trả về kết quả nào.");
            }

        } catch (e: any) {
            console.error("Extraction error", e);
            toast.error("Lỗi khi trích xuất: " + e.message);
        } finally {
            setIsExtracting(false);
            setExtractDialogOpen(false);
        }
    };

    const handleConfirmSave = async (selectedChars: any[], selectedTerms: any[]) => {
        let addedCount = 0;
        let updatedCount = 0;

        try {
            // Save Characters
            for (const char of selectedChars) {
                const existing = await db.dictionary.where("original").equals(char.original).first();
                if (existing) {
                    await db.dictionary.update(existing.id!, {
                        translated: char.translated,
                        gender: char.gender,
                        role: char.role,
                        description: char.description,
                        createdAt: new Date()
                    });
                    updatedCount++;
                } else {
                    await db.dictionary.add({
                        original: char.original,
                        translated: char.translated,
                        type: 'name',
                        gender: char.gender,
                        role: char.role,
                        description: char.description,
                        createdAt: new Date()
                    });
                    addedCount++;
                }
            }

            // Save Terms
            for (const term of selectedTerms) {
                const existing = await db.dictionary.where("original").equals(term.original).first();
                if (existing) {
                    await db.dictionary.update(existing.id!, {
                        translated: term.translated,
                        type: term.type as any,
                        createdAt: new Date()
                    });
                    updatedCount++;
                } else {
                    await db.dictionary.add({
                        original: term.original,
                        translated: term.translated,
                        type: term.type as any,
                        createdAt: new Date()
                    });
                    addedCount++;
                }
            }

            toast.success(`Đã lưu ${addedCount + updatedCount} mục! (Thêm mới: ${addedCount}, Cập nhật: ${updatedCount})`);
            setIsReviewOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi lưu kết quả");
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            const lines = text.split(/\r?\n/);
            let addedCount = 0;
            let updatedCount = 0;

            for (const line of lines) {
                if (!line.trim() || !line.includes('=')) continue;
                const [original, ...rest] = line.split('=');
                const translated = rest.join('=').trim();
                const cleanOriginal = original.trim();

                if (!cleanOriginal || !translated) continue;

                // Create or Update
                const existing = await db.dictionary.where("original").equals(cleanOriginal).first();
                if (existing) {
                    if (existing.translated !== translated) {
                        await db.dictionary.update(existing.id!, { translated, type: 'term' });
                        updatedCount++;
                    }
                } else {
                    await db.dictionary.add({
                        original: cleanOriginal,
                        translated,
                        type: 'term',
                        createdAt: new Date()
                    });
                    addedCount++;
                }
            }
            toast.success(`Import hoàn tất!`, {
                description: `- Thêm mới: ${addedCount}\n- Cập nhật: ${updatedCount}`
            });
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = '';
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Tabs defaultValue="dictionary" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex items-center justify-between mb-6">
                    <TabsList className="bg-[#2b2b40] border border-white/10">
                        <TabsTrigger value="dictionary" className="data-[state=active]:bg-[#6c5ce7] data-[state=active]:text-white text-white/70">
                            Từ điển ({dictionary.filter(d => d.type !== 'name').length})
                        </TabsTrigger>
                        <TabsTrigger value="blacklist" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 text-white/50">
                            <ShieldBan className="w-3 h-3 mr-2" /> Blacklist ({blacklist.length})
                        </TabsTrigger>
                        <TabsTrigger value="corrections" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 text-white/50">
                            <RotateCcw className="w-3 h-3 mr-2" /> Chỉnh sửa ({corrections.length})
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="corrections" className="space-y-6 mt-0">
                    {/* Corrections Toolbar */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex gap-2 items-center w-full md:w-auto flex-1">
                            <div className="relative flex-1 md:w-[300px]">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                                <Input
                                    value={correctionSearch}
                                    onChange={(e) => setCorrectionSearch(e.target.value)}
                                    className="pl-9 bg-[#2b2b40] border-white/10 text-white"
                                    placeholder="Tìm kiếm..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Add Correction Form */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#2d1b4e] p-4 rounded-lg border border-amber-500/30 shadow-lg mb-4">
                        <div className="md:col-span-4">
                            <Input
                                placeholder="Từ sai (Ví dụ: Thiên Linh Kiếm)..."
                                className="bg-[#1a0b2e] border-white/10 text-white"
                                value={newWrong}
                                onChange={(e) => setNewWrong(e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-1 flex items-center justify-center text-white/30">
                            ➔
                        </div>
                        <div className="md:col-span-5">
                            <Input
                                placeholder="Từ đúng (Ví dụ: Thiên Minh Kiếm)..."
                                className="bg-[#1a0b2e] border-white/10 text-white font-bold"
                                value={newRight}
                                onChange={(e) => setNewRight(e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Button
                                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                                onClick={async () => {
                                    if (!newWrong || !newRight) return;
                                    await db.corrections.add({
                                        original: newWrong,
                                        replacement: newRight,
                                        createdAt: new Date()
                                    });
                                    setNewWrong("");
                                    setNewRight("");
                                    toast.success("Đã thêm quy tắc sửa lỗi!");
                                }}
                            >
                                Thêm
                            </Button>
                        </div>
                    </div>

                    {/* Corrections List */}
                    <div className="rounded-md border border-white/10 bg-[#1e1e2e] overflow-hidden">
                        <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
                            {corrections
                                .filter(c => c.original.toLowerCase().includes(correctionSearch.toLowerCase()) || c.replacement.toLowerCase().includes(correctionSearch.toLowerCase()))
                                .map((c) => (
                                    <div key={c.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 group">
                                        <div className="col-span-4 text-white/70 line-through decoration-red-500/50">{c.original}</div>
                                        <div className="col-span-1 text-center text-white/20">➔</div>
                                        <div className="col-span-5 text-emerald-400 font-bold">
                                            <EditableCell
                                                initialValue={c.replacement}
                                                onSave={(val) => db.corrections.update(c.id!, { replacement: val })}
                                            />
                                        </div>
                                        <div className="col-span-2 text-right">
                                            <Button
                                                size="sm" variant="ghost"
                                                className="h-8 w-8 p-0 text-white/30 hover:text-red-400 group-hover:bg-red-500/10"
                                                onClick={() => db.corrections.delete(c.id!)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            {corrections.length === 0 && <div className="p-8 text-center text-white/20 italic">Chưa có quy tắc sửa lỗi nào</div>}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="dictionary" className="space-y-6 mt-0">
                    {/* Toolbar */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex gap-2 items-center w-full md:w-auto">
                            <Select value={filterType} onValueChange={setFilterType}>
                                <SelectTrigger className="w-[150px] bg-[#2b2b40] border-white/10 text-white">
                                    <SelectValue placeholder="Tất cả loại" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#2b2b40] border-white/10 text-white">
                                    <SelectItem value="all">Tất cả loại</SelectItem>
                                    {DIC_TYPES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <div className="relative flex-1 md:w-[300px]">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 bg-[#2b2b40] border-white/10 text-white"
                                    placeholder="Tìm kiếm thuật ngữ..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 w-full md:w-auto justify-end">

                            <Button variant="outline" className="border-white/10 text-white/70 hover:text-white hover:bg-white/10 hidden sm:flex" onClick={() => document.getElementById('import-file')?.click()}>
                                <Upload className="mr-2 h-4 w-4" /> Import VP
                            </Button>
                            <input
                                type="file"
                                id="import-file"
                                className="hidden"
                                accept=".txt"
                                onChange={handleImport}
                            />
                            <Button variant="outline" className="border-white/10 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" onClick={handleExport}>
                                <Download className="mr-2 h-4 w-4" /> Export VP
                            </Button>

                            <Dialog open={extractDialogOpen} onOpenChange={setExtractDialogOpen}>
                                <Button
                                    onClick={() => setExtractDialogOpen(true)}
                                    className="bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white"
                                >
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Quét AI
                                </Button>
                                <DialogContent className="sm:max-w-[400px] bg-[#1e1e2e] border-white/10 text-white">
                                    <DialogHeader>
                                        <DialogTitle>Chọn nguồn quét AI</DialogTitle>
                                        <DialogDescription className="text-white/40">
                                            Mày muốn AI quét dữ liệu từ đâu để trích xuất nhân vật/thuật ngữ?
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <Button
                                            variant="outline"
                                            className="justify-start h-16 border-white/5 hover:bg-white/5 bg-transparent group"
                                            onClick={() => handleAIExtract("current")}
                                            disabled={isExtracting}
                                        >
                                            <div className="flex items-center gap-3 text-left">
                                                <div className="p-2 rounded bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-bold">Chương đang đọc</div>
                                                    <div className="text-xs text-white/30">Quét chương mày vừa mở gần đây nhất.</div>
                                                </div>
                                            </div>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="justify-start h-16 border-white/5 hover:bg-white/5 bg-transparent group"
                                            onClick={() => handleAIExtract("latest")}
                                            disabled={isExtracting}
                                        >
                                            <div className="flex items-center gap-3 text-left">
                                                <div className="p-2 rounded bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20">
                                                    <Sparkles className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-bold">Chương mới nhất</div>
                                                    <div className="text-xs text-white/30">Quét chương cuối cùng vừa đăng.</div>
                                                </div>
                                            </div>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="justify-start h-16 border-white/5 hover:bg-white/5 bg-transparent group"
                                            onClick={() => {
                                                setExtractDialogOpen(false);
                                                setActiveTab("chapters");
                                                toast.info("Mày hãy chọn các chương muốn quét ở danh sách rồi bấm Quét nhé!");
                                            }}
                                            disabled={isExtracting}
                                        >
                                            <div className="flex items-center gap-3 text-left">
                                                <div className="p-2 rounded bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20">
                                                    <MoreHorizontal className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-bold">Chọn từ danh sách</div>
                                                    <div className="text-xs text-white/30">Mày sang tab Chương để chọn nhiều chương.</div>
                                                </div>
                                            </div>
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            <Button
                                className="bg-[#6c5ce7] hover:bg-[#5b4cc4] text-white"
                                onClick={() => setIsAdding(!isAdding)}
                            >
                                <Plus className="mr-2 h-4 w-4" /> Thêm Thuật Ngữ
                            </Button>
                        </div>
                    </div>

                    {/* Quick Add Form */}
                    {isAdding && (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#2d1b4e] p-4 rounded-lg border border-[#6c5ce7]/30 shadow-lg mb-4">
                            <div className="md:col-span-3">
                                <Input
                                    placeholder="Thuật ngữ gốc (Trung)..."
                                    className="bg-[#1a0b2e] border-white/10 text-white font-serif"
                                    value={newOriginal}
                                    onChange={(e) => setNewOriginal(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="md:col-span-4">
                                <Input
                                    placeholder="Bản dịch (Việt)..."
                                    className="bg-[#1a0b2e] border-white/10 text-white font-bold"
                                    value={newTranslated}
                                    onChange={(e) => setNewTranslated(e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-3">
                                <Select value={newType} onValueChange={setNewType}>
                                    <SelectTrigger className="bg-[#1a0b2e] border-white/10 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#2b2b40] border-white/10 text-white">
                                        {DIC_TYPES.map(t => (
                                            <SelectItem key={t.value} value={t.value}>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${t.color}`} />
                                                    {t.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="md:col-span-2">
                                <Button className="w-full bg-[#6c5ce7] hover:bg-[#5b4cc4]" onClick={handleAdd}>Lưu</Button>
                            </div>
                        </div>
                    )}

                    {/* Bulk Actions Toolbar */}
                    {selectedEntries.length > 0 && (
                        <div className="flex items-center gap-4 bg-[#6c5ce7]/20 p-2 px-4 rounded-lg border border-[#6c5ce7]/50 mb-4 animate-in slide-in-from-top-2">
                            <span className="text-sm font-medium text-white">{selectedEntries.length} đã chọn</span>
                            <Button size="sm" variant="destructive" className="h-8 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50" onClick={handleBulkDelete}>
                                <Trash2 className="mr-2 h-4 w-4" /> Xóa hàng loạt
                            </Button>
                            <div className="h-6 w-px bg-white/10 mx-2" />
                            <Button variant="outline" size="sm" className="h-8 border-purple-500/30 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10" onClick={handleBulkAICategorize} disabled={isExtracting}>
                                <Sparkles className={cn("mr-2 h-3.5 w-3.5", isExtracting && "animate-spin")} /> {isExtracting ? "Đang xử lý..." : "AI Phân Loại"}
                            </Button>
                            <div className="h-6 w-px bg-white/10 mx-2" />
                            <Select onValueChange={handleBulkUpdateType}>
                                <SelectTrigger className="h-8 w-[180px] bg-[#2b2b40] border-white/10 text-white text-xs">
                                    <SelectValue placeholder="Đổi phân loại..." />
                                </SelectTrigger>
                                <SelectContent className="bg-[#2b2b40] border-white/10 text-white">
                                    {DIC_TYPES.map(t => (
                                        <SelectItem key={t.value} value={t.value}>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${t.color}`} />
                                                {t.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Table */}
                    <div className="rounded-md border border-white/10 bg-[#1e1e2e] overflow-hidden">
                        {/* Header */}
                        <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 bg-[#2b2b40]/50 text-xs font-bold text-white/40 uppercase tracking-widest">
                            <div className="col-span-1 flex justify-center">
                                <Checkbox
                                    checked={filteredDic.length > 0 && selectedEntries.length === filteredDic.length}
                                    onCheckedChange={toggleSelectAll}
                                    className="border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                                />
                            </div>
                            <div className="col-span-1 text-center">#</div>
                            <div className="col-span-3">Thuật ngữ gốc</div>
                            <div className="col-span-3">Bản dịch</div>
                            <div className="col-span-2">Phân loại</div>
                            <div className="col-span-2 text-right">Actions</div>
                        </div>

                        {/* Rows */}
                        <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
                            {filteredDic.length === 0 ? (
                                <div className="p-8 text-center text-white/20 italic">
                                    Chưa có dữ liệu từ điển
                                </div>
                            ) : (
                                filteredDic.map((entry, index) => {
                                    const typeInfo = DIC_TYPES.find(t => t.value === entry.type) || DIC_TYPES[0];
                                    const isSelected = selectedEntries.includes(entry.id!);
                                    return (
                                        <div key={entry.id} className={cn("grid grid-cols-12 gap-4 p-4 items-center transition-colors group", isSelected ? "bg-cyan-500/10 hover:bg-cyan-500/20" : "hover:bg-white/5")}>
                                            <div className="col-span-1 flex justify-center">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) setSelectedEntries([...selectedEntries, entry.id!]);
                                                        else setSelectedEntries(selectedEntries.filter(id => id !== entry.id));
                                                    }}
                                                    className="border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                                                />
                                            </div>
                                            <div className="col-span-1 text-center text-white/30 text-xs font-mono">{index + 1}</div>
                                            <div className="col-span-3 text-white/90 font-serif text-lg select-all">{entry.original}</div>
                                            <div className="col-span-3">
                                                <EditableCell
                                                    initialValue={entry.translated}
                                                    onSave={(val) => db.dictionary.update(entry.id!, { translated: val })}
                                                />
                                                {entry.description && (
                                                    <div className="text-[10px] text-white/40 italic mt-1 font-sans line-clamp-1" title={entry.description}>
                                                        {entry.description}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="col-span-2">
                                                <Select
                                                    value={entry.type}
                                                    onValueChange={(val) => handleUpdateType(entry.id!, val)}
                                                >
                                                    <SelectTrigger className="h-7 text-xs border-white/5 bg-white/5 text-white/70">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${typeInfo.color}`} />
                                                            <span>{typeInfo.label}</span>
                                                        </div>
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-[#2b2b40] border-white/10 text-white">
                                                        {DIC_TYPES.map(t => (
                                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="col-span-2 flex justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-white/20 hover:text-red-500 hover:bg-red-500/10"
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Prevent row click
                                                        handleDelete(entry.id!);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                    <div className="text-center text-xs text-white/20 mt-4">
                        Hiển thị {filteredDic.length} kết quả
                    </div>
                </TabsContent>

                <TabsContent value="blacklist" className="space-y-6 mt-0">
                    <div className="flex items-center justify-between">
                        <div className="relative flex-1 md:max-w-[300px]">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                            <Input
                                value={blacklistSearch}
                                onChange={(e) => setBlacklistSearch(e.target.value)}
                                className="pl-9 bg-[#2b2b40] border-white/10 text-white"
                                placeholder="Tìm trong Blacklist..."
                            />
                        </div>
                        <div className="flex gap-2 items-center">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-9 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                                onClick={handleTranslateBlacklist}
                                disabled={isExtracting}
                            >
                                <Sparkles className={cn("mr-2 h-4 w-4", isExtracting && "animate-spin")} />
                                {isExtracting ? "Đang dịch..." : "Dịch nghĩa"}
                            </Button>

                            <Button size="sm" variant="outline" className="h-9 border-white/10 text-white/50 hover:bg-white/10" onClick={() => document.getElementById('import-blacklist')?.click()}>
                                <Upload className="mr-2 h-4 w-4" /> Import
                            </Button>
                            <input type="file" id="import-blacklist" className="hidden" accept=".json" onChange={handleBlacklistImport} />

                            <Button size="sm" variant="outline" className="h-9 border-white/10 text-white/50 hover:bg-white/10" onClick={handleBlacklistExport}>
                                <Download className="mr-2 h-4 w-4" /> Export
                            </Button>

                            {selectedBlacklist.length > 0 && (
                                <>
                                    <div className="w-px h-6 bg-white/10 mx-2" />
                                    <Button size="sm" variant="outline" className="h-9 border-green-500/30 text-green-400 hover:bg-green-500/10" onClick={handleBulkRestoreBlacklist}>
                                        <RotateCcw className="mr-2 h-4 w-4" /> Khôi phục {selectedBlacklist.length} mục
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="rounded-md border border-white/10 bg-[#1e1e2e] overflow-hidden">
                        <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 bg-[#2b2b40]/50 text-xs font-bold text-white/40 uppercase tracking-widest">
                            <div className="col-span-1 flex justify-center">
                                <Checkbox
                                    checked={filteredBlacklist.length > 0 && selectedBlacklist.length === filteredBlacklist.length}
                                    onCheckedChange={() => {
                                        if (selectedBlacklist.length === filteredBlacklist.length) setSelectedBlacklist([]);
                                        else setSelectedBlacklist(filteredBlacklist.map(b => b.id!));
                                    }}
                                    className="border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                                />
                            </div>
                            <div className="col-span-1 text-center">#</div>
                            <div className="col-span-3">Từ bị chặn</div>
                            <div className="col-span-3">Nghĩa Việt</div>
                            <div className="col-span-2 text-center">Nguồn</div>
                            <div className="col-span-2 text-right">Hành động</div>
                        </div>

                        <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
                            {filteredBlacklist.length === 0 ? (
                                <div className="p-8 text-center text-white/20 italic">
                                    Blacklist trống. AI chưa dám sút ai cả.
                                </div>
                            ) : (
                                filteredBlacklist.map((item, index) => {
                                    const isSelected = selectedBlacklist.includes(item.id!);
                                    return (
                                        <div key={item.id} className={cn("grid grid-cols-12 gap-4 p-4 items-center transition-colors group", isSelected ? "bg-red-500/10" : "hover:bg-white/5")}>
                                            <div className="col-span-1 flex justify-center">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) setSelectedBlacklist([...selectedBlacklist, item.id!]);
                                                        else setSelectedBlacklist(selectedBlacklist.filter(id => id !== item.id));
                                                    }}
                                                    className="border-white/20 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                                                />
                                            </div>
                                            <div className="col-span-1 text-center text-white/30 text-xs font-mono">{index + 1}</div>
                                            <div className="col-span-3 text-red-300 font-medium truncate" title={item.word}>{item.word}</div>
                                            <div className="col-span-3 text-white/70 italic truncate" title={item.translated}>{item.translated || "---"}</div>
                                            <div className="col-span-2 text-center">
                                                <span className={cn("text-[10px] px-2 py-1 rounded-full border whitespace-nowrap",
                                                    item.source === 'ai' ? "border-purple-500/30 text-purple-400 bg-purple-500/10" : "border-slate-500/30 text-slate-400 bg-slate-500/10"
                                                )}>
                                                    {item.source === 'ai' ? '🤖 AI' : '👤 Manual'}
                                                </span>
                                            </div>
                                            <div className="col-span-2 flex justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-green-400 hover:text-green-300 hover:bg-green-500/10 pr-2"
                                                    onClick={() => handleRestoreBlacklist(item.id!)}
                                                    title="Khôi phục (Bỏ chặn)"
                                                >
                                                    <RotateCcw className="h-4 w-4 mr-1" /> Khôi phục
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Review Dialog */}
            <ReviewDialog
                open={isReviewOpen}
                onOpenChange={setIsReviewOpen}
                characters={pendingCharacters}
                terms={pendingTerms}
                onSave={handleConfirmSave}
            />

        </div >
    );
}


const EditableCell = ({ initialValue, onSave }: { initialValue: string, onSave: (val: string) => void }) => {
    const [value, setValue] = useState(initialValue);

    // Sync if external prop changes (e.g. bulk update)
    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    const handleBlur = () => {
        if (value !== initialValue) {
            onSave(value);
        }
    };

    return (
        <Input
            className="h-8 bg-transparent border-transparent hover:border-white/10 focus:border-white/30 text-emerald-400 font-bold p-0 px-2 focus-visible:ring-0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.currentTarget.blur();
                }
            }}
        />
    );
};
