"use client";

import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { DictionaryToolbar } from "../DictionaryToolbar";
import { DictionaryAddForm } from "../DictionaryAddForm";
import { DictionaryBulkActions } from "../DictionaryBulkActions";
import { useDictionary } from "../hooks/useDictionary";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { DictionaryRow } from "../DictionaryRow";
import { useRaiden } from "@/components/theme/RaidenProvider";
import { cn } from "@/lib/utils";

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
    const { isRaidenMode } = useRaiden();

    // Virtual scrolling setup
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: filteredDic.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 70, // Estimated row height
        overscan: 5, // Render 5 extra items above/below viewport
    });

    const handleSelectChange = React.useCallback((id: number, checked: boolean) => {
        if (checked) setSelectedEntries((prev: number[]) => [...prev, id]);
        else setSelectedEntries((prev: number[]) => prev.filter((eId: number) => eId !== id));
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
                onAIExtract={(source: string) => handleAIExtract(source as 'latest' | 'current' | 'select', dictionary)}
                isExtracting={isExtracting}
                extractDialogOpen={extractDialogOpen}
                onExtractDialogChange={setExtractDialogOpen}
                onAddClick={() => setIsAdding(!isAdding)}
                onSelectFromList={() => {
                    setExtractDialogOpen(false);
                    onChangeTab("chapters");
                    toast.info("Mày hãy chọn các chương muốn quét ở danh sách rồi bấm Quét nhé!");
                }}
                workspaceId={workspaceId}
                totalCount={dictionary.length}
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
            <div className={cn(
                "rounded-xl overflow-hidden shadow-sm border transition-all duration-500",
                isRaidenMode ? "bg-card border-border shadow-2xl" : "bg-muted/30 border-border shadow-sm"
            )}>
                {/* Header */}
                <div className={cn(
                    "grid grid-cols-[40px_1fr_1fr_120px_110px] gap-4 px-4 py-3 border-b-2 text-[11px] font-semibold uppercase tracking-wider sticky top-0 z-20 shadow-sm transition-all duration-500",
                    isRaidenMode ? "bg-card border-border text-muted-foreground" : "bg-muted/50 border-border-strong text-foreground/80"
                )}>
                    <div className="flex justify-center items-center">
                        <Checkbox
                            checked={filteredDic.length > 0 && selectedEntries.length === filteredDic.length}
                            onCheckedChange={toggleSelectAll}
                            className={cn(
                                isRaidenMode
                                    ? "border-slate-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                    : "border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            )}
                        />
                    </div>
                    <div className="px-2 flex items-center">Thuật ngữ gốc</div>
                    <div className="px-2 flex items-center">Bản dịch</div>
                    <div className="px-2 flex items-center">Phân loại</div>
                    <div className="text-right pr-4 flex items-center justify-end">Actions</div>
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
