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
            <Card className="bg-card border-border shadow-xl overflow-hidden">
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                        <Label className="text-muted-foreground flex justify-between">
                            <span>Khoảng chương</span>
                            <span className="text-[10px] text-primary/70 font-mono">Max: {totalAvailable}</span>
                        </Label>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 space-y-1">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold px-1">Từ</span>
                                <Input
                                    type="number"
                                    min="1"
                                    max={totalAvailable}
                                    value={rangeStart}
                                    onChange={(e) => setRangeStart(e.target.value)}
                                    className="bg-background border-border text-foreground focus:ring-primary h-11"
                                />
                            </div>
                            <div className="flex-1 space-y-1">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold px-1">Đến</span>
                                <Input
                                    type="number"
                                    min="1"
                                    max={totalAvailable}
                                    value={rangeEnd}
                                    onChange={(e) => setRangeEnd(e.target.value)}
                                    className="bg-background border-border text-foreground focus:ring-primary h-11"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 space-y-4">
                        <Button
                            size="lg"
                            className={cn(
                                "w-full h-14 font-bold text-lg shadow-lg transition-all active:scale-95 disabled:opacity-50",
                                useDrive
                                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/20"
                                    : "bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 shadow-primary/20"
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
                                    <span>{useDrive ? "Đẩy lên " : "Tải xuống "}{formatLabel}</span>
                                </div>
                            )}
                        </Button>

                        {isExporting && (
                            <div className="space-y-2">
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-300 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                                        style={{ width: `${exportProgress}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
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
