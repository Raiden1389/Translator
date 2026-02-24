"use client";

import React, { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { appendChaptersFromJSON } from "@/lib/export-import";
import { toast } from "sonner";

interface UpdateFromJSONCardProps {
    workspaceId: string;
}

export function UpdateFromJSONCard({ workspaceId }: UpdateFromJSONCardProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setResult(null);
        try {
            const r = await appendChaptersFromJSON(workspaceId, file);
            setResult(r);
            if (r.added > 0) {
                toast.success(`✅ Đã thêm ${r.added} chương mới! (bỏ qua ${r.skipped} đã có)`);
            } else {
                toast.info(`Không có chương mới — ${r.skipped} chương đã tồn tại.`);
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
                    Chỉ các chương <span className="font-bold text-foreground">chưa tồn tại</span> mới được thêm — bản dịch hiện có không bị ảnh hưởng.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                            Chỉ append chương mới — an toàn tuyệt đối
                        </p>
                    </div>
                </div>

                {/* Result */}
                {result && (
                    <div className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${result.added > 0
                            ? 'bg-green-500/5 border-green-500/20 text-green-400'
                            : 'bg-muted/30 border-border/30 text-muted-foreground'
                        }`}>
                        {result.added > 0
                            ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                            : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        }
                        <div>
                            {result.added > 0
                                ? <><span className="font-bold">{result.added} chương mới</span> đã được thêm vào workspace.</>
                                : <>Không có chương mới.</>
                            }
                            {result.skipped > 0 && (
                                <span className="text-xs opacity-60 ml-1">({result.skipped} đã tồn tại, bỏ qua)</span>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
