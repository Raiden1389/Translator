"use client";

import React, { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, CheckCircle2, AlertCircle, Loader2, RefreshCcw, Plus } from "lucide-react";
import { appendChaptersFromJSON, updateChangedChaptersFromJSON } from "@/lib/export-import";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UpdateFromJSONCardProps {
    workspaceId: string;
}

type ImportMode = "append" | "update";

export function UpdateFromJSONCard({ workspaceId }: UpdateFromJSONCardProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<ImportMode>("append");
    const [result, setResult] = useState<
        | { mode: "append"; added: number; skipped: number }
        | { mode: "update"; updated: number; skipped: number; clearedTranslations: number }
        | null
    >(null);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setResult(null);
        try {
            if (mode === "append") {
                const r = await appendChaptersFromJSON(workspaceId, file);
                setResult({ mode: "append", ...r });
                if (r.added > 0) {
                    toast.success(`✅ Đã thêm ${r.added} chương mới! (bỏ qua ${r.skipped} đã có)`);
                } else {
                    toast.info(`Không có chương mới — ${r.skipped} chương đã tồn tại.`);
                }
            } else {
                const r = await updateChangedChaptersFromJSON(workspaceId, file);
                setResult({ mode: "update", ...r });
                if (r.updated > 0) {
                    const clearedSuffix = r.clearedTranslations > 0
                        ? `, xoá ${r.clearedTranslations} bản dịch cũ`
                        : "";
                    toast.success(`✅ Đã cập nhật ${r.updated} chương đã sửa${clearedSuffix}.`);
                } else {
                    toast.info(`Không có chương nào thay đổi — bỏ qua ${r.skipped} chương.`);
                }
            }
        } catch (err) {
            toast.error(`Lỗi: ${err instanceof Error ? err.message : 'Unknown'}`);
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <Card className="border-border/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Upload className="h-4 w-4 text-primary" />
                    Cập nhật từ Crawler JSON mới
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                    Khi có chương mới từ Crawler, xuất JSON rồi import vào đây.
                    Em thêm sẵn 2 chế độ: thêm chương mới an toàn, hoặc cập nhật đúng những chương nguồn đã bị sửa.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => setMode("append")}
                        className={cn(
                            "rounded-xl border p-4 text-left transition-all",
                            mode === "append"
                                ? "border-primary/50 bg-primary/10 shadow-[inset_0_0_0_1px_hsl(from_var(--primary)_h_s_l/0.2)]"
                                : "border-border/40 hover:border-primary/30 hover:bg-primary/5"
                        )}
                    >
                        <div className="flex items-center gap-2 text-sm font-bold">
                            <Plus className="h-4 w-4 text-primary" />
                            Thêm chương mới
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Chỉ append các chapter chưa có trong workspace.
                        </p>
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode("update")}
                        className={cn(
                            "rounded-xl border p-4 text-left transition-all",
                            mode === "update"
                                ? "border-amber-500/40 bg-amber-500/10 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.18)]"
                                : "border-border/40 hover:border-amber-500/30 hover:bg-amber-500/5"
                        )}
                    >
                        <div className="flex items-center gap-2 text-sm font-bold">
                            <RefreshCcw className="h-4 w-4 text-amber-400" />
                            Cập nhật chương đã sửa
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Chỉ update chapter có đổi nội dung/tên nguồn thật sự. Chương chỉ khác format HTML sẽ bị bỏ qua.
                        </p>
                    </button>
                </div>

                <div
                    onClick={() => !loading && fileInputRef.current?.click()}
                    className="group relative border-2 border-dashed border-border/40 hover:border-primary/40 rounded-xl p-6 flex items-center gap-4 cursor-pointer hover:bg-primary/5 transition-all duration-300"
                >
                    <input
                        type="file"
                        accept=".json"
                        ref={fileInputRef}
                        onChange={handleFile}
                        className="hidden"
                    />
                    <div className="w-12 h-12 rounded-xl bg-muted group-hover:bg-primary/10 flex items-center justify-center shrink-0 transition-colors">
                        {loading
                            ? <Loader2 className="h-5 w-5 text-primary animate-spin" />
                            : <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        }
                    </div>
                    <div>
                        <p className="text-sm font-bold">
                            {loading ? 'Đang xử lý...' : 'Chọn file JSON từ Crawler'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {mode === "append"
                                ? "Chỉ append chương mới — an toàn tuyệt đối"
                                : "Chỉ update chapter nguồn thật sự đổi — chỉ bản dịch của chapter đó bị xoá"}
                        </p>
                    </div>
                </div>

                {/* Result */}
                {result && (
                    <div className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${((result.mode === "append" && result.added > 0) || (result.mode === "update" && result.updated > 0))
                            ? 'bg-green-500/5 border-green-500/20 text-green-400'
                            : 'bg-muted/30 border-border/30 text-muted-foreground'
                        }`}>
                        {((result.mode === "append" && result.added > 0) || (result.mode === "update" && result.updated > 0))
                            ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                            : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        }
                        <div>
                            {result.mode === "append" ? (
                                <>
                                    {result.added > 0
                                        ? <><span className="font-bold">{result.added} chương mới</span> đã được thêm vào workspace.</>
                                        : <>Không có chương mới.</>
                                    }
                                    {result.skipped > 0 && (
                                        <span className="text-xs opacity-60 ml-1">({result.skipped} đã tồn tại, bỏ qua)</span>
                                    )}
                                </>
                            ) : (
                                <>
                                    {result.updated > 0
                                        ? <><span className="font-bold">{result.updated} chương đã sửa</span> đã được cập nhật.</>
                                        : <>Không có chapter nào bị sửa.</>
                                    }
                                    {result.clearedTranslations > 0 && (
                                        <span className="text-xs opacity-80 ml-1">({result.clearedTranslations} bản dịch cũ đã bị xoá)</span>
                                    )}
                                    {result.skipped > 0 && (
                                        <span className="text-xs opacity-60 ml-1">({result.skipped} chapter không đổi hoặc chưa tồn tại, bỏ qua)</span>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
