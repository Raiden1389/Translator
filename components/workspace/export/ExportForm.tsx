"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Settings, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExportFormProps {
    rangeStart: string;
    rangeEnd: string;
    setRangeStart: (val: string) => void;
    setRangeEnd: (val: string) => void;
    totalAvailable: number;
    isExporting: boolean;
    exportProgress: number;
    onExport: () => void;
    formatLabel: string;
    useDrive?: boolean;
}

export function ExportForm({
    rangeStart,
    rangeEnd,
    setRangeStart,
    setRangeEnd,
    totalAvailable,
    isExporting,
    exportProgress,
    onExport,
    formatLabel,
    useDrive
}: ExportFormProps) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                <Settings className="w-5 h-5 text-primary" />
                2. Tùy chọn xuất
            </h3>
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                        <Label className="text-slate-500 font-medium flex justify-between">
                            <span>Khoảng chương cần xuất</span>
                            <span className="text-[10px] text-indigo-600 font-black font-mono">MAX: {totalAvailable}</span>
                        </Label>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 space-y-1">
                                <span className="text-[10px] text-slate-400 uppercase font-black px-1">Từ</span>
                                <Input
                                    type="number"
                                    min="1"
                                    max={totalAvailable}
                                    value={rangeStart}
                                    onChange={(e) => setRangeStart(e.target.value)}
                                    className="bg-slate-50 border-slate-200 text-slate-900 focus:ring-indigo-500 focus:border-indigo-500 h-11 font-mono"
                                />
                            </div>
                            <div className="flex-1 space-y-1">
                                <span className="text-[10px] text-slate-400 uppercase font-black px-1">Đến</span>
                                <Input
                                    type="number"
                                    min="1"
                                    max={totalAvailable}
                                    value={rangeEnd}
                                    onChange={(e) => setRangeEnd(e.target.value)}
                                    className="bg-slate-50 border-slate-200 text-slate-900 focus:ring-indigo-500 focus:border-indigo-500 h-11 font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 space-y-4">
                        <Button
                            size="lg"
                            className={cn(
                                "w-full h-14 font-extrabold text-lg shadow-md transition-all active:scale-[0.98] disabled:opacity-50",
                                useDrive
                                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100"
                                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100"
                            )}
                            onClick={onExport}
                            disabled={isExporting}
                        >
                            {isExporting ? (
                                <div className="flex items-center gap-3">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                    <span>Đang xử lý... {exportProgress}%</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    {useDrive ? <Cloud className="h-6 w-6" /> : <Download className="h-6 w-6" />}
                                    <span>{useDrive ? "Đẩy lên Google Drive" : "Tải xuống " + formatLabel}</span>
                                </div>
                            )}
                        </Button>

                        {isExporting && (
                            <div className="space-y-2">
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                                        style={{ width: `${exportProgress}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                    <span>Đang nén dữ liệu</span>
                                    <span>{exportProgress}%</span>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
