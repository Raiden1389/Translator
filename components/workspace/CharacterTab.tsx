"use client";

import React from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ReviewDialog } from "./shared/ReviewDialog";
import { useCharacterManagement } from "./characters/useCharacterManagement";
import { CharacterToolbar } from "./characters/CharacterToolbar";
import { CharacterRow } from "./characters/CharacterRow";

export function CharacterTab({ workspaceId }: { workspaceId: string }) {
    const {
        dictionary,
        search,
        setSearch,
        isAdding,
        setIsAdding,
        newChar,
        setNewChar,
        selectedIds,
        setSelectedIds,
        isReviewOpen,
        setIsReviewOpen,
        filteredChars,
        toggleSelectAll,
        handleSelect,
        handleBulkDelete,
        handleConfirmSave,
        handleAdd,
        handleDelete,
        handleUpdate,
        handleExportJSON,
        handleImportJSON
    } = useCharacterManagement(workspaceId);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Toolbar */}
            <CharacterToolbar
                search={search}
                setSearch={setSearch}
                isAdding={isAdding}
                setIsAdding={setIsAdding}
                selectedCount={selectedIds.length}
                totalCount={dictionary.length}
                onImportJSON={handleImportJSON}
                onExportJSON={handleExportJSON}
                onBulkDelete={handleBulkDelete}
                onClearSelection={() => setSelectedIds([])} />

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

            {/* Table */}
            <div className="rounded-xl overflow-hidden border shadow-sm transition-colors duration-500 bg-card border-border">
                <div className="grid grid-cols-[40px_250px_1fr_36px] gap-4 px-4 py-3 border-b-2 text-[11px] font-semibold uppercase tracking-wider sticky top-0 z-20 shadow-sm transition-colors duration-500 bg-muted/50 border-border text-foreground/80">
                    <div className="flex justify-center items-center">
                        <Checkbox
                            checked={filteredChars.length > 0 && selectedIds.length === filteredChars.length}
                            onCheckedChange={toggleSelectAll}
                            className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                    </div>
                    <div className="px-2 flex items-center">Nhân vật (Việt / Trung)</div>
                    <div className="px-2 flex items-center">Mô tả đặc điểm / Tiểu sử</div>
                    <div />
                </div>

                <div className="divide-y divide-border max-h-[600px] overflow-y-auto custom-scrollbar">
                    {filteredChars.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground italic">
                            Chưa có nhân vật nào.
                        </div>
                    ) : (
                        filteredChars.map((char, index) => (
                            <CharacterRow
                                key={char.id}
                                char={char}
                                index={index}
                                isSelected={selectedIds.includes(char.id!)}
                                onSelect={handleSelect}
                                onUpdate={handleUpdate}
                                onDelete={handleDelete}
                            />
                        ))
                    )}
                </div>
            </div>

            <ReviewDialog
                open={isReviewOpen}
                onOpenChange={setIsReviewOpen}
                characters={[]}
                terms={[]}
                onSave={handleConfirmSave}
            />
        </div>
    );
}
