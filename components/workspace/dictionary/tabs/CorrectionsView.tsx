"use client";

import { useState } from "react";
import { useCorrections } from "../hooks/useCorrections";
import { Search, Save, Trash2, Clock, MoreVertical } from "lucide-react";
import { HistoryDialog } from "../../HistoryDialog";
import { CorrectionForm } from "../../corrections/CorrectionForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useRaiden } from "@/components/theme/RaidenProvider";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

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
    const { isRaidenMode } = useRaiden();

    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const hasData = filteredCorrections.length > 0;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                    {hasData && (
                        <div className="relative max-w-[450px] animate-in fade-in slide-in-from-left-2 duration-300">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={correctionSearch}
                                onChange={(e) => setCorrectionSearch(e.target.value)}
                                className="pl-9 bg-background border-border text-foreground h-10 rounded-xl"
                                placeholder="Tìm kiếm quy tắc..."
                            />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-xl border border-transparent hover:border-border transition-all text-muted-foreground hover:text-foreground"
                            >
                                <MoreVertical className="h-5 w-5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2 rounded-xl" align="end">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-[13px] font-medium h-9 rounded-lg px-3"
                                onClick={() => setIsHistoryOpen(true)}
                            >
                                <Clock className="mr-2 h-4 w-4 text-primary" /> Lịch sử thay đổi
                            </Button>
                        </PopoverContent>
                    </Popover>
                </div>
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
            <div className={cn(
                "rounded-xl border border-border overflow-hidden flex flex-col shadow-sm transition-all duration-500",
                isRaidenMode ? "bg-card" : "bg-muted/30"
            )}>
                <div className="divide-y divide-border h-[calc(100vh-420px)] overflow-y-auto scrollbar-hide">
                    {filteredCorrections
                        .map((c, index) => {
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
                                <div key={c.id} className={cn(
                                    "grid grid-cols-12 gap-4 p-4 items-center transition-all duration-150 group",
                                    isRaidenMode
                                        ? "border-b border-border/40 hover:bg-muted/30"
                                        : (index % 2 === 0 ? "bg-card hover:bg-blue-50/80" : "bg-muted/20 hover:bg-blue-50/80")
                                )}>
                                    <div className="col-span-1 flex justify-center">
                                        <span className={cn(
                                            "text-[10px] uppercase font-black px-2 py-0.5 rounded shadow-xs text-white",
                                            cType === 'replace' ? 'bg-primary' :
                                                cType === 'wrap' ? 'bg-indigo-500' : 'bg-purple-500'
                                        )}>
                                            {cType === 'replace' ? 'RPL' : cType === 'wrap' ? 'WRP' : 'RGX'}
                                        </span>
                                    </div>
                                    <div className="col-span-3 text-muted-foreground line-through decoration-red-500/50 truncate font-serif" title={displayLeft}>
                                        {displayLeft}
                                    </div>
                                    <div className="col-span-1 text-center text-muted-foreground opacity-30">➔</div>
                                    <div className="col-span-5">
                                        <div className="font-bold text-primary truncate text-lg" title={displayRight}>
                                            {displayRight}
                                        </div>
                                    </div>
                                    <div className="col-span-2 flex justify-end pr-2">
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
                className="w-full bg-primary hover:bg-primary/90 text-white font-black py-7 text-lg shadow-xl shadow-primary/10 rounded-2xl group transition-all duration-300 active:scale-95"
                onClick={handleApplyCorrections}
                disabled={isApplyingCorrections || filteredCorrections.length === 0}
            >
                <Save className={cn("mr-2 h-5 w-5 transition-transform group-hover:scale-110", isApplyingCorrections && "animate-spin")} />
                {isApplyingCorrections ? "Đang áp dụng..." : `Áp dụng ${filteredCorrections.length} quy tắc cho toàn bộ truyện`}
            </Button>

            <HistoryDialog
                workspaceId={workspaceId}
                open={isHistoryOpen}
                onOpenChange={setIsHistoryOpen}
            />
        </div >
    );
}
