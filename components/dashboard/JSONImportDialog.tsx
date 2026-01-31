"use client";

import React, { useState, useRef } from "react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Download, Loader2, X, FileJson, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function JSONImportDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Basic Validation
            if (!data.book || !data.chapters || !Array.isArray(data.chapters)) {
                throw new Error("Định dạng file JSON không hợp lệ. Phải có 'book' và 'chapters'.");
            }

            const workspaceId = crypto.randomUUID();

            // 1. Create Workspace
            await db.workspaces.add({
                id: workspaceId,
                title: data.book.title || "Tác phẩm mới",
                author: data.book.author || "Chưa rõ",
                cover: data.book.cover || "",
                description: data.book.description || "",
                genre: data.book.genre || "Khác",
                sourceLang: data.book.language || "Chinese (中文)",
                targetLang: "Vietnamese (Tiếng Việt)",
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            // 2. Add Chapters
            const chapters = data.chapters.map((ch: any, index: number) => {
                const rawContent = ch.content || "";
                // Normalize line breaks: convert <br> variants to \n
                const normalizedContent = rawContent
                    .replace(/<br\s*\/?>/gi, "\n")
                    .replace(/&lt;br\s*\/?&gt;/gi, "\n")
                    .replace(/\\n/g, "\n"); // Handle escaped newlines if any

                return {
                    workspaceId,
                    title: ch.title,
                    content_original: normalizedContent,
                    order: ch.order || index + 1,
                    status: 'draft' as const,
                    wordCountOriginal: normalizedContent.length,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
            });

            await db.chapters.bulkAdd(chapters);

            toast.success(`Đã nạp bộ truyện "${data.book.title}" thành công!`);
            setIsOpen(false);
            router.push(`/workspace?id=${workspaceId}`);
        } catch (error: any) {
            console.error("JSON Import Error:", error);
            toast.error(error.message || "Lỗi khi xử lý file JSON.");
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    if (!isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                variant="outline"
                className="rounded-full px-6 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 transition-all text-xs h-9"
            >
                <Download className="mr-2 h-3.5 w-3.5 text-primary" /> Import JSON
            </Button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-lg animate-in fade-in duration-300 p-4">
            <div className="w-full max-w-md bg-background border border-border/50 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
                <div className="p-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <FileJson className="h-6 w-6 text-primary" />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="rounded-full">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-black text-foreground tracking-tight">Import Crawler JSON</h2>
                        <p className="text-sm text-muted-foreground/60 leading-relaxed">
                            Chọn tệp JSON được tạo ra từ con Crawler Web của bạn. Toàn bộ thông tin truyện và chương sẽ được nạp tự động.
                        </p>
                    </div>

                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="group relative border-2 border-dashed border-border/40 hover:border-primary/40 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-primary/5 transition-all duration-300"
                    >
                        <input
                            type="file"
                            accept=".json"
                            ref={fileInputRef}
                            onChange={handleImport}
                            className="hidden"
                        />
                        <div className="w-16 h-16 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                            {loading ? <Loader2 className="h-8 w-8 text-primary animate-spin" /> : <Download className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />}
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-foreground">Click để chọn file JSON</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">Hoặc dán link nếu Crawler hỗ trợ</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-xl border border-border/20">
                        <AlertCircle className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-0.5" />
                        <div className="text-[11px] text-muted-foreground/60 leading-relaxed">
                            <span className="font-bold text-foreground/70">Mẹo:</span> Đảm bảo file JSON tuân thủ format mà AI đã hướng dẫn. Nếu file quá lớn, quá trình nạp có thể mất vài giây.
                        </div>
                    </div>

                    <Button
                        onClick={() => setIsOpen(false)}
                        variant="secondary"
                        className="w-full h-12 rounded-xl font-bold"
                    >
                        Đóng
                    </Button>
                </div>
            </div>
        </div>
    );
}
