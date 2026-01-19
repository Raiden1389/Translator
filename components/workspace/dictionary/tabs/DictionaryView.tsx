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

import { DictionaryRow } from "../DictionaryRow";

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

    const handleSelectChange = React.useCallback((id: number, checked: boolean) => {
        if (checked) setSelectedEntries(prev => [...prev, id]);
        else setSelectedEntries(prev => prev.filter(eId => eId !== id));
    }, [setSelectedEntries]);

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
                            {virtualizer.getVirtualItems().map((virtualRow) => (
                                <DictionaryRow
                                    key={virtualRow.key}
                                    index={virtualRow.index}
                                    entry={filteredDic[virtualRow.index]}
                                    isSelected={selectedEntries.includes(filteredDic[virtualRow.index].id!)}
                                    virtualRow={virtualRow}
                                    onSelectChange={handleSelectChange}
                                    onUpdateType={handleUpdateType}
                                    onBlacklist={handleBlacklist}
                                    onDelete={handleDelete}
                                />
                            ))}
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
