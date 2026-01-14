"use client";

import React, { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DictionaryEntry } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Trash2, Download, Upload, Sparkles, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

const DIC_TYPES = [
    { value: "general", label: "Chung", color: "bg-slate-500" },
    { value: "name", label: "Tên riêng", color: "bg-blue-500" },
    { value: "location", label: "Vị trí", color: "bg-amber-600" },
    { value: "item", label: "Vật phẩm", color: "bg-purple-600" },
    { value: "skill", label: "Kỹ năng", color: "bg-rose-600" },
    { value: "cultivation", label: "Cấp bậc", color: "bg-cyan-600" },
    { value: "organization", label: "Tổ chức", color: "bg-indigo-600" },
    { value: "correction", label: "Sửa lỗi", color: "bg-red-500" },
    { value: "other", label: "Khác", color: "bg-slate-600" },
];

export function DictionaryTab({ workspaceId }: { workspaceId: string }) {
    const dictionary = useLiveQuery(() => db.dictionary.toArray()) || [];
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState<string>("all");

    // New Entry State
    const [isAdding, setIsAdding] = useState(false);
    const [newOriginal, setNewOriginal] = useState("");
    const [newTranslated, setNewTranslated] = useState("");
    const [newType, setNewType] = useState("general");

    const filteredDic = dictionary
        .filter(d => filterType === "all" || d.type === filterType)
        .filter(d =>
            d.original.toLowerCase().includes(search.toLowerCase()) ||
            d.translated.toLowerCase().includes(search.toLowerCase())
        );

    // Sorting: Newest first (assuming higher ID is newer)
    filteredDic.sort((a, b) => (b.id || 0) - (a.id || 0));

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
            console.log("Deleting dictionary ID:", id);
            // Force cast to number if needed, though TS says it's number
            const numericId = Number(id);
            if (!numericId) {
                console.error("Invalid ID:", id);
                return;
            }
            await db.dictionary.delete(numericId);
            // Optional: User feedback via toast instead of blocking alert
        } catch (e) {
            console.error("Delete failed:", e);
            alert("Lỗi khi xóa: " + e);
        }
    }

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

    const handleAIExtract = async () => {
        if (!workspaceId) return;
        setIsExtracting(true);
        try {
            // 1. Fetch text content (Latest Chapter or specific logic)
            // For now, let's grab the latest chapter
            const chapters = await db.chapters.where("workspaceId").equals(workspaceId).toArray();
            if (chapters.length === 0) {
                alert("Chưa có chương nào để phân tích!");
                setIsExtracting(false);
                return;
            }
            // Sort by order desc
            chapters.sort((a, b) => b.order - a.order);
            const targetChapter = chapters[0]; // Analyze latest

            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { extractGlossary } = require("@/lib/gemini");

            const result = await extractGlossary(targetChapter.content_original, (log: any) => console.log(log));

            if (result) {
                let addedCount = 0;
                // Process Characters
                for (const char of result.characters) {
                    const existing = await db.dictionary.where("original").equals(char.original).first();
                    if (!existing) {
                        await db.dictionary.add({
                            original: char.original,
                            translated: char.translated,
                            type: 'name', // Force type name for characters
                            gender: char.gender,
                            role: char.role,
                            description: char.description,
                            createdAt: new Date()
                        });
                        addedCount++;
                    }
                }

                // Process Terms
                for (const term of result.terms) {
                    const existing = await db.dictionary.where("original").equals(term.original).first();
                    if (!existing) {
                        await db.dictionary.add({
                            original: term.original,
                            translated: term.translated,
                            type: term.type as any,
                            createdAt: new Date()
                        });
                        addedCount++;
                    }
                }
                alert(`Trích xuất hoàn tất! Đã thêm ${addedCount} từ mới vào từ điển & nhân vật.`);
            } else {
                alert("AI không trả về kết quả nào.");
            }

        } catch (e) {
            console.error("Extraction error", e);
            alert("Lỗi khi trích xuất: " + e);
        } finally {
            setIsExtracting(false);
            setExtractDialogOpen(false);
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
            alert(`Import hoàn tất!\n- Thêm mới: ${addedCount}\n- Cập nhật: ${updatedCount}`);
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = '';
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                    <Button variant="outline" className="border-white/10 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 hidden sm:flex" onClick={handleAIExtract} disabled={isExtracting}>
                        <Sparkles className={cn("mr-2 h-4 w-4", isExtracting && "animate-spin")} /> {isExtracting ? "Đang xử lý..." : "Trích xuất AI"}
                    </Button>
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

            {/* Table */}
            <div className="rounded-md border border-white/10 bg-[#1e1e2e] overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/5 bg-[#2b2b40]/50 text-xs font-bold text-white/40 uppercase tracking-widest">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-3">Thuật ngữ gốc</div>
                    <div className="col-span-4">Bản dịch</div>
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
                            return (
                                <div key={entry.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors group">
                                    <div className="col-span-1 text-center text-white/30 text-xs font-mono">{filteredDic.length - index}</div>
                                    <div className="col-span-3 text-white/90 font-serif text-lg select-all">{entry.original}</div>
                                    <div className="col-span-4 text-emerald-400 font-bold select-all">{entry.translated}</div>
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
        </div>
    );
}
