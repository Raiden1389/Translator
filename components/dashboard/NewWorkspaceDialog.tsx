"use client";

import React, { useState } from "react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, X, Book, User, Globe2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const GENRE_GROUPS = [
    {
        label: "Cổ Đại / Tu Tiên",
        items: ["Tiên Hiệp", "Võ Hiệp", "Huyền Huyễn", "Lịch Sử"]
    },
    {
        label: "Hiện Đại / Tình Cảm",
        items: ["Đô Thị", "Xuyên Không", "Ngôn Tình", "Đam Mỹ", "Bách Hợp"]
    },
    {
        label: "Hệ Thống / Fantasy",
        items: ["Hệ Thống", "Tận Thế", "Fantasy", "LitRPG", "Isekai", "Viễn Tưởng"]
    },
    {
        label: "Tổng Hợp",
        items: ["Kinh Dị", "Hành Động", "Hài Hước", "Đời Thường", "Harem", "Trinh Thám", "Khác"]
    }
];

export function NewWorkspaceDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // State for form data
    const [formData, setFormData] = useState<{
        title: string;
        author: string;
        genre: string[]; // Changed to array for multi-select
        sourceLang: string;
        targetLang: string;
    }>({
        title: "",
        author: "",
        genre: ["Tiên Hiệp"], // Default one selected
        sourceLang: "Chinese (中文)",
        targetLang: "Vietnamese (Tiếng Việt)"
    });

    const toggleGenre = (g: string) => {
        setFormData(prev => {
            const current = prev.genre;
            if (current.includes(g)) {
                return { ...prev, genre: current.filter(item => item !== g) };
            } else {
                return { ...prev, genre: [...current, g] };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title) return;

        setLoading(true);
        try {
            await db.workspaces.add({
                id: crypto.randomUUID(),
                title: formData.title,
                author: formData.author,
                genre: formData.genre.join(", "), // Join array to string for DB
                sourceLang: formData.sourceLang,
                targetLang: formData.targetLang,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            setIsOpen(false);
            // Reset form
            setFormData({
                title: "",
                author: "",
                genre: ["Tiên Hiệp"],
                sourceLang: "Chinese (中文)",
                targetLang: "Vietnamese (Tiếng Việt)"
            });
        } catch (error) {
            console.error("Failed to create workspace", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <Button onClick={() => setIsOpen(true)} className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 rounded-full px-6 transition-transform hover:scale-105 active:scale-95">
                <Plus className="mr-2 h-4 w-4" /> Tạo Workspace
            </Button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300 p-4">
            {/* Modal Container */}
            <div className="w-full max-w-xl bg-background border border-border/50 rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[92vh]">

                {/* Header */}
                <div className="p-8 pb-4 flex items-center justify-between shrink-0 bg-linear-to-b from-white/2 to-transparent">
                    <div className="space-y-1">
                        <h2 className="text-3xl font-black text-foreground tracking-tight">Tạo Workspace Mới</h2>
                        <p className="text-sm text-muted-foreground/60">Khởi tạo không gian làm việc cho bộ truyện mới của bạn.</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="rounded-full hover:bg-muted">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Scrollable Content */}
                <div className="px-8 py-2 overflow-y-auto custom-scrollbar flex-1">
                    <form id="create-workspace-form" onSubmit={handleSubmit} className="space-y-8 py-4">

                        {/* Section 1: Identity */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-border/10">
                            <div className="space-y-2.5">
                                <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Tên Truyện</Label>
                                <div className="relative group">
                                    <Book className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="title"
                                        autoFocus
                                        required
                                        placeholder="Nhập tên truyện..."
                                        className="bg-muted/30 border-border/40 pl-11 h-12 rounded-xl focus-visible:ring-primary/20 focus-visible:border-primary transition-all text-base"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <Label htmlFor="author" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Tác Giả</Label>
                                <div className="relative group">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="author"
                                        placeholder="Ví dụ: Chưa rõ"
                                        className="bg-muted/30 border-border/40 pl-11 h-12 rounded-xl focus-visible:ring-primary/20 focus-visible:border-primary transition-all text-base"
                                        value={formData.author}
                                        onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Genres */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                                    <Sparkles className="h-3 w-3" /> Thể Loại <span className="opacity-40 italic font-medium">(Chọn nhiều)</span>
                                </Label>
                            </div>
                            <div className="space-y-4">
                                {GENRE_GROUPS.map((group) => (
                                    <div key={group.label} className="space-y-2">
                                        <div className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest pl-1">{group.label}</div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {group.items.map(g => {
                                                const isSelected = formData.genre.includes(g);
                                                return (
                                                    <button
                                                        key={g}
                                                        type="button"
                                                        onClick={() => toggleGenre(g)}
                                                        className={cn(
                                                            "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border select-none",
                                                            isSelected
                                                                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105"
                                                                : "bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                        )}
                                                    >
                                                        {g}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Section 3: Languages */}
                        <div className="pt-6 border-t border-border/10">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4 flex items-center gap-2">
                                <Globe2 className="h-3 w-3" /> Cấu Hình Ngôn Ngữ
                            </Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <span className="text-xs font-medium text-muted-foreground pl-1">Từ (Nguồn)</span>
                                    <Select value={formData.sourceLang} onValueChange={(val) => setFormData({ ...formData, sourceLang: val })}>
                                        <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-border/40">
                                            <SelectValue placeholder="Chọn ngôn ngữ gốc" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Chinese (中文)">Chinese (中文)</SelectItem>
                                            <SelectItem value="English">English</SelectItem>
                                            <SelectItem value="Korean">Korean</SelectItem>
                                            <SelectItem value="Japanese">Japanese</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <span className="text-xs font-medium text-muted-foreground pl-1">Sang (Đích)</span>
                                    <Select value={formData.targetLang} onValueChange={(val) => setFormData({ ...formData, targetLang: val })}>
                                        <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-border/40">
                                            <SelectValue placeholder="Chọn ngôn ngữ đích" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Vietnamese (Tiếng Việt)">Vietnamese (Tiếng Việt)</SelectItem>
                                            <SelectItem value="English">English</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="p-8 pt-6 border-t border-border bg-muted/20 flex gap-4 shrink-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsOpen(false)}
                        className="flex-1 h-12 rounded-xl font-bold border-border/50 hover:bg-muted transition-all"
                    >
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        form="create-workspace-form"
                        disabled={loading}
                        className="flex-2 h-12 rounded-xl font-extrabold text-base bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all active:scale-95"
                    >
                        {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Plus className="mr-2 h-5 w-5" />}
                        Tạo Workspace
                    </Button>
                </div>
            </div>
        </div>
    );
}
