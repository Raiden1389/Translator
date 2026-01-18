"use client";

import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { DictionaryToolbar } from "../DictionaryToolbar";
import { DictionaryAddForm } from "../DictionaryAddForm";
import { DictionaryBulkActions } from "../DictionaryBulkActions";
import { EditableCell } from "../../shared/EditableCell";
import { useDictionary } from "../hooks/useDictionary";
import { DIC_TYPES } from "../DictionaryToolbar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
import { ShieldBan, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { toast } from "sonner";

interface DictionaryViewProps {
    workspaceId: string;
    onChangeTab: (tab: string) => void;
}

export function DictionaryView({ workspaceId, onChangeTab }: DictionaryViewProps) {
    const {
        dictionary,
        filteredDic,
        search,
        setSearch,
        filterType,
        setFilterType,
        selectedEntries,
        setSelectedEntries,
        isAdding,
        setIsAdding,
        newOriginal,
        setNewOriginal,
        newTranslated,
        setNewTranslated,
        newType,
        setNewType,
        isExtracting,
        extractDialogOpen,
        setExtractDialogOpen,
        handleAdd,
        handleDelete,
        handleUpdateType,
        handleBulkDelete,
        handleBulkUpdateType,
        toggleSelectAll,
        handleBlacklist,
        handleImport,
        handleExport,
        handleAIExtract,
        handleBulkAICategorize,
    } = useDictionary(workspaceId);

    // Virtual scrolling setup
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: filteredDic.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 70, // Estimated row height
        overscan: 5, // Render 5 extra items above/below viewport
    });

    return (
        <div className="space-y-6">
            <DictionaryToolbar
                search={search}
                onSearchChange={setSearch}
                filterType={filterType}
                onFilterTypeChange={setFilterType}
                onImport={handleImport}
                onExport={handleExport}
                onAIExtract={(source) => handleAIExtract(source, dictionary)}
                isExtracting={isExtracting}
                extractDialogOpen={extractDialogOpen}
                onExtractDialogChange={setExtractDialogOpen}
                onAddClick={() => setIsAdding(!isAdding)}
                onSelectFromList={() => {
                    setExtractDialogOpen(false);
                    onChangeTab("chapters");
                    toast.info("Mày hãy chọn các chương muốn quét ở danh sách rồi bấm Quét nhé!");
                }}
            />

            {isAdding && (
                <DictionaryAddForm
                    newOriginal={newOriginal}
                    newTranslated={newTranslated}
                    newType={newType}
                    onOriginalChange={setNewOriginal}
                    onTranslatedChange={setNewTranslated}
                    onTypeChange={setNewType}
                    onAdd={handleAdd}
                />
            )}

            <DictionaryBulkActions
                selectedCount={selectedEntries.length}
                onBulkDelete={handleBulkDelete}
                onBulkAICategorize={() => handleBulkAICategorize(selectedEntries)}
                onBulkUpdateType={handleBulkUpdateType}
                isExtracting={isExtracting}
            />

            {/* Virtual Scrolling Table */}
            <div className="rounded-md border border-border bg-card overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-border bg-muted/50 text-xs font-bold text-muted-foreground uppercase tracking-widest sticky top-0 z-10">
                    <div className="col-span-1 flex justify-center">
                        <Checkbox
                            checked={filteredDic.length > 0 && selectedEntries.length === filteredDic.length}
                            onCheckedChange={toggleSelectAll}
                            className="border-border data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                        />
                    </div>
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-3">Thuật ngữ gốc</div>
                    <div className="col-span-3">Bản dịch</div>
                    <div className="col-span-2">Phân loại</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>

                {/* Virtual Rows */}
                <div
                    ref={parentRef}
                    className="h-[calc(100vh-300px)] overflow-y-auto scrollbar-hide"
                >
                    {filteredDic.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground italic">
                            Chưa có dữ liệu từ điển
                        </div>
                    ) : (
                        <div
                            style={{
                                height: `${virtualizer.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            {virtualizer.getVirtualItems().map((virtualRow) => {
                                const entry = filteredDic[virtualRow.index];
                                const typeInfo = DIC_TYPES.find(t => t.value === entry.type) || DIC_TYPES[0];
                                const isSelected = selectedEntries.includes(entry.id!);

                                return (
                                    <div
                                        key={virtualRow.key}
                                        data-index={virtualRow.index}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: `${virtualRow.size}px`,
                                            transform: `translateY(${virtualRow.start}px)`,
                                        }}
                                        className={cn(
                                            "grid grid-cols-12 gap-4 p-4 items-center transition-colors group border-b border-border",
                                            isSelected ? "bg-cyan-500/10 hover:bg-cyan-500/20" : "hover:bg-muted"
                                        )}
                                    >
                                        <div className="col-span-1 flex justify-center">
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={(checked) => {
                                                    if (checked) setSelectedEntries([...selectedEntries, entry.id!]);
                                                    else setSelectedEntries(selectedEntries.filter(id => id !== entry.id));
                                                }}
                                                className="border-border data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                                            />
                                        </div>
                                        <div className="col-span-1 text-center text-muted-foreground text-xs font-mono">{virtualRow.index + 1}</div>
                                        <div className="col-span-3 text-foreground font-serif text-lg select-all">{entry.original}</div>
                                        <div className="col-span-3">
                                            <EditableCell
                                                initialValue={entry.translated}
                                                onSave={(val) => db.dictionary.update(entry.id!, { translated: val })}
                                            />
                                            {entry.description && (
                                                <div className="text-[10px] text-muted-foreground italic mt-1 font-sans line-clamp-1" title={entry.description}>
                                                    {entry.description}
                                                </div>
                                            )}
                                        </div>
                                        <div className="col-span-2">
                                            <Select
                                                value={entry.type}
                                                onValueChange={(val) => handleUpdateType(entry.id!, val)}
                                            >
                                                <SelectTrigger className="h-7 text-xs border-border bg-muted text-foreground">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${typeInfo.color}`} />
                                                        <span>{typeInfo.label}</span>
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent className="bg-popover border-border text-popover-foreground">
                                                    {DIC_TYPES.map(t => (
                                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-2 flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleBlacklist(entry.id!);
                                                }}
                                                title="Chặn (Thêm vào Blacklist)"
                                            >
                                                <ShieldBan className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(entry.id!);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            <div className="text-center text-xs text-muted-foreground mt-4">
                Hiển thị {filteredDic.length} kết quả
            </div>
        </div>
    );
}
