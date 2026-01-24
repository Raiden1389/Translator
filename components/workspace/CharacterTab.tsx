"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DictionaryEntry } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Trash2, Save, MoreHorizontal, Sparkles, FileText } from "lucide-react";
import { ReviewDialog } from "./ReviewDialog";
import { extractGlossary } from "@/lib/gemini";
import { GlossaryCharacter, GlossaryTerm } from "@/lib/types";
import type { Chapter } from "@/lib/db";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
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
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionMode, setSelectionMode] = useState<boolean | null>(null); // true = selecting, false = deselecting

    // AI Extraction State
    const [isExtracting, setIsExtracting] = useState(false);
    const [pendingCharacters, setPendingCharacters] = useState<any[]>([]);
    const [pendingTerms, setPendingTerms] = useState<any[]>([]);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [extractDialogOpen, setExtractDialogOpen] = useState(false);

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
            setSelectedIds(prev => [...prev, id]);
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

            let targetChapter: Chapter | undefined;
            if (source === "latest") {
                chapters.sort((a, b) => b.order - a.order);
                targetChapter = chapters[0];
            } else if (source === "current") {
                chapters.sort((a, b) => b.id! - a.id!);
                targetChapter = chapters[0];
            }

            if (!targetChapter) {
                toast.error("Không tìm thấy chương để quét.");
                setIsExtracting(false);
                return;
            }

            toast.info(`Đang quét: ${targetChapter.title}...`);
            const result = await extractGlossary(targetChapter.content_original);

            if (result) {
                const existingOriginals = new Set(dictionary.map(d => d.original));
                const newChars: GlossaryCharacter[] = result.characters.map((c: any) => ({
                    ...c,
                    isExisting: existingOriginals.has(c.original)
                }));
                const newTerms: GlossaryTerm[] = result.terms.map((t: any) => ({
                    ...t,
                    isExisting: existingOriginals.has(t.original)
                }));
                setPendingCharacters(newChars);
                setPendingTerms(newTerms);
                setIsReviewOpen(true);
            }
        } catch (e: any) {
            console.error(e);
            toast.error("Lỗi khi trích xuất: " + e.message);
        } finally {
            setIsExtracting(false);
            setExtractDialogOpen(false);
        }
    };

    const handleConfirmSave = async (selectedChars: GlossaryCharacter[], selectedTerms: GlossaryTerm[]) => {
        try {
            let addedCount = 0;
            let updatedCount = 0;

            for (const char of selectedChars) {
                const existing = await db.dictionary.where({ original: char.original, workspaceId }).first();
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
                        workspaceId,
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
                    <Dialog open={extractDialogOpen} onOpenChange={setExtractDialogOpen}>
                        <Button
                            onClick={() => setExtractDialogOpen(true)}
                            className="bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300"
                        >
                            <Sparkles className="mr-2 h-4 w-4" />
                            Quét AI
                        </Button>
                        <DialogContent className="sm:max-w-[400px] bg-popover border-border text-popover-foreground">
                            <DialogHeader>
                                <DialogTitle>Chọn nguồn quét AI</DialogTitle>
                                <DialogDescription className="text-muted-foreground">
                                    Mày muốn AI quét dữ liệu từ đâu để trích xuất nhân vật?
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <Button
                                    variant="outline"
                                    className="justify-start h-16 border-border hover:bg-muted bg-transparent group"
                                    onClick={() => handleAIExtract("current")}
                                    disabled={isExtracting}
                                >
                                    <div className="flex items-center gap-3 text-left">
                                        <div className="p-2 rounded bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-bold">Chương đang đọc</div>
                                            <div className="text-xs text-muted-foreground">Quét chương mày vừa mở gần đây nhất.</div>
                                        </div>
                                    </div>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="justify-start h-16 border-border hover:bg-muted bg-transparent group"
                                    onClick={() => handleAIExtract("latest")}
                                    disabled={isExtracting}
                                >
                                    <div className="flex items-center gap-3 text-left">
                                        <div className="p-2 rounded bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20">
                                            <Sparkles className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-bold">Chương mới nhất</div>
                                            <div className="text-xs text-muted-foreground">Quét chương cuối cùng vừa đăng.</div>
                                        </div>
                                    </div>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="justify-start h-16 border-border hover:bg-muted bg-transparent group"
                                    onClick={() => {
                                        setExtractDialogOpen(false);
                                        // Since we don't have tab switching here easily without passing props, 
                                        // we'll just show a toast or rely on the user knowing.
                                        // Actually CharacterTab is usually inside a Tabs parent.
                                        toast.info("Mày hãy sang tab Chương, chọn các chương muốn quét rồi bấm Quét nhé!");
                                    }}
                                    disabled={isExtracting}
                                >
                                    <div className="flex items-center gap-3 text-left">
                                        <div className="p-2 rounded bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20">
                                            <MoreHorizontal className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-bold">Chọn từ danh sách</div>
                                            <div className="text-xs text-muted-foreground">Mày sang tab Chương để chọn nhiều chương.</div>
                                        </div>
                                    </div>
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Button
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={() => setIsAdding(!isAdding)}
                    >
                        <Plus className="mr-2 h-4 w-4" /> Thêm Nhân Vật
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
            <div className="rounded-md border border-border bg-card overflow-hidden"
                onMouseUp={() => { setIsSelecting(false); setSelectionMode(null); }}>
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
                                        "grid grid-cols-12 gap-4 p-4 items-center transition-colors group",
                                        isSelected ? "bg-primary/10" : "hover:bg-muted"
                                    )}
                                >
                                    <div className="col-span-1 flex justify-center items-center gap-2">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={(checked) => handleSelect(char.id!, !!checked)}
                                            onMouseDown={(e: any) => {
                                                if (e.button !== 0) return; // Only left click
                                                setIsSelecting(true);
                                                const nextMode = !isSelected;
                                                setSelectionMode(nextMode);
                                                handleSelect(char.id!, nextMode, e.shiftKey);
                                            }}
                                            onMouseEnter={() => {
                                                if (isSelecting && selectionMode !== null) {
                                                    handleSelect(char.id!, selectionMode);
                                                }
                                            }}
                                            className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        />
                                        <span className="text-muted-foreground text-[10px] font-mono w-4 text-center">{index + 1}</span>
                                    </div>
                                    <div className="col-span-3 text-foreground font-serif select-all">{char.original}</div>
                                    <div className="col-span-4">
                                        <Input
                                            className="h-8 bg-background border-none focus:ring-1 focus:ring-emerald-500 text-emerald-400 font-bold px-2 py-0"
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
                                    <div className="col-span-4 flex items-center justify-end gap-2 pr-2">
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
