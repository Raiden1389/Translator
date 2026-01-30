"use client";

import React, { useState } from "react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Loader2, X, Download, Plus, Link as LinkIcon, User } from "lucide-react";
import { toast } from "sonner";
import { CrawlerBookInfo } from "@/lib/services/crawler/shubaCrawler";
import { globalCrawler } from "@/lib/services/crawler/controller/crawlController";
import { useRouter } from "next/navigation";
import { ManualModeGuide } from "./ManualModeGuide";
import { parseHTMLManually } from "@/lib/services/crawler/manualParser";
import { ChapterPreviewDialog } from './ChapterPreviewDialog';
import { GoogleGenAI } from "@google/genai";

export function CrawlerDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [bookInfo, setBookInfo] = useState<CrawlerBookInfo | null>(null);
    const [source, setSource] = useState<'shuba' | 'fanqie' | null>(null);
    const [importing, setImporting] = useState(false);
    const [manualMode, setManualMode] = useState(false);
    const [range, setRange] = useState({ from: 1, to: 1 });
    const [showPreview, setShowPreview] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);

    const translateMetadata = async (info: CrawlerBookInfo) => {
        try {
            const keyRecord = await db.settings.get("apiKeyPrimary");
            const apiKey = keyRecord?.value as string | undefined;

            if (!apiKey) return info;

            setIsTranslating(true);
            setStatus("🤖 Đang dịch thông tin truyện...");

            const ai = new GoogleGenAI({ apiKey });
            const modelName = 'gemini-2.5-flash-preview-09-2025';

            const prompt = `Translate the following book metadata from Chinese to Vietnamese. 
            Return ONLY a JSON object with keys: title, author, description, genre.
            Suggest a concise Vietnamese genre (e.g., Tiên Hiệp, Huyền Huyễn, Ngôn Tình, etc.) based on the title and description.
            
            Title: ${info.title}
            Author: ${info.author}
            Description: ${info.description}
            `;

            const result = await ai.models.generateContent({
                model: modelName,
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });

            const text = result.text;
            if (text) {
                // Find JSON in the response
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const translated = JSON.parse(jsonMatch[0]);
                    return {
                        ...info,
                        title: translated.title || info.title,
                        author: translated.author || info.author,
                        description: translated.description || info.description,
                        genre: translated.genre || (info as any).genre
                    };
                }
            }
            return info;
        } catch (err) {
            console.error('[TranslateMetadata] Error:', err);
            return info;
        } finally {
            setIsTranslating(false);
            setStatus("✅ Đã dịch xong!");
        }
    };


    const fetchTOC = async () => {
        if (!url) return;
        setLoading(true);
        setStatus("🔍 Đang nạp danh sách chương...");
        setBookInfo(null);
        setManualMode(false);

        try {
            // Auto-redirect to mobile for 69shuba if not already
            let targetUrl = url;
            if (url.includes('69shuba.com') && !url.includes('m.69shuba.com')) {
                // targetUrl = url.replace('www.69shuba.com', 'm.69shuba.com');
                // Note: Keeping original for now but offering mobile gateway if it fails
            }

            const info = await UniversalEngine.fetchTOC(targetUrl);

            if (!info.chapters || info.chapters.length === 0) {
                setStatus("⚠️ Không tìm thấy chương. Có thể bị Cloudflare chặn.");
                toast.error("Không tìm thấy chương nào. Hãy thử 'Giải vây Cloudflare'.");
                setLoading(false);
                return;
            }

            setStatus("🤖 Đang dịch thông tin truyện...");
            const translatedInfo = await translateMetadata(info);
            setBookInfo(translatedInfo);
            setSource(url.includes('69shuba') ? 'shuba' : 'fanqie');
            setRange({ from: 1, to: translatedInfo.chapters.length });
            setStatus("✅ Đã nạp thành công!");
        } catch (err: any) {
            console.error('[FetchTOC] Error:', err);
            setStatus(`❌ Lỗi: ${err.message || 'Kết nối thất bại'}`);
        } finally {
            setLoading(false);
        }
    };

    const solveCloudflare = async () => {
        try {
            const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
            const label = `solver-${Math.random().toString(36).slice(2, 7)}`;
            new WebviewWindow(label, {
                url: url || 'https://www.69shuba.com',
                title: '⚡ Cloudflare Solver - Hãy giải nếu thấy Captcha',
                width: 1000,
                height: 800,
                alwaysOnTop: true,
            });
            toast.info("Đã mở cửa sổ giải vây. Sau khi giải xong hãy bấm 'Nạp Lại'.");
        } catch (e) {
            window.open(url || 'https://www.69shuba.com', '_blank');
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setUrl("");
        setStatus("");
        setBookInfo(null);
        setSource(null);
        setManualMode(false);
        setRange({ from: 1, to: 1 });
    };

    const handleImport = async () => {
        if (!bookInfo) return;
        setImporting(true);
        try {
            const workspaceId = crypto.randomUUID();

            await db.workspaces.add({
                id: workspaceId,
                title: bookInfo.title,
                author: bookInfo.author,
                cover: bookInfo.cover,
                description: bookInfo.description,
                genre: (bookInfo as any).genre || "Tiên Hiệp",
                sourceLang: "Chinese (中文)",
                targetLang: "Vietnamese (Tiếng Việt)",
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const selectedChapters = bookInfo.chapters.slice(range.from - 1, range.to);
            const chapters = selectedChapters.map((ch, index) => ({
                workspaceId,
                title: ch.title,
                content_original: "",
                sourceUrl: ch.url,
                order: range.from + index,
                status: 'draft' as const,
                createdAt: new Date(),
            }));

            await db.chapters.bulkAdd(chapters as any[]);

            const newChapters = await db.chapters.where('workspaceId').equals(workspaceId).toArray();
            const tasks = newChapters.map(c => ({
                chapterId: c.id!,
                url: c.sourceUrl || ""
            })).filter(t => t.url);

            if (tasks.length > 0) {
                globalCrawler.addTasks(tasks);
                toast.info(`Bắt đầu tải ${tasks.length} chương trong nền...`);
            }

            toast.success(`Đã tạo Workspace "${bookInfo.title}" với ${chapters.length} chương!`);
            setIsOpen(false);
            router.push(`/workspace?id=${workspaceId}`);
        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi tạo Workspace.");
        } finally {
            setImporting(false);
        }
    };

    if (!isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                variant="outline"
                className="rounded-full px-6 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 transition-all text-xs h-9"
            >
                <Search className="mr-2 h-3.5 w-3.5 text-primary" /> Crawler Novel (Beta)
            </Button>
        );
    }

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-lg animate-in fade-in duration-300 p-4">
                <div className="w-full max-w-2xl bg-background border border-border/50 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[92vh]">

                    {/* Header */}
                    <div className="p-8 pb-4 flex items-center justify-between shrink-0">
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
                                <Download className="h-8 w-8 text-primary" />
                                Novel Crawler
                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold ml-2">BETA</span>
                            </h2>
                            <p className="text-sm text-muted-foreground/60">Tự động hốt truyện từ 69shuba & Fanqie vào thư viện.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={solveCloudflare}
                                className="h-9 rounded-xl border-dashed border-primary/40 text-primary hover:bg-primary/5 font-bold text-xs"
                            >
                                ⚡ Giải vây Cloudflare
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-full">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    <div className="px-8 py-4 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                        {/* URL Input */}
                        <div className="space-y-3">
                            <Label htmlFor="url" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Link Mục Lục (69shuba / Fanqie)</Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1 group">
                                    <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="url"
                                        placeholder="Dán link truyện vào đây..."
                                        className="bg-muted/30 border-border/40 pl-11 h-12 rounded-xl focus-visible:ring-primary/20 transition-all"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && fetchTOC()}
                                    />
                                </div>
                                <Button
                                    disabled={loading || !url}
                                    onClick={fetchTOC}
                                    className="h-12 px-6 rounded-xl font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                                >
                                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                                    <span className="ml-2">Nạp Lại</span>
                                </Button>
                                {!manualMode && !bookInfo && (
                                    <Button
                                        onClick={() => {
                                            setManualMode(true);
                                            setStatus("📖 Chế độ thủ công - Làm theo hướng dẫn bên dưới");
                                        }}
                                        variant="outline"
                                        className="h-12 px-6 rounded-xl font-bold border-blue-200 text-blue-600 hover:bg-blue-50"
                                    >
                                        📖 Thủ Công
                                    </Button>
                                )}
                            </div>
                            {status && (
                                <div className="flex flex-col gap-2 px-1">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-1.5 w-1.5 rounded-full ${loading || isTranslating ? 'bg-primary animate-pulse' : status.startsWith('❌') ? 'bg-destructive' : 'bg-green-500'}`} />
                                        <span className={`text-[11px] font-medium ${status.startsWith('❌') ? 'text-destructive' : 'text-muted-foreground'}`}>{status}</span>
                                    </div>

                                    {manualMode && !bookInfo && (
                                        <ManualModeGuide
                                            url={url}
                                            onParse={async (html, forceAI = false) => {
                                                try {
                                                    setLoading(true);
                                                    setStatus(forceAI ? "🤖 Đang phân tích bằng AI..." : "📊 Đang phân tích HTML...");

                                                    const keyRecord = await db.settings.get("apiKeyPrimary");
                                                    const apiKey = keyRecord?.value as string | undefined;

                                                    const info = await parseHTMLManually(html, url, apiKey, forceAI);

                                                    // Translate
                                                    const translatedInfo = await translateMetadata(info);
                                                    setBookInfo(translatedInfo);

                                                    setSource(url.includes('69shuba') ? 'shuba' : 'fanqie');
                                                    setStatus("✅ Phân tích thành công!");
                                                    setRange({ from: 1, to: translatedInfo.chapters.length });
                                                    toast.success(`Tìm thấy ${translatedInfo.chapters.length} chương!`);
                                                } catch (err) {
                                                    const error = err as Error;
                                                    setStatus(`❌ Lỗi: ${error.message}`);
                                                    toast.error(error.message);
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                        />
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Book Preview */}
                        {bookInfo && (
                            <div className="p-6 border border-border/50 rounded-2xl bg-muted/20 animate-in slide-in-from-bottom-4 duration-500">
                                <div className="flex gap-6">
                                    {bookInfo.cover && (
                                        <img
                                            src={bookInfo.cover}
                                            alt="cover"
                                            loading="lazy"
                                            className="w-24 h-32 object-cover rounded-lg shadow-lg border border-border/20"
                                        />
                                    )}
                                    <div className="space-y-2 flex-1">
                                        <h3 className="text-xl font-bold text-foreground leading-tight">{bookInfo.title}</h3>
                                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                                            <User className="h-3.5 w-3.5" /> {bookInfo.author}
                                        </p>
                                        <div className="flex items-center gap-4 mt-4">
                                            <div className="bg-secondary px-3 py-1 rounded-full text-xs font-semibold text-muted-foreground">
                                                {bookInfo.chapters.length} Chương
                                            </div>
                                            <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold border border-primary/20">
                                                {source === 'shuba' ? '69shuba.com' : 'fanqienovel.com'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {bookInfo.description && (
                                    <div className="mt-4 pt-4 border-t border-border/10">
                                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed italic">
                                            {bookInfo.description}
                                        </p>
                                    </div>
                                )}

                                {/* Range Selection */}
                                <div className="mt-6 pt-6 border-t border-border/10">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-3 block">Phạm vi tải chương</Label>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 space-y-1.5">
                                            <span className="text-[10px] text-muted-foreground/60 font-bold uppercase">Từ chương</span>
                                            <Input
                                                type="number"
                                                min={1}
                                                max={bookInfo.chapters.length}
                                                value={range.from}
                                                onChange={(e) => setRange(r => ({ ...r, from: Math.max(1, parseInt(e.target.value) || 1) }))}
                                                className="h-10 bg-muted/40 border-border/20 rounded-lg text-sm"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-1.5">
                                            <span className="text-[10px] text-muted-foreground/60 font-bold uppercase">Đến chương</span>
                                            <Input
                                                type="number"
                                                min={range.from}
                                                max={bookInfo.chapters.length}
                                                value={range.to}
                                                onChange={(e) => setRange(r => ({ ...r, to: Math.min(bookInfo.chapters.length, parseInt(e.target.value) || bookInfo.chapters.length) }))}
                                                className="h-10 bg-muted/40 border-border/20 rounded-lg text-sm"
                                            />
                                        </div>
                                    </div>
                                    <p className="mt-3 text-[10px] text-muted-foreground italic font-medium">
                                        💡 Bạn đang chọn tải {range.to - range.from + 1} chương.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-8 pt-6 border-t border-border bg-muted/20 flex gap-4 shrink-0">
                        <Button
                            variant="ghost"
                            onClick={() => setIsOpen(false)}
                            className="flex-1 h-12 rounded-xl font-bold"
                        >
                            Hủy
                        </Button>
                        {bookInfo && (
                            <Button
                                variant="outline"
                                onClick={() => setShowPreview(true)}
                                className="h-12 px-6 rounded-xl font-bold"
                            >
                                👁️ Xem Danh Sách
                            </Button>
                        )}
                        <Button
                            disabled={!bookInfo || importing || isTranslating}
                            onClick={handleImport}
                            className="flex-2 h-12 rounded-xl font-extrabold text-base bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {importing ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Đang tạo Workspace...
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-2 h-5 w-5" />
                                    {bookInfo ? `Tạo Workspace (${bookInfo.chapters.length} chương)` : "Tạo Workspace & Nạp TOC"}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {bookInfo && (
                <ChapterPreviewDialog
                    isOpen={showPreview}
                    onClose={() => setShowPreview(false)}
                    chapters={bookInfo.chapters}
                />
            )}
        </>
    );
}
