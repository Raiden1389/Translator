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
    ChevronLeft, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import ePub from "epubjs";
import Link from "next/link";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { translateChapter } from "@/lib/gemini";

interface ChapterListProps {
    workspaceId: string;
}

export function ChapterList({ workspaceId }: ChapterListProps) {
    const chapters = useLiveQuery(
        () => db.chapters.where("workspaceId").equals(workspaceId).sortBy("order")
        , [workspaceId]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [importStatus, setImportStatus] = useState("");
    const [search, setSearch] = useState("");
    const [selectedChapters, setSelectedChapters] = useState<number[]>([]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    // Filter Logic
    const filtered = React.useMemo(() => {
        if (!chapters) return [];
        return chapters.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));
    }, [chapters, search]);

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
        if (!chapters || chapters.length === 0) return;
        if (selectedChapters.length === chapters.length) {
            setSelectedChapters([]);
        } else {
            setSelectedChapters(chapters.map(c => c.id!));
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
                alert(`Import thành công ${newChapters.length} chương!`);
            } else {
                alert("Không tìm thấy chương nào hợp lệ.");
            }

        } catch (err) {
            console.error(err);
            alert("Lỗi khi import file.");
        } finally {
            setImporting(false);
            setProgress(0);
            setImportStatus("");
            if (fileInputRef.current) fileInputRef.current.value = "";
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
        autoExtract: false // New feature
    });
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
                        async (translatedText) => {
                            // Simple Title Translation (Regex-based)
                            let newTitle = chapter.title;
                            if (newTitle) {
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
            alert(`Dịch hoàn tất ${processed} chương!`);
        } catch (e) {
            console.error(e);
            alert("Lỗi khi dịch hàng loạt: " + e);
        } finally {
            setIsTranslating(false);
            setTranslateDialogOpen(false);
            setBatchProgress({ current: 0, total: 0, currentTitle: "" });
        }
    }


    if (!chapters) return <div className="p-10 text-center text-white/50">Loading chapters...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative pb-10">
            {/* Translation Progress Overlay */}
            {isTranslating && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-xl h-[500px] sticky top-20">
                    <div className="bg-[#2b2b40] p-8 rounded-2xl shadow-2xl border border-white/10 max-w-sm w-full text-center space-y-4">
                        <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
                        <div>
                            <h4 className="text-white font-bold text-lg">Đang dịch {batchProgress.current}/{batchProgress.total}</h4>
                            <p className="text-white/50 text-sm truncate">{batchProgress.currentTitle}</p>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-primary h-full transition-all duration-300 ease-out"
                                style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Translation Config Dialog */}
            <Dialog open={translateDialogOpen} onOpenChange={setTranslateDialogOpen}>
                <DialogContent className="sm:max-w-[500px] bg-[#1a0b2e] border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <div className="p-2 rounded bg-primary/20 text-primary"><RefreshCw className="h-4 w-4" /></div>
                            Cấu Hình Dịch
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
                                            <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash Exp (Newest/Fast)</option>
                                            <option value="gemini-1.5-pro-002">Gemini 1.5 Pro 002 (Best Quality)</option>
                                            <option value="gemini-1.5-flash-002">Gemini 1.5 Flash 002 (Balanced)</option>
                                            <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash 8B (Fastest)</option>
                                            <option value="gemini-exp-1206">Gemini Exp 1206 (Experimental)</option>
                                        </select>
                                    </div>
                                    <Button className="w-full bg-primary hover:bg-primary/90" onClick={saveSettings}>Lưu Cấu Hình</Button>
                                </div>
                            </div>
                        )}


                        {/* Custom Prompt */}
                        <div className="space-y-2">
                            <Label className="text-white/70">Prompt Tùy Chỉnh</Label>
                            <Textarea
                                className="bg-[#2b2b40] border-white/10 text-white min-h-[100px]"
                                placeholder="Gợi ý văn phong, cách xưng hô...(VD: Văn phong cổ trang, nam chính xưng tại hạ...)"
                                value={translateConfig.customPrompt}
                                onChange={(e) => setTranslateConfig({ ...translateConfig, customPrompt: e.target.value })}
                            />
                        </div>

                        {/* Options */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="summary" className="text-white/70">Tạo tóm tắt chương</Label>
                                <Switch id="summary" checked={translateConfig.summary} onCheckedChange={(c: boolean) => setTranslateConfig({ ...translateConfig, summary: c })} />
                            </div>
                            <div className="flex items-center justify-between opacity-50 pointer-events-none">
                                <Label htmlFor="summaryBefore" className="text-white/70">Gửi tóm tắt chương trước (Context)</Label>
                                <Switch id="summaryBefore" checked={translateConfig.summaryBefore} onCheckedChange={(c: boolean) => setTranslateConfig({ ...translateConfig, summaryBefore: c })} />
                            </div>
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

            {/* Header Title */}
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Danh Sách Chương ({filtered.length})</h3>
            </div>

            {/* Bulk Actions Toolbar (Visible when selected > 0) */}
            {selectedChapters.length > 0 ? (
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#6c5ce7]/20 p-4 rounded-xl border border-[#6c5ce7]/50 shadow-lg animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-4 text-sm font-medium text-white">
                        <span className="bg-[#6c5ce7] px-2 py-0.5 rounded text-white text-xs">{selectedChapters.length} đã chọn</span>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                        <Button size="sm" variant="ghost" className="text-white/70 hover:bg-white/10 border border-white/10" onClick={() => setSelectedChapters([])}>
                            <X className="mr-2 h-3 w-3" /> Bỏ chọn
                        </Button>
                        <Button size="sm" variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 h-9" onClick={() => setTranslateDialogOpen(true)}>
                            <Sparkles className="mr-2 h-3 w-3" /> Dịch ({selectedChapters.length} chương)
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-9" onClick={() => {
                            if (confirm(`Xóa ${selectedChapters.length} chương?`)) {
                                db.chapters.bulkDelete(selectedChapters).then(() => setSelectedChapters([]));
                            }
                        }}>
                            <Trash2 className="mr-2 h-3 w-3" /> Xóa
                        </Button>
                    </div>
                </div>
            ) : (
                /* Regular Toolbar */
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#1e1e2e] p-4 rounded-xl border border-white/10 shadow-lg">
                    {/* ... existing toolbar code ... */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Tìm kiếm chương..."
                                className="pl-9 bg-[#2b2b40] border-transparent text-white focus-visible:ring-primary/50 h-9"
                            />
                        </div>
                        <Button variant="outline" size="sm" className="border-white/10 text-white/70 bg-[#2b2b40] hover:bg-white/10 h-9">
                            <Filter className="mr-2 h-3 w-3" /> Tất cả trạng thái
                        </Button>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                        <input
                            type="file"
                            accept=".txt,.text,.html,.epub"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importing}
                            size="sm"
                            className="bg-[#2b2b40] text-white hover:bg-white/10 border border-white/10 h-9"
                        >
                            {importing ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Upload className="mr-2 h-3 w-3" />}
                            Tải File Lên
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-9 shadow-lg shadow-blue-500/20">
                            <Globe className="mr-2 h-3 w-3" /> Nhập Từ Web
                        </Button>
                    </div>
                </div>
            )}

            {/* List */}
            {/* ... rest of the component (Table) ... */}

            {/* List */}
            <div className="bg-[#1e1e2e] rounded-xl border border-white/10 shadow-lg overflow-hidden min-h-[500px]">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-white/40">
                        <FileUp className="h-16 w-16 mb-4 opacity-30" />
                        <p className="text-lg">Không tìm thấy chương nào</p>
                    </div>
                ) : (
                    <>
                        <Table>
                            <TableHeader className="bg-[#252538] sticky top-0 z-10">
                                <TableRow className="border-white/5 hover:bg-transparent">
                                    <TableHead className="w-[40px] pl-4">
                                        <Checkbox
                                            checked={chapters && chapters.length > 0 && selectedChapters.length === chapters.length}
                                            onCheckedChange={toggleSelectAll}
                                            className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        />
                                    </TableHead>
                                    <TableHead className="w-[60px] text-center text-white/60">C.#</TableHead>
                                    <TableHead className="text-white/60">Tiêu đề</TableHead>
                                    <TableHead className="text-white/60">Tiêu đề dịch</TableHead>
                                    <TableHead className="w-[120px] text-center text-white/60">Trạng thái</TableHead>
                                    <TableHead className="w-[100px] text-center text-white/60">Từ gốc</TableHead>
                                    <TableHead className="w-[100px] text-center text-white/60">Từ dịch</TableHead>
                                    <TableHead className="w-[80px] text-right text-white/60">Hành động</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentChapters.map((chapter) => (
                                    <TableRow key={chapter.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                                        <TableCell className="pl-4">
                                            <Checkbox
                                                checked={selectedChapters.includes(chapter.id!)}
                                                onCheckedChange={() => toggleSelect(chapter.id!)}
                                                className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                            />
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-white/50 text-xs">
                                            {chapter.order}
                                        </TableCell>
                                        <TableCell className="font-medium text-white/90">
                                            <Link href={`/workspace/${workspaceId}/chapter/${chapter.id}`} className="hover:text-primary transition-colors block w-full h-full">
                                                <div className="line-clamp-1 text-sm font-bold">{chapter.title}</div>
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-white/70">
                                            <div className="line-clamp-1 text-sm italic">{chapter.title_translated || "—"}</div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={cn(
                                                "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider",
                                                chapter.status === 'translated'
                                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                    : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                            )}>
                                                {chapter.status === 'translated' ? "Đã dịch" : "Chờ dịch"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center text-xs text-white/50 font-mono">
                                            {chapter.wordCountOriginal?.toLocaleString() || 0}
                                        </TableCell>
                                        <TableCell className="text-center text-xs text-white/50 font-mono">
                                            {chapter.wordCountTranslated?.toLocaleString() || 0}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-50 group-hover:opacity-100">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-white/50 hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => deleteChapter(chapter.id!)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-end p-4 gap-2 border-t border-white/5">
                                <span className="text-xs text-white/50 mr-4">
                                    Trang {currentPage} / {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="h-8 w-8 bg-[#2b2b40] border-white/10 hover:bg-white/10 text-white"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="h-8 w-8 bg-[#2b2b40] border-white/10 hover:bg-white/10 text-white"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
