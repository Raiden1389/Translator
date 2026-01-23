"use client";

import React from "react";
import { useCorrections } from "../hooks/useCorrections";
import { Search, Save, Trash2, Clock } from "lucide-react";
import { db } from "@/lib/db";
import { EditableCell } from "../../shared/EditableCell";
import { HistoryDialog } from "../../HistoryDialog";
import { CorrectionForm } from "../../corrections/CorrectionForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CorrectionsViewProps {
    workspaceId: string;
}

export function CorrectionsView({ workspaceId }: CorrectionsViewProps) {
    const {
        filteredCorrections,
        correctionSearch,
        setCorrectionSearch,
        ruleType,
        setRuleType,
        field1, setField1,
        field2, setField2,
        field3, setField3,
        isApplyingCorrections,
        handleAddCorrection,
        handleDeleteCorrection,
        handleApplyCorrections,
    } = useCorrections(workspaceId);

    const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);

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
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsHistoryOpen(true)}
                    className="flex items-center gap-2 border-border hover:bg-muted font-bold rounded-xl h-10 px-4"
                >
                    <Clock className="h-4 w-4" />
                    Lịch sử
                </Button>
            </div>

            {/* Add Form */}
            {/* Add Form */}
            <CorrectionForm
                type={ruleType}
                setType={setRuleType}
                field1={field1}
                field2={field2}
                field3={field3}
                onField1Change={setField1}
                onField2Change={setField2}
                onField3Change={setField3}
                onAdd={handleAddCorrection}
            />

            {/* Corrections List */}
            <div className="rounded-md border border-border bg-card shadow-sm overflow-hidden flex flex-col">
                <div className="divide-y divide-border h-[calc(100vh-420px)] overflow-y-auto scrollbar-hide">
                    {filteredCorrections
                        .map((c) => {
                            const cType = c.type || 'replace';
                            let displayLeft = "";
                            let displayRight = "";

                            if (cType === 'replace') {
                                displayLeft = c.from || c.original || "";
                                displayRight = c.to || c.replacement || "";
                            } else if (cType === 'wrap') {
                                displayLeft = c.target || c.original || "";
                                displayRight = `${c.open || "["}...${c.close || "]"}`;
                            } else if (cType === 'regex') {
                                displayLeft = c.pattern || c.original || "";
                                displayRight = c.replace || c.replacement || "";
                            }

                            return (
                                <div key={c.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/50 group">
                                    <div className="col-span-1 flex justify-center">
                                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded text-white ${cType === 'replace' ? 'bg-blue-500' :
                                                cType === 'wrap' ? 'bg-amber-500' : 'bg-purple-500'
                                            }`}>
                                            {cType === 'replace' ? 'RPL' : cType === 'wrap' ? 'WRP' : 'RGX'}
                                        </span>
                                    </div>
                                    <div className="col-span-3 text-muted-foreground line-through decoration-red-500/50 truncate" title={displayLeft}>
                                        {displayLeft}
                                    </div>
                                    <div className="col-span-1 text-center text-muted-foreground">➔</div>
                                    <div className="col-span-5">
                                        <div className="font-bold text-emerald-600 truncate" title={displayRight}>
                                            {displayRight}
                                        </div>
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
                            )
                        })}
                </div>
            </div>

            {/* Apply Button */}
            <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6 text-lg shadow-lg"
                onClick={handleApplyCorrections}
                disabled={isApplyingCorrections || filteredCorrections.length === 0}
            >
                <Save className="mr-2 h-5 w-5" />
                {isApplyingCorrections ? "Đang áp dụng..." : `Áp dụng ${filteredCorrections.length} quy tắc cho tất cả chương`}
            </Button>

            <HistoryDialog
                workspaceId={workspaceId}
                open={isHistoryOpen}
                onOpenChange={setIsHistoryOpen}
            />
        </div>
    );
}
