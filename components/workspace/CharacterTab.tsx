"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DictionaryEntry } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Trash2, Save, Download, Upload } from "lucide-react";
import { ReviewDialog } from "./ReviewDialog";
import { extractGlossary } from "@/lib/gemini";
import { GlossaryCharacter, GlossaryTerm } from "@/lib/types";
import type { Chapter } from "@/lib/db";
import { cn } from "@/lib/utils";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as Popover from "@radix-ui/react-popover";
import { toast } from "sonner";


export function CharacterTab({ workspaceId }: { workspaceId: string }) {
    const dictionary = useLiveQuery(() =>
        db.dictionary.where({ type: "name", workspaceId }).toArray(), [workspaceId]
    ) || [];

    const [search, setSearch] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    // New Character State
    const [newChar, setNewChar] = useState<Partial<DictionaryEntry>>({
        original: "",
        translated: "",
        gender: "male",
        role: "support", // Default to support as main is rare
        description: ""
    });
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // AI Extraction State (still used by ReviewDialog)
    const [pendingCharacters, setPendingCharacters] = useState<GlossaryCharacter[]>([]);
    const [pendingTerms, setPendingTerms] = useState<GlossaryTerm[]>([]);
    const [isReviewOpen, setIsReviewOpen] = useState(false);

    const filteredChars = dictionary
        .filter(d =>
            d.original.toLowerCase().includes(search.toLowerCase()) ||
            d.translated.toLowerCase().includes(search.toLowerCase())
        );

    // Sort by ID ascending (Default)
    filteredChars.sort((a, b) => (a.id || 0) - (b.id || 0));

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredChars.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredChars.map(c => c.id!));
        }
    };

    const handleSelect = (id: number, checked: boolean, shiftKey?: boolean) => {
        if (shiftKey && selectedIds.length > 0) {
            const lastId = selectedIds[selectedIds.length - 1];
            const lastIndex = filteredChars.findIndex(c => c.id === lastId);
            const currentIndex = filteredChars.findIndex(c => c.id === id);

            if (lastIndex !== -1 && currentIndex !== -1) {
                const start = Math.min(lastIndex, currentIndex);
                const end = Math.max(lastIndex, currentIndex);
                const rangeIds = filteredChars.slice(start, end + 1).map(c => c.id!);

                const newSelected = Array.from(new Set([...selectedIds, ...rangeIds]));
                setSelectedIds(newSelected);
                return;
            }
        }

        if (checked) {
            setSelectedIds(prev => Array.from(new Set([...prev, id])));
        } else {
            setSelectedIds(prev => prev.filter(i => i !== id));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        if (confirm(`Xóa ${selectedIds.length} nhân vật đã chọn?`)) {
            await db.dictionary.bulkDelete(selectedIds);
            setSelectedIds([]);
        }
    };

    const handleConfirmSave = async (
        selectedChars: GlossaryCharacter[],
        selectedTerms: GlossaryTerm[]
    ) => {
        try {
            let addedCount = 0;
            let updatedCount = 0;

            for (const char of selectedChars) {
                const existing = await db.dictionary.where({ original: char.original, workspaceId }).first();
                if (existing) {
                    await db.dictionary.update(existing.id!, {
                        translated: char.translated,
                        gender: char.gender as any,
                        role: char.role as any,
                        // Preserve existing description if it exists
                        description: existing.description || char.description,
                        createdAt: new Date()
                    });
                    updatedCount++;
                } else {
                    await db.dictionary.add({
                        workspaceId,
                        original: char.original,
                        translated: char.translated,
                        type: 'name',
                        gender: char.gender as any,
                        role: char.role as any,
                        description: char.description,
                        createdAt: new Date()
                    });
                    addedCount++;
                }
            }

            for (const term of selectedTerms) {
                const existing = await db.dictionary.where({ original: term.original, workspaceId }).first();
                if (existing) {
                    await db.dictionary.update(existing.id!, { translated: term.translated, type: term.type as any });
                    updatedCount++;
                } else {
                    await db.dictionary.add({ workspaceId, original: term.original, translated: term.translated, type: term.type as any, createdAt: new Date() });
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

    const handleAdd = async () => {
        if (!newChar.original || !newChar.translated) return;
        try {
            await db.dictionary.add({
                workspaceId,
                original: newChar.original,
                translated: newChar.translated,
                type: 'name',
                gender: newChar.gender as any,
                role: newChar.role as any,
                description: newChar.description,
                createdAt: new Date()
            });
            setIsAdding(false);
            setNewChar({ original: "", translated: "", gender: "male", role: "support", description: "" });
        } catch (e) {
            console.error(e);
            toast.error("Lỗi khi thêm nhân vật");
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm("Chắc chắn xóa nhân vật này?")) {
            await db.dictionary.delete(id);
        }
    };

    const handleUpdate = async (id: number, updates: Partial<DictionaryEntry>) => {
        await db.dictionary.update(id, updates);
    };

    const handleExportJSON = async () => {
        const fileName = `characters-export-${new Date().getTime()}.json`;
        const content = JSON.stringify(dictionary, null, 2);

        // 1. Try Tauri Native Save Dialog if available
        if (typeof window !== 'undefined' && (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
            try {
                const { save } = await import("@tauri-apps/plugin-dialog");
                const { writeTextFile } = await import("@tauri-apps/plugin-fs");

                const path = await save({
                    defaultPath: fileName,
                    filters: [{ name: 'JSON', extensions: ['json'] }]
                });

                if (path) {
                    await writeTextFile(path, content);
                    toast.success("Đã xuất danh sách nhân vật thành công!");
                    return;
                }
                return; // Canceled
            } catch (err) {
                console.error("Tauri Export Error:", err);
            }
        }

        // 2. Fallback to standard Browser download
        const blob = new Blob([content], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Đã xuất danh sách nhân vật thành công!");
    };

    const handleImportJSON = async () => {
        let text = "";

        // 1. Try Tauri Native Dialog if available
        if (typeof window !== 'undefined' && (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
            try {
                const { open } = await import("@tauri-apps/plugin-dialog");
                const { readTextFile } = await import("@tauri-apps/plugin-fs");

                const selected = await open({
                    filters: [{ name: 'JSON', extensions: ['json'] }],
                    multiple: false
                });

                if (selected && typeof selected === 'string') {
                    text = await readTextFile(selected);
                } else if (selected && typeof selected === 'object' && 'path' in selected) {
                    text = await readTextFile((selected as { path: string }).path);
                } else {
                    return; // Canceled
                }
            } catch (err) {
                console.error("Tauri Import Error:", err);
                toast.error("Lỗi khi mở file JSON.");
                return;
            }
        } else {
            // 2. Fallback to standard file input for web
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    text = await file.text();
                    await processJSONImport(text);
                }
            };
            input.click();
            return;
        }

        await processJSONImport(text);

        async function processJSONImport(jsonText: string) {
            try {
                const data = JSON.parse(jsonText);
                if (!Array.isArray(data)) {
                    toast.error("Định dạng JSON không hợp lệ.");
                    return;
                }

                let imported = 0;
                let updated = 0;

                for (const item of data) {
                    if (!item.original || !item.translated) continue;

                    const existing = await db.dictionary
                        .where('[workspaceId+original]')
                        .equals([workspaceId, item.original])
                        .first();

                    if (existing) {
                        await db.dictionary.update(existing.id!, {
                            translated: item.translated,
                            type: 'name',
                            gender: item.gender,
                            role: item.role,
                            description: item.description,
                            createdAt: new Date()
                        });
                        updated++;
                    } else {
                        await db.dictionary.add({
                            workspaceId,
                            original: item.original,
                            translated: item.translated,
                            type: 'name',
                            gender: item.gender,
                            role: item.role,
                            description: item.description,
                            createdAt: new Date()
                        });
                        imported++;
                    }
                }

                toast.success(`Nhập thành công: ${imported} mới, ${updated} cập nhật.`);
            } catch (err) {
                console.error(err);
                toast.error("Lỗi khi nhập file JSON.");
            }
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex gap-2 items-center w-full md:w-auto">
                    <div className="relative flex-1 md:w-[450px]">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-background border-border text-foreground"
                            placeholder="Tìm kiếm nhân vật..."
                        />
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className="border-border text-primary hover:text-primary/80 hover:bg-primary/10"
                        onClick={handleImportJSON}
                        title="Nhập danh sách nhân vật từ file JSON"
                    >
                        <Download className="mr-2 h-4 w-4" /> Nhập JSON
                    </Button>

                    <Button
                        variant="outline"
                        className="border-border text-emerald-600 hover:text-emerald-500 hover:bg-emerald-500/10"
                        onClick={handleExportJSON}
                        title="Xuất danh sách nhân vật ra file JSON"
                    >
                        <Upload className="mr-2 h-4 w-4" /> Xuất JSON
                    </Button>

                    <Button
                        size="icon"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={() => setIsAdding(!isAdding)}
                        title="Thêm nhân vật mới"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Quick Add Form */}
            {isAdding && (
                <div className="bg-primary/10 p-4 rounded-lg border border-primary/30 shadow-lg grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-12 md:col-span-2 space-y-1">
                        <label className="text-xs text-muted-foreground">Tên Gốc</label>
                        <Input
                            value={newChar.original}
                            onChange={e => setNewChar({ ...newChar, original: e.target.value })}
                            className="bg-background border-border"
                            autoFocus
                        />
                    </div>
                    <div className="col-span-12 md:col-span-3 space-y-1">
                        <label className="text-xs text-muted-foreground">Tên Dịch</label>
                        <Input
                            value={newChar.translated}
                            onChange={e => setNewChar({ ...newChar, translated: e.target.value })}
                            className="bg-background border-border font-bold text-emerald-400"
                        />
                    </div>
                    <div className="col-span-12 md:col-span-7 flex gap-2">
                        <div className="flex-1 space-y-1">
                            <label className="text-xs text-muted-foreground">Mô tả (VD: Tự xưng ta...)</label>
                            <Input
                                value={newChar.description}
                                onChange={e => setNewChar({ ...newChar, description: e.target.value })}
                                className="bg-background border-border text-xs"
                            />
                        </div>
                        <Button className="bg-primary mb-[2px]" size="icon" onClick={handleAdd}><Save className="h-4 w-4" /></Button>
                    </div>
                </div>
            )}

            {/* Bulk Actions Toolbar */}
            {selectedIds.length > 0 && (
                <div className="flex items-center gap-4 bg-primary/20 p-2 px-4 rounded-lg border border-primary/50 mb-4 animate-in slide-in-from-top-2">
                    <span className="text-sm font-medium text-foreground">{selectedIds.length} đã chọn</span>
                    <Button size="sm" variant="destructive" className="h-8 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50" onClick={handleBulkDelete}>
                        <Trash2 className="mr-2 h-4 w-4" /> Xóa hàng loạt
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground" onClick={() => setSelectedIds([])}>
                        Hủy chọn
                    </Button>
                </div>
            )}

            {/* Table */}
            <div className="rounded-md border border-border bg-card overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-muted/50 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    <div className="col-span-1 flex justify-center items-center gap-2">
                        <Checkbox
                            checked={filteredChars.length > 0 && selectedIds.length === filteredChars.length}
                            onCheckedChange={toggleSelectAll}
                            className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <span className="text-[10px]">#</span>
                    </div>
                    <div className="col-span-3">Tên Gốc</div>
                    <div className="col-span-4">Tên Dịch</div>
                    <div className="col-span-4 text-right pr-10">Mô Tả / Action</div>
                </div>

                <div className="divide-y divide-border max-h-[600px] overflow-y-auto custom-scrollbar">
                    {filteredChars.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground italic">
                            Chưa có nhân vật nào.
                        </div>
                    ) : (
                        filteredChars.map((char, index) => {
                            const isSelected = selectedIds.includes(char.id!);

                            return (
                                <div
                                    key={char.id}
                                    className={cn(
                                        "grid grid-cols-12 gap-4 p-4 items-start transition-colors group",
                                        isSelected ? "bg-primary/10" : "hover:bg-muted"
                                    )}
                                >
                                    <div className="col-span-1 flex justify-center items-center gap-2 h-8">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={(checked) => handleSelect(char.id!, !!checked)}
                                            className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        />
                                        <span className="text-muted-foreground text-[10px] font-mono w-4 text-center">{index + 1}</span>
                                    </div>
                                    <div className="col-span-3 text-foreground font-serif select-text flex items-center h-8">{char.original}</div>
                                    <div className="col-span-4 h-8 flex items-center">
                                        <Input
                                            className="h-full w-full bg-background border-none focus:ring-1 focus:ring-emerald-500 text-emerald-400 font-bold px-2 py-0"
                                            defaultValue={char.translated}
                                            onBlur={(e) => {
                                                if (e.target.value !== char.translated) {
                                                    handleUpdate(char.id!, { translated: e.target.value });
                                                    toast.success(`Đã cập nhật: ${char.original}`);
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    (e.target as HTMLInputElement).blur();
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="col-span-4 flex items-center justify-end gap-2 pr-2 h-8">
                                        <div className="flex-1 overflow-hidden">
                                            <Tooltip.Provider delayDuration={200}>
                                                <Tooltip.Root>
                                                    <Tooltip.Trigger asChild>
                                                        <div className="w-full">
                                                            <Popover.Root>
                                                                <Popover.Trigger asChild>
                                                                    <div className="text-xs text-muted-foreground truncate cursor-pointer hover:text-foreground transition-colors text-left px-2 py-1 rounded hover:bg-muted">
                                                                        {char.description || "Thêm mô tả..."}
                                                                    </div>
                                                                </Popover.Trigger>
                                                                <Popover.Content
                                                                    className="bg-popover border border-border p-3 rounded-md shadow-2xl w-[300px] z-50 animate-in fade-in zoom-in-95 duration-200"
                                                                    side="left"
                                                                    align="center"
                                                                >
                                                                    <div className="space-y-2">
                                                                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mô tả nhân vật</h4>
                                                                        <Textarea
                                                                            className="min-h-[100px] bg-background border-border text-xs text-foreground focus:border-primary resize-none"
                                                                            value={char.description || ""}
                                                                            onChange={e => handleUpdate(char.id!, { description: e.target.value })}
                                                                            placeholder="Nhập mô tả chi tiết..."
                                                                        />
                                                                        <div className="flex justify-end pt-1">
                                                                            <Popover.Close asChild>
                                                                                <Button size="sm" variant="ghost" className="h-6 text-[10px] hover:bg-muted text-muted-foreground hover:text-foreground">Đóng</Button>
                                                                            </Popover.Close>
                                                                        </div>
                                                                    </div>
                                                                    <Popover.Arrow className="fill-border" />
                                                                </Popover.Content>
                                                            </Popover.Root>
                                                        </div>
                                                    </Tooltip.Trigger>
                                                    {char.description && (
                                                        <Tooltip.Portal>
                                                            <Tooltip.Content
                                                                className="max-w-[400px] bg-slate-900 text-white p-2 rounded text-[11px] shadow-xl border border-white/10 z-100 animate-in fade-in zoom-in-95"
                                                                sideOffset={5}
                                                            >
                                                                {char.description}
                                                                <Tooltip.Arrow className="fill-slate-900" />
                                                            </Tooltip.Content>
                                                        </Tooltip.Portal>
                                                    )}
                                                </Tooltip.Root>
                                            </Tooltip.Provider>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-white/20 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                            onClick={() => handleDelete(char.id!)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Review Dialog */}
            <ReviewDialog
                open={isReviewOpen}
                onOpenChange={setIsReviewOpen}
                characters={pendingCharacters}
                terms={pendingTerms}
                onSave={handleConfirmSave}
            />
        </div>
    );
}
