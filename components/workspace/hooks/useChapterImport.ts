import { useState, useRef } from "react";
import { db, Chapter } from "@/lib/db";
import { toast } from "sonner";
import { cleanHtmlContent } from "@/lib/utils/text-sanitizer";

export function useChapterImport(workspaceId: string, currentChaptersCount: number) {
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [importStatus, setImportStatus] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    interface RawChapterData {
        id?: number;
        title?: string;
        content?: string;
        content_original?: string;
        content_translated?: string;
        status?: string;
        order?: number;
        [key: string]: unknown;
    }

    interface JsonImportData {
        chapters?: RawChapterData[];
        [key: string]: unknown;
    }

    const processJsonChapters = async (data: JsonImportData | RawChapterData[]) => {
        let rawChapters: RawChapterData[] = [];

        // Hỗ trợ cả mảng trực tiếp hoặc object có key 'chapters'
        if (Array.isArray(data)) {
            rawChapters = data;
        } else if (data && typeof data === 'object' && Array.isArray(data.chapters)) {
            rawChapters = data.chapters;
        }

        if (rawChapters.length === 0) {
            throw new Error("Không tìm thấy danh sách chương trong file JSON.");
        }

        const chaptersWithWorkspace = rawChapters.map((c: RawChapterData, index: number) => {
            const { id: _id, ...rest } = c;
            // Ưu tiên key 'content' (từ crawler) hoặc 'content_original'
            const rawContent = rest.content || rest.content_original || "";
            const cleanedContent = cleanHtmlContent(rawContent);

            return {
                ...rest,
                workspaceId,
                title: rest.title || `Chương ${currentChaptersCount + index + 1}`,
                content_original: cleanedContent,
                content_translated: rest.content_translated || "",
                status: rest.status || "draft",
                order: (rest.order || currentChaptersCount + index + 1),
                wordCountOriginal: cleanedContent.length,
                wordCountTranslated: (rest.content_translated || "").length
            } as Chapter;
        });

        await db.chapters.bulkAdd(chaptersWithWorkspace);
        return chaptersWithWorkspace.length;
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setImportStatus("Initializing...");
        setProgress(0);

        try {
            if (file.name.endsWith(".epub")) {
                // ... logic epub giữ nguyên ...
                const ePub = (await import("epubjs")).default;
                const book = ePub();
                await book.open(await file.arrayBuffer());
                const spine = await book.loaded.spine;
                const items = (spine as unknown as { items: { href: string }[] }).items;
                const total = items.length;
                const chaptersToAdd = [];
                for (let i = 0; i < total; i++) {
                    const item = items[i];
                    setImportStatus(`Parsing section ${i + 1}/${total}...`);
                    setProgress(Math.round(((i + 1) / total) * 100));
                    const doc = await book.load(item.href);
                    const title = (doc as Document).querySelector("title")?.textContent || `Chapter ${i + 1}`;
                    const content = cleanHtmlContent((doc as Document).body.innerText || "No content extracted.");
                    chaptersToAdd.push({
                        workspaceId, title, content_original: content, content_translated: "",
                        status: "draft" as const, order: currentChaptersCount + i + 1,
                        wordCountOriginal: content.trim().length, wordCountTranslated: 0
                    });
                }
                await db.chapters.bulkAdd(chaptersToAdd);
                toast.success(`Đã nhập ${chaptersToAdd.length} chương từ EPUB!`);
            } else if (file.name.endsWith(".txt")) {
                setImportStatus("Detecting file encoding...");

                // Read first chunk to detect encoding
                const buffer = await file.slice(0, 10000).arrayBuffer();
                const uint8Array = new Uint8Array(buffer);

                // Detect encoding using jschardet
                const jschardet = await import('jschardet');
                const detected = jschardet.detect(Buffer.from(uint8Array));
                const encoding = detected.encoding || 'UTF-8';

                console.log('[TXT Import] Detected encoding:', encoding, 'Confidence:', detected.confidence);
                setImportStatus(`Reading file (${encoding})...`);

                // Read file with detected encoding
                let text: string;
                if (encoding.toUpperCase().includes('GB') || encoding.toUpperCase().includes('GBK')) {
                    // Chinese encoding (GBK/GB2312)
                    const iconv = await import('iconv-lite');
                    const arrayBuffer = await file.arrayBuffer();
                    text = iconv.decode(Buffer.from(arrayBuffer), encoding);
                } else {
                    // UTF-8 or other
                    text = await file.text();
                }

                setImportStatus("Splitting chapters...");
                const lines = text.split("\n");
                const totalLines = lines.length;

                const chaptersToAdd = [];
                const seenTitles = new Set<string>(); // Track seen chapter titles
                let currentTitle = "Phần 1";
                let currentContent: string[] = [];
                let skippedDuplicates = 0;

                // Process in chunks to avoid UI freeze
                const CHUNK_SIZE = 1000; // Process 1000 lines at a time

                for (let chunkStart = 0; chunkStart < totalLines; chunkStart += CHUNK_SIZE) {
                    const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, totalLines);
                    const progress = Math.round((chunkEnd / totalLines) * 100);

                    setImportStatus(`Processing lines ${chunkStart + 1}-${chunkEnd}/${totalLines}...`);
                    setProgress(progress);

                    // Yield to UI thread
                    await new Promise(resolve => setTimeout(resolve, 0));

                    for (let i = chunkStart; i < chunkEnd; i++) {
                        const line = lines[i];
                        if (/^\s*(Chương|Chapter|Tiết|Quyển|Episode|第\s*(\d+|[零一二三四五六七八九十百千]+)\s*章|卷|回)\s*(\d+|[零一二三四五六七八九十百千]+)?/i.test(line)) {
                            const newTitle = line.trim();

                            // Check for duplicate
                            if (seenTitles.has(newTitle)) {
                                console.log(`[TXT Import] Skipping duplicate chapter: ${newTitle}`);
                                skippedDuplicates++;
                                continue; // Skip this duplicate chapter marker
                            }

                            if (currentContent.length > 0) {
                                const contentStr = currentContent.join("\n").trim();
                                chaptersToAdd.push({
                                    workspaceId, title: currentTitle, content_original: contentStr,
                                    content_translated: "", status: "draft" as const,
                                    order: currentChaptersCount + chaptersToAdd.length + 1,
                                    wordCountOriginal: contentStr.length, wordCountTranslated: 0
                                });
                            }

                            currentTitle = newTitle;
                            seenTitles.add(newTitle);
                            currentContent = [];
                        } else {
                            currentContent.push(line);
                        }
                    }
                }

                // Add last chapter
                if (currentContent.length > 0) {
                    const contentStr = currentContent.join("\n").trim();
                    chaptersToAdd.push({
                        workspaceId, title: currentTitle, content_original: contentStr,
                        content_translated: "", status: "draft" as const,
                        order: currentChaptersCount + chaptersToAdd.length + 1,
                        wordCountOriginal: contentStr.length, wordCountTranslated: 0
                    });
                }

                setImportStatus(`Saving ${chaptersToAdd.length} chapters to database...`);
                setProgress(100);

                await db.chapters.bulkAdd(chaptersToAdd);

                const message = skippedDuplicates > 0
                    ? `Đã nhập ${chaptersToAdd.length} chương (bỏ qua ${skippedDuplicates} chương trùng lặp)`
                    : `Đã nhập ${chaptersToAdd.length} chương từ file TXT!`;
                toast.success(message);
            } else if (file.name.endsWith(".json")) {
                const text = await file.text();
                const count = await processJsonChapters(JSON.parse(text));
                toast.success(`Đã nạp thêm ${count} chương từ file JSON!`);
            }
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : "Lỗi khi nhập file.";
            toast.error(errorMessage);
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleImportJSON = async (e?: React.ChangeEvent<HTMLInputElement>) => {
        let text = "";
        if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
            try {
                const { open } = await import("@tauri-apps/plugin-dialog");
                const { readTextFile } = await import("@tauri-apps/plugin-fs");
                const selected = await open({ filters: [{ name: 'JSON', extensions: ['json'] }], multiple: false });
                if (selected && typeof selected === 'string') text = await readTextFile(selected);
                else if (selected && typeof selected === 'object' && selected !== null && 'path' in selected && typeof (selected as { path: string }).path === 'string')
                    text = await readTextFile((selected as { path: string }).path);
            } catch (err) { console.error("Tauri Import Error:", err); }
        }

        if (!text && e?.target.files?.[0]) text = await e.target.files[0].text();
        if (!text) return;

        try {
            const count = await processJsonChapters(JSON.parse(text));
            toast.success(`Đã nhập thành công ${count} chương!`);
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : "Lỗi khi nhập file JSON.";
            toast.error(errorMessage);
        }
    };

    return {
        importing,
        progress,
        importStatus,
        fileInputRef,
        handleFileUpload,
        handleImportJSON
    };
}
