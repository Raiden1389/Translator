"use client";

import React, { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
    Upload, Globe, Trash2, Edit, X, Sparkles,
    Circle, Loader2, Search, Filter, RefreshCw, Type, FileUp,
    ChevronLeft, ChevronRight, Save, AlertTriangle, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AI_MODELS } from "@/lib/ai-models";
import ePub from "epubjs";
import Link from "next/link";
import { toast } from "sonner";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { translateChapter } from "@/lib/gemini";
import { ChapterListHeader } from "./ChapterListHeader";
import { ChapterTable } from "./ChapterTable";
import { ChapterCardGrid } from "./ChapterCardGrid";
import { ReaderModal } from "./ReaderModal";
import { usePersistedState } from "@/lib/hooks/usePersistedState";
import { LayoutGrid, LayoutList } from "lucide-react";

interface ChapterListProps {
    workspaceId: string;
}

export function ChapterList({ workspaceId }: ChapterListProps) {
    const chapters = useLiveQuery(
        () => db.chapters.where("workspaceId").equals(workspaceId).sortBy("order")
        , [workspaceId]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const importInputRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [importStatus, setImportStatus] = useState("");
    const [search, setSearch] = useState("");
    const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
    const [readingChapterId, setReadingChapterId] = useState<number | null>(null);
    const [filterStatus, setFilterStatus] = usePersistedState<"all" | "draft" | "translated">(`workspace-${workspaceId}-filter`, "all");

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = usePersistedState(`workspace-${workspaceId}-perPage`, 50);

    // View Mode State
    const [viewMode, setViewMode] = usePersistedState<"grid" | "table">(
        `workspace-${workspaceId}-viewMode`,
        "grid"
    );

    // Filter Logic
    const filtered = React.useMemo(() => {
        if (!chapters) return [];
        return chapters.filter(c => {
            const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = filterStatus === "all" || c.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [chapters, search, filterStatus]);

    // Pagination Logic
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const currentChapters = React.useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filtered.slice(start, start + itemsPerPage);
    }, [filtered, currentPage, itemsPerPage]);

    // Reset page when search changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    // Toggle Select All
    const toggleSelectAll = () => {
        if (filtered.length === 0) return;
        if (selectedChapters.length === filtered.length) {
            setSelectedChapters([]);
        } else {
            setSelectedChapters(filtered.map(c => c.id!));
        }
    };

    // Toggle Single Selection
    const toggleSelect = (id: number) => {
        if (selectedChapters.includes(id)) {
            setSelectedChapters(selectedChapters.filter(c => c !== id));
        } else {
            setSelectedChapters([...selectedChapters, id]);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setProgress(0);
        setImportStatus("Đang đọc file...");

        try {
            let newChapters: any[] = [];
            let order = (chapters?.length || 0) + 1;

            if (file.name.endsWith(".epub")) {
                const book = ePub(await file.arrayBuffer());
                await book.ready;
                const { toc } = book.navigation;
                const flatten = (items: any[]) => {
                    let flat: any[] = [];
                    items.forEach(item => {
                        flat.push(item);
                        if (item.subitems) flat = flat.concat(flatten(item.subitems));
                    });
                    return flat;
                };
                const flatToc = flatten(toc);
                // @ts-ignore
                const itemsRequest = flatToc.length > 0 ? flatToc : book.spine.items;

                const totalItems = itemsRequest.length;
                setImportStatus(`Tìm thấy ${totalItems} mục. Đang trích xuất...`);

                let processedCount = 0;
                for (const item of itemsRequest) {
                    const doc = await book.load(item.href);
                    if (doc) {
                        // @ts-ignore
                        const textContent = doc.body ? doc.body.innerText : (doc.documentElement ? doc.documentElement.innerText : "");
                        const title = item.label ? item.label.trim() : `Chapter ${order}`;

                        if (textContent && textContent.trim().length > 50) {
                            newChapters.push({
                                workspaceId,
                                title: title,
                                content_original: textContent,
                                wordCountOriginal: textContent.length,
                                wordCountTranslated: 0,
                                order: order++,
                                status: 'draft'
                            });
                        }
                    }
                    processedCount++;
                    setProgress(Math.round((processedCount / totalItems) * 100));
                }
            } else {
                // TXT Import
                setImportStatus("Đang xử lý file text...");
                const text = await file.text();
                setProgress(50);

                // Regex for Chinese 'Chương' or English 'Chapter'
                const chunks = text.split(/(?=^Chương\s+\d+|Chapter\s+\d+|^第[0-9一二三四五六七八九十百]+章)/gmi).filter(c => c.trim().length > 0);

                if (chunks.length === 0 && text.trim().length > 0) {
                    newChapters.push({
                        workspaceId,
                        title: file.name.replace(".txt", ""),
                        content_original: text,
                        wordCountOriginal: text.length,
                        wordCountTranslated: 0,
                        order: order++,
                        status: 'draft'
                    });
                } else {
                    newChapters = chunks.map(chunk => {
                        const lines = chunk.split('\n');
                        const title = lines[0].trim().substring(0, 100);
                        const content = lines.slice(1).join('\n').trim();
                        return {
                            workspaceId,
                            title,
                            content_original: chunk,
                            wordCountOriginal: chunk.length,
                            wordCountTranslated: 0,
                            order: order++,
                            status: 'draft'
                        };
                    });
                }
                setProgress(100);
            }

            if (newChapters.length > 0) {
                setImportStatus(`Đang lưu ${newChapters.length} chương vào DB...`);
                await db.chapters.bulkAdd(newChapters);
                await db.workspaces.update(workspaceId, { updatedAt: new Date() });
                toast.success(`Import thành công ${newChapters.length} chương!`);
            } else {
                toast.error("Không tìm thấy chương nào hợp lệ.");
            }

        } catch (err) {
            console.error(err);
            toast.error("Lỗi khi import file.");
        } finally {
            setImporting(false);
            setProgress(0);
            setImportStatus("");
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleExport = async () => {
        const selectedIds = selectedChapters.length > 0
            ? selectedChapters
            : filtered.map(c => c.id!);

        if (selectedIds.length === 0) {
            toast.error("Không có chương nào để xuất.");
            return;
        }

        try {
            const data = await db.chapters.bulkGet(selectedIds);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `workspace-${workspaceId}-chapters.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            toast.error("Lỗi khi xuất dữ liệu.");
        }
    };

    const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            if (Array.isArray(data)) {
                // Ensure workspaceId is correct and IDs are not clashing
                const lastOrder = chapters?.length || 0;
                const chaptersWithWorkspace = data.map((c, index) => {
                    const { id, ...rest } = c;
                    return {
                        ...rest,
                        workspaceId,
                        order: (rest.order || lastOrder + index + 1)
                    };
                });
                await db.chapters.bulkAdd(chaptersWithWorkspace);
                toast.success(`Đã nhập thành công ${chaptersWithWorkspace.length} chương!`);
            } else {
                toast.error("Định dạng JSON không hợp lệ. Phải là mảng các chương.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Lỗi khi nhập file JSON.");
        } finally {
            if (importInputRef.current) importInputRef.current.value = "";
        }
    };

    const deleteChapter = async (id: number) => {
        if (confirm("Delete this chapter?")) {
            await db.chapters.delete(id);
        }
    };

    // Batch Translation State
    const [isTranslating, setIsTranslating] = useState(false);
    const [translateDialogOpen, setTranslateDialogOpen] = useState(false);
    const [translateConfig, setTranslateConfig] = useState({
        customPrompt: "",
        summary: false,
        summaryBefore: false,
        autoExtract: false
    });

    // Prompts
    const savedPrompts = useLiveQuery(() => db.prompts.toArray());

    // Load Last Used Prompt
    React.useEffect(() => {
        const loadPrompt = async () => {
            const last = await db.settings.get("lastCustomPrompt");
            if (last?.value) {
                setTranslateConfig(prev => ({ ...prev, customPrompt: last.value }));
            }
        };
        loadPrompt();
    }, []);

    // Load Settings when dialog opens
    React.useEffect(() => {
        if (translateDialogOpen) {
            loadSettings();
        }
    }, [translateDialogOpen]);
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentTitle: "" });

    // Settings State
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [currentSettings, setCurrentSettings] = useState({ apiKey: "", model: "gemini-1.5-flash" });

    // Load Settings
    const loadSettings = async () => {
        const key = await db.settings.get("apiKeyPrimary");
        const model = await db.settings.get("aiModel");
        setCurrentSettings({
            apiKey: key?.value || "",
            model: model?.value || "gemini-1.5-flash"
        });
    };

    const saveSettings = async () => {
        await db.settings.put({ key: "apiKeyPrimary", value: currentSettings.apiKey });
        await db.settings.put({ key: "aiModel", value: currentSettings.model });
        setSettingsOpen(false);
    };

    // ... existing handlers

    const handleBatchTranslate = async () => {
        setIsTranslating(true);
        setTranslateDialogOpen(false); // Close dialog but show progress

        try {
            const chaptersToTranslate = chapters?.filter(c => selectedChapters.includes(c.id!)) || [];
            let processed = 0;
            setBatchProgress({ current: 0, total: chaptersToTranslate.length, currentTitle: "" });

            for (const chapter of chaptersToTranslate) {
                setBatchProgress(prev => ({ ...prev, currentTitle: chapter.title }));

                await new Promise<void>((resolve) => {
                    translateChapter(
                        chapter.content_original,
                        (log) => console.log(log),
                        async (result) => {
                            const translatedText = result.translatedText;
                            const aiTranslatedTitle = result.translatedTitle;

                            // Simple Title Translation (Regex-based) if AI didn't provide one
                            let newTitle = aiTranslatedTitle || chapter.title;
                            if (!aiTranslatedTitle && newTitle) {
                                newTitle = newTitle.replace(/Chapter\s+(\d+)/i, "Chương $1")
                                    .replace(/第\s*(\d+)\s*章/, "Chương $1")
                                    .replace(/第\s*([0-9]+)\s*章/, "Chương $1");
                            }

                            // Update DB
                            await db.chapters.update(chapter.id!, {
                                content_translated: translatedText,
                                title_translated: newTitle,
                                wordCountTranslated: translatedText.length,
                                status: 'translated'
                            });

                            // 3. Auto Extract (If enabled)
                            if (translateConfig.autoExtract) {
                                // eslint-disable-next-line @typescript-eslint/no-var-requires
                                const { extractGlossary } = require("@/lib/gemini");
                                const result = await extractGlossary(chapter.content_original, (l: any) => console.log(l));
                                if (result) {
                                    // Add to dictionary silently
                                    for (const char of result.characters) {
                                        if (!(await db.dictionary.where("original").equals(char.original).first())) {
                                            await db.dictionary.add({ ...char, type: 'name', createdAt: new Date() });
                                        }
                                    }
                                    for (const term of result.terms) {
                                        if (!(await db.dictionary.where("original").equals(term.original).first())) {
                                            await db.dictionary.add({ ...term, type: term.type as any, createdAt: new Date() });
                                        }
                                    }
                                }
                            }
                            resolve();
                        },
                        translateConfig.customPrompt // Pass custom prompt
                    );
                });
                processed++;
                setBatchProgress(prev => ({ ...prev, current: processed }));
            }
            toast.success(`Dịch hoàn tất ${processed} chương!`);
        } catch (e) {
            console.error(e);
            toast.error("Lỗi khi dịch hàng loạt: " + e);
        } finally {
            setIsTranslating(false);
            setTranslateDialogOpen(false);
            setBatchProgress({ current: 0, total: 0, currentTitle: "" });
        }
    }


    if (!chapters) return <div className="p-10 text-center text-white/50">Loading chapters...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative pb-10">
            {/* Translation Progress Overlay - Sleek Material Design */}
            {isTranslating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-300">
                    {/* Backdrop with blur */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={(e) => e.stopPropagation()} />

                    {/* Progress Card */}
                    <div className="relative bg-gradient-to-br from-[#2b2b40]/95 to-[#1e1e2e]/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/10 max-w-md w-full mx-4 animate-in zoom-in-95 duration-300">
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 rounded-3xl overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"
                                style={{ animation: 'shimmer 2s infinite' }} />
                        </div>

                        {/* Content */}
                        <div className="relative space-y-6">
                            {/* Icon */}
                            <div className="flex justify-center">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                                    <Loader2 className="h-16 w-16 text-primary animate-spin relative" />
                                </div>
                            </div>

                            {/* Title & Status */}
                            <div className="text-center space-y-2">
                                <h4 className="text-white font-bold text-2xl bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                                    Đang dịch {batchProgress.current}/{batchProgress.total}
                                </h4>
                                <p className="text-white/60 text-sm font-medium truncate px-4">
                                    {batchProgress.currentTitle}
                                </p>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-white/40 font-mono">
                                    <span>{Math.round((batchProgress.current / batchProgress.total) * 100)}%</span>
                                    <span>{batchProgress.current} / {batchProgress.total}</span>
                                </div>
                                <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden border border-white/10 shadow-inner">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out relative overflow-hidden"
                                        style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                                    >
                                        {/* Animated shine effect */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                                    </div>
                                </div>
                            </div>

                            {/* Hint */}
                            <p className="text-center text-xs text-white/30 italic">
                                Đang xử lý... Vui lòng chờ
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Translation Config Dialog */}
            <Dialog open={translateDialogOpen} onOpenChange={setTranslateDialogOpen}>
                <DialogContent className="sm:max-w-[500px] bg-[#1a0b2e] border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded bg-primary/20 text-primary"><RefreshCw className="h-4 w-4" /></div>
                                Cấu Hình Dịch
                            </div>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20" title="Debug DB" onClick={async () => {
                                try {
                                    if (!db.isOpen()) await db.open();
                                    const count = await db.prompts.count();
                                    const list = await db.prompts.toArray();
                                    alert(`Debug Prompts: ${count} items.\nIDs: ${list.map(p => p.id).join(', ')}\nTitles: ${list.map(p => p.title).join(', ')}`);
                                } catch (e: any) {
                                    alert("DB Error: " + e.message + "\nStack: " + e.stack);
                                }
                            }}>
                                <AlertTriangle className="h-3 w-3 mr-1" /> Check DB ({savedPrompts?.length || 0})
                            </Button>
                        </DialogTitle>
                        <DialogDescription className="text-white/50">
                            Thiết lập tùy chọn cho tiến trình dịch {selectedChapters.length} chương đã chọn.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Selected Model (Editable) */}
                        <div className="p-3 rounded bg-white/5 border border-white/10 flex justify-between items-center text-sm">
                            <div>
                                <div className="text-xs text-white/50 uppercase font-bold">Active Configuration</div>
                                <div className="text-white font-mono">{currentSettings.model}</div>
                            </div>
                            <Button variant="ghost" size="sm" className="h-6 text-xs text-white/50 hover:text-white" onClick={() => {
                                loadSettings();
                                setSettingsOpen(true);
                            }}>
                                <Edit className="h-3 w-3 mr-1" /> Change
                            </Button>
                        </div>

                        {/* Quick Settings Dialog (Nested or Overlay) */}
                        {settingsOpen && (
                            <div className="absolute inset-x-4 top-20 z-50 bg-[#2b2b40] p-4 rounded-xl border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
                                <h4 className="text-white font-bold mb-4 flex items-center justify-between">
                                    Cấu Hình Nhanh
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setSettingsOpen(false)}><X className="h-4 w-4" /></Button>
                                </h4>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-white/70">API Key (Gemini)</Label>
                                        <Input
                                            value={currentSettings.apiKey}
                                            onChange={(e) => setCurrentSettings({ ...currentSettings, apiKey: e.target.value })}
                                            type="password"
                                            className="bg-[#1a0b2e] border-white/10 text-white"
                                            placeholder="AIza..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-white/70">AI Model</Label>
                                        <select
                                            value={currentSettings.model}
                                            onChange={(e) => setCurrentSettings({ ...currentSettings, model: e.target.value })}
                                            className="w-full h-10 px-3 rounded-md bg-[#1a0b2e] border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            {!AI_MODELS.some(m => m.value === currentSettings.model) && (
                                                <option value={currentSettings.model}>{currentSettings.model} (Custom)</option>
                                            )}
                                            {AI_MODELS.map(m => (
                                                <option key={m.value} value={m.value}>{m.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <Button className="w-full bg-primary hover:bg-primary/90" onClick={saveSettings}>Lưu Cấu Hình</Button>
                                </div>
                            </div>
                        )}


                        {/* Custom Prompt */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-white/70">Prompt Tùy Chỉnh</Label>
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs bg-white/5 border-white/10 hover:bg-white/10 text-white/70 hover:text-white w-[200px] justify-between"
                                            onClick={() => {
                                                const menu = document.getElementById('prompt-menu');
                                                if (menu) menu.classList.toggle('hidden');
                                            }}
                                        >
                                            <span>Chọn mẫu prompt...</span>
                                            <ChevronDown className="h-3 w-3 ml-2" />
                                        </Button>

                                        {/* Custom Dropdown Menu */}
                                        <div
                                            id="prompt-menu"
                                            className="hidden absolute top-full left-0 mt-1 w-[280px] bg-[#2b2b40] border border-white/10 rounded-lg shadow-2xl z-[200] max-h-[300px] overflow-y-auto"
                                        >
                                            {savedPrompts && savedPrompts.length > 0 ? (
                                                <div className="p-1">
                                                    {savedPrompts.map(p => (
                                                        <div
                                                            key={p.id}
                                                            className="group flex items-center justify-between px-3 py-2 rounded hover:bg-white/10 transition-colors"
                                                        >
                                                            <button
                                                                className="flex-1 text-left text-sm text-white/90 hover:text-white truncate"
                                                                onClick={() => {
                                                                    setTranslateConfig({ ...translateConfig, customPrompt: p.content });
                                                                    toast.success("Đã load: " + p.title);
                                                                    document.getElementById('prompt-menu')?.classList.add('hidden');
                                                                }}
                                                            >
                                                                {p.title}
                                                            </button>
                                                            <button
                                                                className="opacity-0 group-hover:opacity-100 ml-2 p-1 hover:bg-red-500/20 rounded transition-all"
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    if (confirm(`Xóa prompt "${p.title}"?`)) {
                                                                        await db.prompts.delete(p.id!);
                                                                        toast.success("Đã xóa!");
                                                                    }
                                                                }}
                                                                title="Xóa prompt này"
                                                            >
                                                                <X className="h-3 w-3 text-red-400" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-4 text-center text-xs text-white/30">
                                                    Chưa có mẫu nào
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-white/50 hover:text-white"
                                        title="Lưu prompt này làm mẫu"
                                        onClick={async () => {
                                            if (!translateConfig.customPrompt.trim()) {
                                                toast.error("Nội dung prompt đang trống!");
                                                return;
                                            }
                                            const name = prompt("Đặt tên cho Prompt này:", "Prompt " + new Date().toLocaleTimeString());
                                            if (name) {
                                                try {
                                                    await db.prompts.add({
                                                        title: name,
                                                        content: translateConfig.customPrompt,
                                                        createdAt: new Date()
                                                    });
                                                    toast.success("Đã lưu prompt mới!");
                                                } catch (e: any) {
                                                    console.error("Save Prompt Error:", e);
                                                    if (e.name === 'NotFoundError' || e.message?.includes("prompts")) {
                                                        toast.error("Lỗi Database! Hãy F5 (Refresh) lại ứng dụng để cập nhật.");
                                                    } else {
                                                        toast.error("Lỗi khi lưu: " + e.message);
                                                    }
                                                }
                                            }
                                        }}
                                    >
                                        <Save className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                            <Textarea
                                className="bg-[#2b2b40] border-white/10 text-white min-h-[100px]"
                                placeholder="Gợi ý văn phong, cách xưng hô...(VD: Văn phong cổ trang, nam chính xưng tại hạ...)"
                                value={translateConfig.customPrompt}
                                onChange={(e) => {
                                    setTranslateConfig({ ...translateConfig, customPrompt: e.target.value });
                                    // Debounce save last used
                                    const val = e.target.value;
                                    clearTimeout((window as any)._savePromptTimeout);
                                    (window as any)._savePromptTimeout = setTimeout(() => {
                                        db.settings.put({ key: "lastCustomPrompt", value: val });
                                    }, 1000);
                                }}
                            />
                        </div>

                        {/* Options */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="autoExtract" className="text-white/70">Tự động trích xuất (Sau khi dịch)</Label>
                                <Switch id="autoExtract" checked={translateConfig.autoExtract} onCheckedChange={(c: boolean) => setTranslateConfig({ ...translateConfig, autoExtract: c })} />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setTranslateDialogOpen(false)} className="text-white/50 hover:text-white">Hủy</Button>
                        <Button onClick={handleBatchTranslate} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                            <Sparkles className="mr-2 h-4 w-4" /> Bắt đầu ({selectedChapters.length})
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            {/* ... Existing Progress Overlay (Import) logic ... */}
            {importing && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-xl h-[500px]">
                    <div className="bg-[#2b2b40] p-8 rounded-2xl shadow-2xl border border-white/10 max-w-sm w-full text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="relative h-16 w-16">
                                <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
                                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                                    {progress}%
                                </div>
                            </div>
                        </div>
                        <div>
                            <h4 className="text-white font-bold text-lg">Đang nhập dữ liệu</h4>
                            <p className="text-white/50 text-sm">{importStatus}</p>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-primary h-full transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Header Title & Actions */}
            <ChapterListHeader
                totalChapters={chapters?.length || 0}
                searchTerm={search}
                setSearchTerm={setSearch}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
                selectedChapters={selectedChapters}
                setSelectedChapters={setSelectedChapters}
                onExport={handleExport}
                onImport={handleImportJSON}
                onTranslate={() => setTranslateDialogOpen(true)}
                onInspect={() => toast.info("Tính năng đang phát triển.")}
                importInputRef={importInputRef}
                fileInputRef={fileInputRef}
                onFileUpload={handleFileUpload}
                importing={importing}
                onRangeSelect={() => { }} // Optional
            />

            {/* View Mode Toggle Row */}
            <div className="flex items-center justify-between mb-4 bg-[#1e1e2e]/50 p-2 rounded-lg border border-white/5">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-white/50 px-2">Chế độ xem:</span>
                    <div className="flex items-center gap-1 bg-[#2b2b40] p-1 rounded-lg border border-white/10">
                        <Button
                            size="sm"
                            variant={viewMode === "grid" ? "default" : "ghost"}
                            onClick={() => setViewMode("grid")}
                            className="h-7 px-3"
                        >
                            <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                            Lưới (Grid)
                        </Button>
                        <Button
                            size="sm"
                            variant={viewMode === "table" ? "default" : "ghost"}
                            onClick={() => setViewMode("table")}
                            className="h-7 px-3"
                        >
                            <LayoutList className="h-3.5 w-3.5 mr-1.5" />
                            Bảng (Table)
                        </Button>
                    </div>
                </div>
            </div>

            {/* Chapter List - Conditional View */}
            <div className="bg-[#1e1e2e] rounded-xl border border-white/10 shadow-lg overflow-hidden min-h-[500px]">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-white/40">
                        <FileUp className="h-16 w-16 mb-4 opacity-30" />
                        <p className="text-lg">Không tìm thấy chương nào</p>
                    </div>
                ) : viewMode === "grid" ? (
                    <ChapterCardGrid
                        chapters={currentChapters}
                        selectedChapters={selectedChapters}
                        onToggleSelect={toggleSelect}
                        onRead={(id) => setReadingChapterId(id)}
                        onTranslate={(id) => {
                            setSelectedChapters([id]);
                            setTranslateDialogOpen(true);
                        }}
                        onDelete={deleteChapter}
                    />
                ) : (
                    <ChapterTable
                        chapters={currentChapters}
                        selectedChapters={selectedChapters}
                        onToggleSelect={toggleSelect}
                        onToggleSelectAll={toggleSelectAll}
                        onDelete={deleteChapter}
                        onRead={(id) => setReadingChapterId(id)}
                        workspaceId={workspaceId}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                )}
            </div>

            {/* Reader Modal */}
            {readingChapterId && (
                <ReaderModal
                    chapterId={readingChapterId}
                    onClose={() => setReadingChapterId(null)}
                    onNext={() => {
                        const currentIndex = chapters?.findIndex(ch => ch.id === readingChapterId);
                        if (currentIndex !== undefined && currentIndex < (chapters?.length || 0) - 1) {
                            setReadingChapterId(chapters![currentIndex + 1].id!);
                        }
                    }}
                    onPrev={() => {
                        const currentIndex = chapters?.findIndex(ch => ch.id === readingChapterId);
                        if (currentIndex !== undefined && currentIndex > 0) {
                            setReadingChapterId(chapters![currentIndex - 1].id!);
                        }
                    }}
                    hasNext={(() => {
                        const currentIndex = chapters?.findIndex(ch => ch.id === readingChapterId);
                        return currentIndex !== undefined && currentIndex < (chapters?.length || 0) - 1;
                    })()}
                    hasPrev={(() => {
                        const currentIndex = chapters?.findIndex(ch => ch.id === readingChapterId);
                        return currentIndex !== undefined && currentIndex > 0;
                    })()}
                />
            )}
        </div>
    );
}
