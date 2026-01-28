"use client"

import React, { useState, useMemo, useEffect } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { dictionaryRepo } from "@/lib/repositories/dictionary"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Trash2, Download, Search, Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface DictionaryTabProps {
    workspaceId?: string;
}

// Simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export function DictionaryTab({ workspaceId }: DictionaryTabProps) {
    const [searchText, setSearchText] = useState("");
    const debouncedSearch = useDebounce(searchText, 300);

    const [newOriginal, setNewOriginal] = useState("");
    const [newTranslated, setNewTranslated] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Optimized: Use repository logic within useLiveQuery
    const entries = useLiveQuery(
        () => dictionaryRepo.getByWorkspace(workspaceId),
        [workspaceId],
        []
    );

    // Optimized: Memoize filtering based on debounced search
    const filteredDic = useMemo(() => {
        const query = debouncedSearch.toLowerCase().trim();
        if (!query) return entries;
        return entries.filter(entry =>
            entry.original.toLowerCase().includes(query) ||
            entry.translated.toLowerCase().includes(query)
        );
    }, [entries, debouncedSearch]);

    const handleAddDic = async () => {
        const original = newOriginal.trim();
        const translated = newTranslated.trim();

        if (!original || !translated) return;
        setIsSaving(true);

        let targetWsId = workspaceId;
        if (!targetWsId) {
            const firstWs = await db.workspaces.limit(1).toArray();
            if (firstWs.length > 0) {
                targetWsId = firstWs[0].id;
            }
        }

        if (!targetWsId) {
            toast.error("Không tìm thấy workspace để thêm từ.");
            setIsSaving(false);
            return;
        }

        try {
            await dictionaryRepo.upsert(targetWsId, original, translated);
            toast.success("Đã cập nhật từ điển.");
            setNewOriginal("");
            setNewTranslated("");
        } catch (e) {
            console.error("Failed to add", e);
            toast.error("Lỗi khi lưu từ điển.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteDic = async (id: number) => {
        try {
            await dictionaryRepo.delete(id);
            toast.success("Đã xóa.");
        } catch (e) {
            toast.error("Lỗi khi xóa.");
        }
    };

    const handleExportDic = async () => {
        if (entries.length === 0) {
            toast.info("Từ điển trống, không có gì để xuất.");
            return;
        }

        const text = entries.map(e => `${e.original}=${e.translated}`).join("\n");
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `dictionary-${workspaceId || 'global'}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Đã xuất file từ điển.");
    };

    return (
        <div className="space-y-4 py-4 min-h-[400px]">
            {/* Actions Row */}
            <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-white/40" />
                    <Input
                        className="pl-9 bg-[#2b2b40] border-white/10 text-white focus-visible:ring-primary h-9 text-xs"
                        placeholder="Tìm kiếm từ..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                </div>
                <Button
                    variant="outline"
                    className="border-white/10 text-white/70 hover:bg-white/10 h-9 transition-colors text-xs"
                    onClick={handleExportDic}
                    disabled={entries.length === 0}
                >
                    <Download className="mr-2 h-4 w-4" /> Export Project
                </Button>
            </div>

            {/* Quick Add Row */}
            <div className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 shadow-inner">
                <div className="col-span-12 sm:col-span-5">
                    <Input
                        placeholder="Từ gốc (Trung)"
                        className="bg-[#1a0b2e] border-white/10 text-white h-9 text-sm font-serif focus-visible:ring-indigo-500"
                        value={newOriginal}
                        onChange={(e) => setNewOriginal(e.target.value)}
                    />
                </div>
                <div className="col-span-12 sm:col-span-5">
                    <Input
                        placeholder="Nghĩa (Việt)"
                        className="bg-[#1a0b2e] border-white/10 text-white h-9 text-sm font-bold focus-visible:ring-indigo-500"
                        value={newTranslated}
                        onChange={(e) => setNewTranslated(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddDic()}
                    />
                </div>
                <div className="col-span-12 sm:col-span-2">
                    <Button
                        size="sm"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-9 shadow-md shadow-indigo-900/20"
                        onClick={handleAddDic}
                        disabled={isSaving || !newOriginal.trim() || !newTranslated.trim()}
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Thêm</>}
                    </Button>
                </div>
            </div>

            {/* List Header */}
            <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-white/40 px-3 uppercase tracking-[0.2em]">
                <div className="col-span-5">Original (CH)</div>
                <div className="col-span-6">Translated (VN)</div>
                <div className="col-span-1 text-right">Act</div>
            </div>

            <ScrollArea className="h-[300px] w-full rounded-md border border-white/10 bg-[#2b2b40]/50 p-1">
                {filteredDic.length === 0 ? (
                    <div className="text-center text-white/30 text-sm italic py-20">
                        {entries.length === 0 ? "Chưa có dữ liệu từ điển" : "Không tìm thấy kết quả"}
                    </div>
                ) : (
                    <div className="divide-y divide-white/5 px-2">
                        {filteredDic.map((entry) => (
                            <div key={entry.id} className="grid grid-cols-12 gap-2 items-center text-sm group hover:bg-white/5 py-2 px-2 rounded transition-all">
                                <div className="col-span-5 text-white font-medium font-serif select-text truncate" title={entry.original}>{entry.original}</div>
                                <div className="col-span-6 text-emerald-400 font-bold select-text truncate" title={entry.translated}>{entry.translated}</div>
                                <div className="col-span-1 text-right">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-white/10 hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
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
        </div>
    );
}
