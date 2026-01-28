"use client";

import React from "react";
import { useBlacklist } from "../hooks/useBlacklist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Download, Upload, RotateCcw, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { EditableCell } from "../../shared/EditableCell";

interface BlacklistViewProps {
    workspaceId: string;
}

export function BlacklistView({ workspaceId }: BlacklistViewProps) {
    const {
        filteredBlacklist,
        blacklistSearch,
        setBlacklistSearch,
        selectedBlacklist,
        setSelectedBlacklist,
        isTranslating,
        handleRestoreBlacklist,
        handleBulkRestoreBlacklist,
        handleTranslateBlacklist,
        handleBlacklistExport,
        handleBlacklistImport,
    } = useBlacklist(workspaceId);

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 md:w-[400px]">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={blacklistSearch}
                        onChange={(e) => setBlacklistSearch(e.target.value)}
                        className="pl-9 bg-background border-border text-foreground"
                        placeholder="Tìm kiếm trong blacklist..."
                    />
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" className="border-border" onClick={() => document.getElementById('blacklist-import')?.click()}>
                        <Upload className="mr-2 h-4 w-4" /> Import
                    </Button>
                    <input
                        type="file"
                        id="blacklist-import"
                        className="hidden"
                        accept=".json"
                        onChange={handleBlacklistImport}
                    />
                    <Button variant="outline" className="border-border" onClick={handleBlacklistExport}>
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                    <Button
                        variant="outline"
                        className="border-purple-500/30 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                        onClick={handleTranslateBlacklist}
                        disabled={isTranslating}
                    >
                        <Sparkles className="mr-2 h-4 w-4" /> {isTranslating ? "Đang dịch..." : "AI Dịch Nghĩa"}
                    </Button>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedBlacklist.length > 0 && (
                <div className="flex items-center gap-4 bg-amber-500/20 p-2 px-4 rounded-lg border border-amber-500/50 mb-4">
                    <span className="text-sm font-medium text-foreground">{selectedBlacklist.length} đã chọn</span>
                    <Button size="sm" variant="outline" className="h-8 border-amber-500/50 text-amber-400 hover:text-amber-300" onClick={handleBulkRestoreBlacklist}>
                        <RotateCcw className="mr-2 h-4 w-4" /> Khôi phục hàng loạt
                    </Button>
                </div>
            )}

            {/* Table */}
            <div className="rounded-md border border-border bg-card overflow-hidden">
                <div className="divide-y divide-border h-[calc(100vh-250px)] overflow-y-auto scrollbar-hide">
                    {filteredBlacklist.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground italic">
                            Chưa có từ nào trong Blacklist
                        </div>
                    ) : (
                        filteredBlacklist.map((entry) => {
                            const isSelected = selectedBlacklist.includes(entry.id!);
                            return (
                                <div key={entry.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted group">
                                    <div className="col-span-1 flex justify-center">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={(checked) => {
                                                if (checked) setSelectedBlacklist([...selectedBlacklist, entry.id!]);
                                                else setSelectedBlacklist(selectedBlacklist.filter(id => id !== entry.id));
                                            }}
                                            className="border-border"
                                        />
                                    </div>
                                    <div className="col-span-4 text-foreground font-serif text-lg select-text">{entry.word}</div>
                                    <div className="col-span-5">
                                        <EditableCell
                                            initialValue={entry.translated || entry.word}
                                            onSave={(val) => db.blacklist.update(entry.id!, { translated: val })}
                                        />
                                    </div>
                                    <div className="col-span-2 flex justify-end">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                                            onClick={() => handleRestoreBlacklist(entry.id!)}
                                        >
                                            <RotateCcw className="mr-2 h-4 w-4" /> Khôi phục
                                        </Button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
            <div className="text-center text-xs text-muted-foreground mt-4">
                Hiển thị {filteredBlacklist.length} kết quả
            </div>
        </div>
    );
}
