"use client";

import React, { useState } from "react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const GENRES = [
    "Tiên Hiệp", "Võ Hiệp", "Huyền Huyễn",
    "Đô Thị", "Lịch Sử", "Xuyên Không", "Ngôn Tình",
    "Đam Mỹ", "Bách Hợp", "Fantasy", "LitRPG",
    "Isekai", "Viễn Tưởng", "Hệ Thống", "Tận Thế",
    "Kinh Dị", "Hành Động", "Hài Hước", "Đời Thường",
    "Harem", "Trinh Thám", "Khác"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-in fade-in duration-200 p-4">
            {/* Modal Container */}
            <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 pb-2">
                    <h2 className="text-2xl font-bold text-foreground">Tạo Workspace Mới</h2>
                </div>

                {/* Scrollable Content */}
                <div className="p-6 pt-2 overflow-y-auto custom-scrollbar flex-1">
                    <form id="create-workspace-form" onSubmit={handleSubmit} className="space-y-5">

                        {/* Title Input */}
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-white/70 text-xs uppercase font-bold tracking-wider">Tên Truyện</Label>
                            <Input
                                id="title"
                                autoFocus
                                required
                                placeholder="Nhập tên truyện"
                                className="bg-[#2b2b40] border-transparent text-white placeholder:text-white/20 focus-visible:ring-primary/50 focus-visible:bg-[#32324a] transition-all h-11 rounded-lg"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        {/* Genre Selection (Multi-select) */}
                        <div className="space-y-2">
                            <Label className="text-white/70 text-xs uppercase font-bold tracking-wider">
                                Thể Loại <span className="text-white/30 ml-1">(Chọn nhiều)</span>
                            </Label>
                            <div className="flex flex-wrap gap-2">
                                {GENRES.map(g => {
                                    const isSelected = formData.genre.includes(g);
                                    return (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => toggleGenre(g)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-md text-xs font-medium transition-all border border-transparent select-none",
                                                isSelected
                                                    ? "bg-primary text-white shadow-lg shadow-primary/25 transform scale-105"
                                                    : "bg-[#2b2b40] text-white/70 hover:bg-[#363654] hover:text-white"
                                            )}
                                        >
                                            {g}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Author Input */}
                        <div className="space-y-2">
                            <Label htmlFor="author" className="text-white/70 text-xs uppercase font-bold tracking-wider">Tác Giả</Label>
                            <Input
                                id="author"
                                placeholder="Ví dụ: Chưa rõ"
                                className="bg-[#2b2b40] border-transparent text-white placeholder:text-white/20 focus-visible:ring-primary/50 focus-visible:bg-[#32324a] transition-all h-11 rounded-lg"
                                value={formData.author}
                                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                            />
                        </div>

                        {/* Language Selection Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-white/70 text-xs uppercase font-bold tracking-wider">Ngôn Ngữ Gốc</Label>
                                <div className="relative">
                                    <select
                                        className="w-full appearance-none bg-[#2b2b40] text-white px-3 py-2.5 rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                        value={formData.sourceLang}
                                        onChange={(e) => setFormData({ ...formData, sourceLang: e.target.value })}
                                    >
                                        <option>Chinese (中文)</option>
                                        <option>English</option>
                                        <option>Korean</option>
                                        <option>Japanese</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-white/70 text-xs uppercase font-bold tracking-wider">Ngôn Ngữ Đích</Label>
                                <div className="relative">
                                    <select
                                        className="w-full appearance-none bg-[#2b2b40] text-white px-3 py-2.5 rounded-lg border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                        value={formData.targetLang}
                                        onChange={(e) => setFormData({ ...formData, targetLang: e.target.value })}
                                    >
                                        <option>Vietnamese (Tiếng Việt)</option>
                                        <option>English</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-b border-border flex justify-between gap-4 bg-[#1e1e2e]">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setIsOpen(false)}
                        className="flex-1 bg-[#2b2b40] text-white hover:bg-[#363654] h-11 rounded-lg"
                    >
                        Hủy
                    </Button>
                    <Button
                        type="submit"
                        form="create-workspace-form"
                        disabled={loading}
                        className="flex-[2] bg-primary hover:bg-primary/90 text-white h-11 rounded-lg shadow-lg shadow-primary/20"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Tạo Workspace
                    </Button>
                </div>
            </div>
        </div>
    );
}
