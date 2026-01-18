"use client";

import React from "react";
import { useCorrections } from "../hooks/useCorrections";
import { CorrectionForm } from "../../corrections/CorrectionForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Save, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { EditableCell } from "../../shared/EditableCell";

interface CorrectionsViewProps {
    workspaceId: string;
}

export function CorrectionsView({ workspaceId }: CorrectionsViewProps) {
    const {
        filteredCorrections,
        correctionSearch,
        setCorrectionSearch,
        newWrong,
        setNewWrong,
        newRight,
        setNewRight,
        isApplyingCorrections,
        handleAddCorrection,
        handleDeleteCorrection,
        handleApplyCorrections,
    } = useCorrections(workspaceId);

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div className="relative flex-1 md:w-[400px]">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={correctionSearch}
                        onChange={(e) => setCorrectionSearch(e.target.value)}
                        className="pl-9 bg-background border-border text-foreground"
                        placeholder="Tìm kiếm..."
                    />
                </div>
            </div>

            {/* Add Form */}
            <CorrectionForm
                newWrong={newWrong}
                newRight={newRight}
                onWrongChange={setNewWrong}
                onRightChange={setNewRight}
                onAdd={handleAddCorrection}
            />

            {/* Corrections List */}
            <div className="rounded-md border border-border bg-card overflow-hidden flex flex-col">
                <div className="divide-y divide-border h-[calc(100vh-350px)] overflow-y-auto scrollbar-hide">
                    {filteredCorrections
                        .map((c) => (
                            <div key={c.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted group">
                                <div className="col-span-4 text-muted-foreground line-through decoration-red-500/50">{c.original}</div>
                                <div className="col-span-1 text-center text-muted-foreground">➔</div>
                                <div className="col-span-5">
                                    <EditableCell
                                        initialValue={c.replacement}
                                        onSave={(val) => db.corrections.update(c.id!, { replacement: val })}
                                        className="text-emerald-400 font-bold"
                                    />
                                </div>
                                <div className="col-span-2 flex justify-end">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                        onClick={() => handleDeleteCorrection(c.id!)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                </div>
            </div>

            {/* Apply Button */}
            <Button
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-6 text-lg"
                onClick={handleApplyCorrections}
                disabled={isApplyingCorrections || filteredCorrections.length === 0}
            >
                <Save className="mr-2 h-5 w-5" />
                {isApplyingCorrections ? "Đang áp dụng..." : `Áp dụng ${filteredCorrections.length} quy tắc cho tất cả chương`}
            </Button>
        </div>
    );
}
